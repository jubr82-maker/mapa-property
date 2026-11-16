// Import d'une annonce collee et amelioration des photos (nov. 2026), sans
// reseau ni base. Lancement : node --import tsx scripts/admin/test-import-annonce.mts
//   1. extraction : texte, images dans l'ordre, logos, icones, vignettes,
//      doublons et adresses non https ecartes ;
//   2. controle des champs : chiffres repris exactement, commune du
//      referentiel, rien d'invente (valeurs absentes du texte refusees) ;
//   3. corrections mecaniques, formules interdites signalees sans etre remplacees ;
//   4. dossier et zip : images seulement, ordre alphabetique des noms ;
//   5. brouillon jamais publie, aucune requete vers une page web ;
//   6. amelioration : original intact, dimensions inchangees, retour a l'original ;
//   7. traductions fr, en, de des textes de l'ecran.
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import sharp from "sharp";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");

const { extractPasted, lightenHtml, MAX_IMPORT_PHOTOS } = await import("../../lib/import-listing/extract");
const { validateExtraction, numbersInText, sliceDescription, IMPORT_TYPES } = await import("../../lib/import-listing/fields");
const { mechanicalFixes, remainingIssues, plainToHtml } = await import("../../lib/import-listing/writing-fix");
const { readZipImages, sortByName, isImageName } = await import("../../lib/import-listing/zip");
const { safeImageUrl, fetchPastedImage } = await import("../../lib/import-listing/fetch-image");
const { draftTodo } = await import("../../lib/import-listing/todo");
const { enhanceImage } = await import("../../lib/images/enhance");
const { enhancedPathOf, originalPathOf, isEnhancedPath, isPropertyPhotoPath, swapPathInUrl } = await import("../../lib/images/enhance-paths");
const { LU_PLACES } = await import("../../lib/geo/lu-localities");

let pass = 0;
let fail = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass++;
    console.log(`PASS ${name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL ${name}\n     ${e instanceof Error ? e.message : String(e)}`);
  }
}

// --- Exemple fictif de contenu colle (page d'annonce copiee) ----------------
const DESCRIPTION =
  "Bel appartement lumineux de 148,5 m² au deuxième étage d'une résidence récente avec ascenseur.\n\nIl se compose d'un séjour ouvert sur une terrasse de 22 m², d'une cuisine équipée et de trois chambres. Un véritable havre de paix proche des écoles.\n• Cave privative\n• Deux emplacements intérieurs";
const PASTED_TEXT = `Accueil Acheter Louer Contact
Appartement à vendre à Hesperange
Prix: 1250000€
Surface habitable : 148,5 m2
Chambres : 3
Salles de bain : 2
Étage : 2
Année de construction : 2019
Classe énergétique : B
Classe d'isolation : C
Charges : 250 € par mois
Disponible immédiatement
${DESCRIPTION}
Agence partenaire, mentions légales`;

const PASTED_HTML = `<html><head><style>.x{}</style><script>var a=1</script></head><body>
<header><img src="https://cdn.example.com/assets/logo.svg" alt="Logo"><img src="https://cdn.example.com/icons/heart.png" width="24" height="24"></header>
<h1>Appartement à vendre à Hesperange</h1>
<div class="gallery">
  <img src="https://img.example.com/listing/123/photo-a.jpg?w=400" srcset="https://img.example.com/listing/123/photo-a.jpg?w=400 400w, https://img.example.com/listing/123/photo-a-large.jpg 1600w" alt="">
  <img data-src="https://img.example.com/listing/123/photo-b.jpg" src="data:image/gif;base64,R0lGOD">
  <img src="https://img.example.com/listing/123/photo-c.jpg">
  <img src="https://img.example.com/listing/123/photo-c.jpg?v=2">
  <img src="https://img.example.com/listing/123/thumbs/photo-d.jpg">
  <img src="https://img.example.com/listing/123/photo-e.jpg" width="120" height="90">
  <img src="http://img.example.com/listing/123/photo-f.jpg">
  <img src="https://img.example.com/listing/123/photo-g_150x150.jpg">
  <img src="//img.example.com/listing/123/photo-h.webp">
</div>
<p>Prix: 1250000€</p><p>${DESCRIPTION.replace(/\n/g, "<br>")}</p>
<footer><img src="https://cdn.example.com/social/facebook.png"></footer>
</body></html>`;

await check("1a. images de l'annonce : ordre conserve, plus grande taille du srcset, image paresseuse", () => {
  const r = extractPasted({ html: PASTED_HTML, text: PASTED_TEXT });
  assert.deepEqual(r.images, [
    "https://img.example.com/listing/123/photo-a-large.jpg",
    "https://img.example.com/listing/123/photo-b.jpg",
    "https://img.example.com/listing/123/photo-c.jpg",
    "https://img.example.com/listing/123/photo-h.webp",
  ]);
});

await check("1b. logos, icones, vignettes, doublons et http ecartes, avec leur motif", () => {
  const r = extractPasted({ html: PASTED_HTML });
  const why = Object.fromEntries(r.skipped.map((s) => [s.url, s.reason]));
  assert.equal(why["https://cdn.example.com/assets/logo.svg"], "logo");
  assert.equal(why["https://cdn.example.com/icons/heart.png"], "logo");
  assert.equal(why["https://img.example.com/listing/123/photo-c.jpg?v=2"], "duplicate");
  assert.equal(why["https://img.example.com/listing/123/thumbs/photo-d.jpg"], "logo");
  assert.equal(why["https://img.example.com/listing/123/photo-e.jpg"], "small");
  assert.equal(why["http://img.example.com/listing/123/photo-f.jpg"], "insecure");
  assert.equal(why["https://img.example.com/listing/123/photo-g_150x150.jpg"], "small");
  assert.equal(why["https://cdn.example.com/social/facebook.png"], "logo");
  assert.ok(!r.text.includes("var a=1") && !r.text.includes(".x{}"), "scripts et styles hors du texte");
  assert.ok(r.text.includes("Appartement à vendre à Hesperange"));
});

await check("1c. texte seul : adresses d'images du texte, 60 photos au plus", () => {
  const many = Array.from({ length: 70 }, (_, i) => `https://img.example.com/p/${String(i).padStart(2, "0")}.jpg`).join("\n");
  const r = extractPasted({ text: `Annonce\n${many}\nhttps://img.example.com/logo.png` });
  assert.equal(r.images.length, MAX_IMPORT_PHOTOS);
  assert.equal(r.images[0], "https://img.example.com/p/00.jpg");
  assert.equal(r.skipped.filter((s) => s.reason === "limit").length, 10);
  assert.ok(r.skipped.some((s) => s.reason === "logo"));
});

await check("1d. HTML allege avant envoi : memes images et meme texte", () => {
  const light = lightenHtml(PASTED_HTML);
  assert.ok(light.length < PASTED_HTML.length);
  assert.ok(!/<script|<style|alt=/.test(light));
  assert.deepEqual(extractPasted({ html: light }).images, extractPasted({ html: PASTED_HTML }).images);
});

// --- Controle des champs -----------------------------------------------------
const SOURCE = extractPasted({ html: PASTED_HTML, text: PASTED_TEXT }).text + "\n" + PASTED_TEXT;
const MISTRAL_OK = {
  title: "Appartement à vendre à Hesperange",
  transaction: "vente",
  property_type: "appartement",
  country: "LU",
  locality: "Hesperange",
  price: 1250000,
  monthly_charges: 250,
  living_surface: 148.5,
  bedrooms: 3,
  bathrooms: 2,
  floor: "2",
  year_built: 2019,
  energy: "B",
  thermal: "C",
  available_now: true,
  cellar: true,
  elevator: true,
  has_pool: false,
  description_start: "Bel appartement lumineux de 148,5 m² au",
  description_end: "Deux emplacements intérieurs",
};

await check("2a. chiffres repris exactement du texte colle (1 250 000, 148,5)", () => {
  const nums = numbersInText("Prix : 1 250 000 € ou 1.250.000 €, surface 148,5 m², charges 250");
  for (const n of [1250000, 148.5, 250]) assert.ok(nums.includes(n), String(n));
  const r = validateExtraction(MISTRAL_OK, SOURCE, { luPlaces: LU_PLACES });
  assert.equal(r.values.price, 1250000);
  assert.equal(r.values.living_surface, 148.5);
  assert.equal(r.values.surface, 148.5);
  assert.equal(r.values.bedrooms, 3);
  assert.equal(r.values.monthly_charges, 250);
  assert.equal(r.values.year, 2019);
  assert.equal(r.values.energy, "B");
  assert.equal(r.values.thermal, "C");
  assert.equal(r.values.available_now, true);
  assert.equal(r.values.amenities.cellar, true);
  assert.equal(r.values.amenities.elevator, true);
  assert.deepEqual(r.rejected, []);
});

await check("2b. commune et localite du referentiel officiel, jamais un texte libre au Luxembourg", () => {
  const r = validateExtraction(MISTRAL_OK, SOURCE, { luPlaces: LU_PLACES });
  assert.equal(r.values.country, "LU");
  assert.ok(LU_PLACES.some((p) => p.name === r.values.city && p.commune === r.values.city_commune), `${r.values.city} / ${r.values.city_commune}`);
  const atlantis = validateExtraction({ ...MISTRAL_OK, locality: "Atlantis-sur-Mer" }, SOURCE + " Atlantis-sur-Mer", { luPlaces: LU_PLACES });
  assert.equal(atlantis.values.city, null);
  assert.ok(atlantis.todo.includes("city"));
});

await check("2c. rien d'invente : chiffre, type, classe ou lieu absents du texte refuses et a completer", () => {
  const r = validateExtraction(
    { ...MISTRAL_OK, land_surface: 600, price: 1300000, property_type: "villa", energy: "A", locality: "Strassen", has_pool: true, title: "Superbe villa avec piscine" },
    SOURCE,
    { luPlaces: LU_PLACES },
  );
  assert.equal(r.values.land_surface, null);
  assert.equal(r.values.price, null);
  assert.equal(r.values.property_type, null);
  assert.equal(r.values.energy, null);
  assert.equal(r.values.city, null);
  assert.equal(r.values.amenities.has_pool, false);
  assert.equal(r.values.title_fr, null);
  for (const f of ["land_surface", "price", "property_type", "energy", "city", "title_fr"]) assert.ok(r.rejected.some((x) => x.field === f), f);
  for (const f of ["price", "property_type", "energy", "city", "title_fr"]) assert.ok(r.todo.includes(f as never), f);
});

await check("2d. sans reponse de Mistral : tout est vide et a completer", () => {
  const r = validateExtraction(null, SOURCE, { luPlaces: LU_PLACES });
  assert.equal(r.filled.length, 0);
  assert.ok(r.todo.includes("price") && r.todo.includes("description_fr") && r.todo.includes("city"));
});

await check("2f. pays non reconnu : vide, jamais Luxembourg par defaut ; texte retouche lu en priorite", () => {
  const r = validateExtraction({ ...MISTRAL_OK, country: null, locality: "Metz" }, "Appartement a vendre a Metz. Prix 300000", { luPlaces: LU_PLACES });
  assert.equal(r.values.country, null);
  assert.ok(!/country: v\.country \?\? "LU"/.test(read("app/admin/properties/import-actions.ts")));
  const edited = extractPasted({ html: PASTED_HTML, text: "Texte corrige par Julien", preferText: true });
  assert.equal(edited.text, "Texte corrige par Julien");
  assert.equal(edited.images.length, 4);
});

await check("2e. description recopiee du texte colle (jamais du texte de Mistral)", () => {
  const d = sliceDescription(SOURCE, MISTRAL_OK.description_start, MISTRAL_OK.description_end);
  assert.ok(d && d.startsWith("Bel appartement lumineux") && d.endsWith("Deux emplacements intérieurs"), String(d));
  assert.ok(SOURCE.includes(d as string));
  assert.equal(sliceDescription(SOURCE, "Une phrase qui n'existe pas dans l'annonce", "fin"), null);
  assert.ok(IMPORT_TYPES.includes("appartement") && !IMPORT_TYPES.includes("loft"));
});

// --- Corrections mecaniques ---------------------------------------------------
await check("3a. espace avant : ; ?, 348 m², montants, apostrophes, listes en « - »", () => {
  const out = mechanicalFixes("Prix: 1250000€\nSurface 348m2; libre?\n• Cave\n– Garage\n*Jardin\nC’est l’idéal\nVoir https://www.example.com/a:b à 10:30");
  assert.ok(out.includes("Prix : 1 250 000 €"), out);
  assert.ok(out.includes("348 m² ; libre ?"), out);
  assert.ok(out.includes("\n- Cave\n- Garage\n- Jardin\n"), out);
  assert.ok(out.includes("C'est l'idéal"), out);
  assert.ok(out.includes("https://www.example.com/a:b") && out.includes("10:30"), out);
  // (le controle existant signale aussi "a:b" dans une adresse web : ligne exclue ici)
  const left = remainingIssues(out.replace(/Voir https[^\n]*/, ""), "fr").map((i) => i.code);
  for (const code of ["space_before", "amount", "area", "bullet", "apostrophes", "dash"]) assert.ok(!left.includes(code as never), `${code} : ${left}`);
});

await check("3c. contenu jamais change : numero de telephone en debut de ligne, nombres", () => {
  const out = mechanicalFixes("Contact\n+352 621 123 456\n-5 % de remise\n+ Terrasse");
  assert.ok(out.includes("\n+352 621 123 456\n-5 % de remise\n- Terrasse"), out);
});

await check("3b. formules interdites signalees, jamais remplacees", () => {
  const out = mechanicalFixes(DESCRIPTION);
  assert.ok(out.includes("havre de paix"));
  assert.ok(remainingIssues(out, "fr").some((i) => i.code === "forbidden" && /havre de paix/i.test(i.excerpt)));
  assert.ok(plainToHtml(out).startsWith("<p>Bel appartement") && plainToHtml(out).includes("<br>- Cave"));
});

// --- Dossier et zip ---------------------------------------------------------------
function zipOf(files: { name: string; data: Buffer; store?: boolean }[]): ArrayBuffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const comp = f.store ? f.data : deflateRawSync(f.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(f.store ? 0 : 8, 8);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(f.data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(f.store ? 0 : 8, 10);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(f.data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, name, comp);
    centrals.push(ch, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  const all = Buffer.concat([...locals, cd, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length) as ArrayBuffer;
}

await check("4a. zip accepte : images seulement, ordre alphabetique des noms, contenu intact", async () => {
  const jpg = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#808080" } }).jpeg().toBuffer();
  const zip = zipOf([
    { name: "maison/photo-10.jpg", data: jpg },
    { name: "maison/photo-2.jpg", data: jpg, store: true },
    { name: "__MACOSX/maison/._photo-2.jpg", data: Buffer.from("x") },
    { name: "maison/notes.txt", data: Buffer.from("texte") },
    { name: "maison/.DS_Store", data: Buffer.from("x") },
    { name: "maison/Photo-1.JPG", data: jpg },
  ]);
  const imgs = await readZipImages(zip);
  assert.deepEqual(
    imgs.map((i) => i.name),
    ["maison/Photo-1.JPG", "maison/photo-2.jpg", "maison/photo-10.jpg"],
  );
  for (const i of imgs) assert.ok(Buffer.from(i.data).equals(jpg));
  await assert.rejects(readZipImages(new TextEncoder().encode("pas un zip").buffer as ArrayBuffer));
});

await check("4b. dossier ou plusieurs photos : images seulement, ordre alphabetique", () => {
  const names = ["Salon.heic", "cuisine.jpg", "01-facade.jpg", "10-jardin.png", "2-entree.webp", "liste.pdf", ".cache/x.jpg"];
  const kept = sortByName(names.filter(isImageName), (n) => n);
  assert.deepEqual(kept, ["01-facade.jpg", "2-entree.webp", "10-jardin.png", "cuisine.jpg", "Salon.heic"]);
});

await check("4c. ecran : depot de dossier, plusieurs photos ou .zip, case cochee par defaut, texte du collage", () => {
  const src = read("components/admin/ListingImporter.tsx");
  assert.ok(src.includes("webkitdirectory") && src.includes("webkitGetAsEntry") && src.includes("readZipImages"));
  assert.ok(/useState\(true\)/.test(src.match(/\[enhance, setEnhance\][^\n]*/)?.[0] ?? ""), "amelioration cochee par defaut");
  assert.ok(src.includes('accept="image/*,.heic,.heif,.zip,application/zip"') && src.includes("multiple"));
  const fr = JSON.parse(read("messages/fr.json")).admin_properties;
  assert.equal(fr.import_paste_placeholder, "Ouvrez votre annonce Apimo ou immotop, faites Cmd+A puis Cmd+C, puis collez ici (Cmd+V)");
  assert.equal(fr.import_submit, "Remplir l'annonce");
  assert.equal(fr.import_pick_folder, "Choisir un dossier");
  assert.equal(fr.import_enhance, "Améliorer automatiquement les photos");
  assert.ok(read("app/admin/properties/new/page.tsx").includes("<ListingImporter />"));
});

// --- Brouillon et reseau ---------------------------------------------------------
await check("5a. brouillon jamais publie", () => {
  const src = read("app/admin/properties/import-actions.ts");
  assert.ok(src.includes('status: "draft"') && src.includes("is_published: false"));
  assert.ok(!/is_published:\s*true|status:\s*"published"|setPropertyPublished/.test(src));
  assert.ok(!/setPropertyPublished|is_published/.test(read("components/admin/ListingImporter.tsx")));
});

await check("5b. aucune requete vers une page web : seules des adresses d'images https publiques", async () => {
  for (const bad of ["http://img.example.com/a.jpg", "https://localhost/a.jpg", "https://10.0.0.2/a.jpg", "https://192.168.1.4/a.jpg", "https://user:pw@img.example.com/a.jpg", "https://img.example.com:8443/a.jpg", "https://[::1]/a.jpg", "https://intranet/a.jpg", "file:///etc/passwd"]) {
    assert.equal(safeImageUrl(bad), null, bad);
  }
  assert.ok(safeImageUrl("https://img.example.com/a.jpg"));
  const jpg = await sharp({ create: { width: 400, height: 400, channels: 3, background: "#808080" } }).jpeg().toBuffer();
  const seen: RequestInit[] = [];
  const fake = (body: BodyInit, headers: Record<string, string>, status = 200) => async (_url: string, init: RequestInit) => {
    seen.push(init);
    return new Response(body, { status, headers });
  };
  assert.deepEqual(await fetchPastedImage("https://img.example.com/page.html", fake("<html><body>annonce</body></html>", { "content-type": "text/html" })), { ok: false, code: "not_image" });
  assert.deepEqual(await fetchPastedImage("https://img.example.com/x.jpg", fake("<html>cache une page</html>", { "content-type": "image/jpeg" })), { ok: false, code: "not_image" });
  assert.deepEqual(await fetchPastedImage("https://img.example.com/x.jpg", fake("", { location: "http://img.example.com/y.jpg" }, 302)), { ok: false, code: "url" });
  assert.deepEqual(await fetchPastedImage("https://img.example.com/x.jpg", fake("", { "content-length": String(30 * 1024 * 1024), "content-type": "image/jpeg" })), { ok: false, code: "too_large" });
  const ok = await fetchPastedImage("https://img.example.com/x.jpg", fake(new Uint8Array(jpg), { "content-type": "image/jpeg" }));
  assert.ok(ok.ok && ok.buffer.equals(jpg));
  // Aucun en-tete ajoute (ni User-Agent, ni nom, ni e-mail).
  for (const init of seen) assert.equal(init.headers, undefined);
  // Le seul appel reseau du module d'import est celui de l'image.
  const files = readdirSync(join(root, "lib/import-listing")).map((f) => read(`lib/import-listing/${f}`));
  assert.equal(files.join("\n").match(/\bfetch\(/g)?.length ?? 0, 0, "fetch direct dans lib/import-listing");
  assert.ok(!/\bfetch\(/.test(read("app/admin/properties/import-actions.ts")));
  assert.ok(!/\bfetch\(/.test(read("components/admin/ListingImporter.tsx")));
  assert.ok(/checkImageToken\(propertyId, url, token\)/.test(read("app/admin/properties/[id]/photos/actions.ts")));
});

await check("5c. jeton : seule une adresse du contenu colle, pour ce bien, dans les 6 heures", async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret-not-real";
  const { imageToken, checkImageToken } = await import("../../lib/import-listing/token");
  const tok = imageToken("bien-1", "https://img.example.com/a.jpg", 1_000_000) as string;
  assert.ok(checkImageToken("bien-1", "https://img.example.com/a.jpg", tok, 1_000_001));
  assert.ok(!checkImageToken("bien-1", "https://img.example.com/b.jpg", tok, 1_000_001));
  assert.ok(!checkImageToken("bien-2", "https://img.example.com/a.jpg", tok, 1_000_001));
  assert.ok(!checkImageToken("bien-1", "https://img.example.com/a.jpg", tok, 1_000_000 + 7 * 3600 * 1000));
});

await check("5d. champs a completer du brouillon (selon le type de bien)", () => {
  const row = { title_fr: "Annonce importée à compléter", property_type: "terrain", country: "LU", city: "Hesperange", price: null, price_on_demand: false, living_surface: null, bedrooms: null, energy: null, description_fr: "<p></p>" };
  assert.deepEqual(draftTodo(row, "Annonce importée à compléter"), ["title_fr", "price", "description_fr"]);
});

// --- Amelioration des photos ------------------------------------------------------
await check("6a. amelioration : original intact, dimensions inchangees, photo sombre eclaircie", async () => {
  const w = 900;
  const h = 600;
  const raw = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    raw[i] = 30 + x / 15;
    raw[i + 1] = 28 + y / 12;
    raw[i + 2] = 45 + (x + y) / 30;
  }
  const original = await sharp(raw, { raw: { width: w, height: h, channels: 3 } }).webp({ quality: 90 }).toBuffer();
  const hash = createHash("sha256").update(original).digest("hex");
  const out = await enhanceImage(original);
  assert.equal(createHash("sha256").update(original).digest("hex"), hash, "original modifie");
  const meta = await sharp(out.buffer).metadata();
  assert.equal(meta.width, w);
  assert.equal(meta.height, h);
  const before = (await sharp(original).stats()).channels.slice(0, 3).reduce((a, c) => a + c.mean, 0);
  const after = (await sharp(out.buffer).stats()).channels.slice(0, 3).reduce((a, c) => a + c.mean, 0);
  assert.ok(after > before, `${after} > ${before}`);
  assert.ok(out.settings.brightness <= 1.25 && out.settings.saturation <= 1.1);
  const preview = await enhanceImage(original, { maxWidth: 600 });
  assert.equal(preview.width, 600);
});

await check("6b. original conserve et retour a l'original (chemins des deux fichiers)", () => {
  const p = "bien-1/1731500000-abc123.webp";
  const e = enhancedPathOf(p);
  assert.equal(e, "bien-1/1731500000-abc123.enh.webp");
  assert.ok(isEnhancedPath(e) && !isEnhancedPath(p));
  assert.equal(originalPathOf(e), p);
  assert.equal(enhancedPathOf(e), e);
  assert.equal(swapPathInUrl(`https://x.supabase.co/storage/v1/object/public/property-images/${e}`, e, p), `https://x.supabase.co/storage/v1/object/public/property-images/${p}`);
  assert.equal(originalPathOf(enhancedPathOf("bien-1/ancienne.jpg")), "bien-1/ancienne.jpg");
  assert.ok(isPropertyPhotoPath("bien-1", e) && !isPropertyPhotoPath("bien-1", "bien-1/../bien-2/a.webp") && !isPropertyPhotoPath("bien-1", "bien-2/a.webp"));
  const actions = read("app/admin/properties/[id]/photos/actions.ts");
  // L'apercu n'enregistre rien ; l'application ecrit un second fichier, jamais l'original.
  const preview = actions.slice(actions.indexOf("export async function previewPhotoEnhancement"), actions.indexOf("async function switchPhotoUrl"));
  assert.ok(!/\.upload\(|\.update\(/.test(preview));
  const apply = actions.slice(actions.indexOf("export async function applyPhotoEnhancement"), actions.indexOf("export async function revertPhotoEnhancement"));
  assert.ok(apply.includes("enhancedPathOf(src.original)") && !/upload\(src\.original/.test(apply));
});

await check("6c. gestion des photos : Ameliorer, Tout ameliorer, apercu avant / apres, Revenir a l'original", () => {
  const pm = read("components/admin/PhotoManager.tsx");
  for (const k of ['t("enhance_one")', 't("enhance_all")', 't("enhance_revert")', "<BeforeAfter", "applyReview"]) assert.ok(pm.includes(k), k);
  assert.ok(read("components/admin/PropertyPhotosSection.tsx").includes("applyPhotoEnhancement"));
  assert.ok(read("components/admin/BeforeAfter.tsx").includes('type="range"'));
});

// --- Traductions -------------------------------------------------------------------
await check("7. textes de l'ecran en fr, en, de, sans tiret long ni moyen", () => {
  const files = ["components/admin/ListingImporter.tsx", "components/admin/ImportSummaryBanner.tsx", "components/admin/BeforeAfter.tsx", "components/admin/PhotoManager.tsx", "components/admin/PropertyEditForm.tsx", "app/admin/properties/import-actions.ts", "app/admin/properties/[id]/photos/actions.ts"];
  const used = new Set(files.flatMap((f) => [...read(f).matchAll(/\bt\("((?:import|enhance)_[a-z0-9_]+)"/g)].map((m) => m[1])));
  used.add("import_title_fallback");
  for (const l of ["fr", "en", "de"]) {
    const ns = JSON.parse(read(`messages/${l}.json`)).admin_properties as Record<string, string>;
    for (const k of used) assert.ok(typeof ns[k] === "string" && ns[k].length > 0, `${l}.${k}`);
    for (const [k, v] of Object.entries(ns)) if (/^(import|enhance)_/.test(k)) assert.ok(!/[–—]/.test(v), `${l}.${k}`);
  }
});

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
