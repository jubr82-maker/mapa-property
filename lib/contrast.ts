const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const relativeLuminance = ([r, g, b]: [number, number, number]) => {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrastRatio = (hexA: string, hexB: string): number => {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const [light, dark] = lA > lB ? [lA, lB] : [lB, lA];
  return (light + 0.05) / (dark + 0.05);
};

export const ensureContrast = (
  bgHex: string,
  textHex: string,
  context = "unknown",
  minRatio = 4.5,
) => {
  if (process.env.NODE_ENV !== "development") return;
  const ratio = contrastRatio(bgHex, textHex);
  if (ratio < minRatio) {
    console.warn(
      `[contrast] WCAG AA fail (${ratio.toFixed(2)} < ${minRatio}) — bg=${bgHex} text=${textHex} @ ${context}`,
    );
  }
};
