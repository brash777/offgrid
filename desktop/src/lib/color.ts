const LINEAR_THRESHOLD = 0.03928;
const MIN_TEXT_CONTRAST = 4.5;

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= LINEAR_THRESHOLD ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '');
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    channelToLinear(Number.parseInt(normalized.slice(offset, offset + 2), 16)),
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsTextContrast(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= MIN_TEXT_CONTRAST;
}

export function prefersDarkText(backgroundHex: string, darkText: string, lightText: string): boolean {
  return contrastRatio(darkText, backgroundHex) >= contrastRatio(lightText, backgroundHex);
}
