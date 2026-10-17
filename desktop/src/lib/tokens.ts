export function readToken(name: string, element: Element = document.documentElement): string {
  return getComputedStyle(element).getPropertyValue(name).trim();
}
