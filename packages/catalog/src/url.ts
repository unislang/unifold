const safeProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);
const resolutionBase = "https://unifold.invalid/";

export function isSafeUrl(value: string): boolean {
  try {
    return safeProtocols.has(new URL(value, resolutionBase).protocol);
  } catch {
    return false;
  }
}
