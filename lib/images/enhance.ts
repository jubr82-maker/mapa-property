// Amelioration automatique douce d'une photo (nov. 2026), avec sharp
// uniquement (deja dans le projet), aucun service exterieur. Serveur seulement.
//
// Reglages volontairement moderes et mesures sur la photo elle-meme :
//   1. orientation corrigee (tag EXIF) ;
//   2. balance des blancs neutre : moyennes des trois couches rapprochees
//      (principe du "monde gris"), a moitie seulement et dans +/- 8 % ;
//   3. niveaux et contraste : noirs et blancs (0,5 % et 99,5 % des pixels)
//      rapproches des extremes, a 70 % seulement, gain plafonne a 1,35 ;
//   4. luminosite relevee seulement si la photo est sombre (+25 % au plus) ;
//   5. couleurs legerement ravivees (saturation x 1,08) ;
//   6. nettete legere.
// Les pixels sont transformes un par un (courbes globales) : rien n'est
// ajoute ni retire de la photo. Dimensions identiques a l'entree.
import sharp from "sharp";

const WEBP_QUALITY = 85;

export type EnhanceSettings = {
  gains: [number, number, number];
  offset: number;
  brightness: number;
  saturation: number;
};

export type EnhancedImage = { buffer: Buffer; width: number; height: number; settings: EnhanceSettings };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Reglages calcules sur une reduction de la photo (256 px). */
export async function measureEnhancement(input: Buffer): Promise<EnhanceSettings> {
  const { data, info } = await sharp(input, { failOn: "none" })
    .rotate()
    .resize(256, 256, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const n = Math.floor(data.length / ch);
  const sums = [0, 0, 0];
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < n; i++) {
    const r = data[i * ch];
    const g = data[i * ch + (ch > 1 ? 1 : 0)];
    const b = data[i * ch + (ch > 2 ? 2 : 0)];
    sums[0] += r;
    sums[1] += g;
    sums[2] += b;
    hist[Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)]++;
  }
  const means = sums.map((s) => s / Math.max(1, n));
  const gray = (means[0] + means[1] + means[2]) / 3;
  // Balance des blancs : la moitie de la correction, +/- 8 % au plus.
  const wb = means.map((m) => (m > 1 ? clamp(1 + (gray / m - 1) * 0.5, 0.92, 1.08) : 1)) as [number, number, number];

  const pct = (p: number) => {
    const target = n * p;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= target) return v;
    }
    return 255;
  };
  const lo = pct(0.005);
  const hi = pct(0.995);
  let gain = 1;
  let offset = 0;
  if (hi - lo > 20) {
    const loT = lo * 0.3;
    const hiT = hi + (255 - hi) * 0.7;
    gain = clamp((hiT - loT) / (hi - lo), 1, 1.35);
    offset = loT - gain * lo;
  }
  // Luminosite moyenne apres niveaux : relevee seulement si la photo est sombre.
  let mean = 0;
  for (let v = 0; v < 256; v++) mean += hist[v] * clamp(v * gain + offset, 0, 255);
  mean /= Math.max(1, n);
  const brightness = mean < 110 ? clamp(118 / Math.max(mean, 1), 1, 1.25) : 1;
  return {
    gains: [wb[0] * gain, wb[1] * gain, wb[2] * gain],
    offset,
    brightness,
    saturation: 1.08,
  };
}

/** Photo amelioree (WebP), memes dimensions que l'entree orientee. */
export async function enhanceImage(input: Buffer, opts: { maxWidth?: number } = {}): Promise<EnhancedImage> {
  const settings = await measureEnhancement(input);
  let pipeline = sharp(input, { failOn: "none" })
    .rotate()
    .removeAlpha()
    .linear(settings.gains, [settings.offset, settings.offset, settings.offset])
    .modulate({ brightness: settings.brightness, saturation: settings.saturation })
    .sharpen({ sigma: 0.6, m1: 0.5, m2: 1.2 });
  if (opts.maxWidth) pipeline = pipeline.resize({ width: opts.maxWidth, withoutEnlargement: true });
  const { data, info } = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height, settings };
}
