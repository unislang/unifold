const safeProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);
const safeResourceProtocols = new Set(["http:", "https:"]);
const resolutionBase = "https://unifold.invalid/";

export function isSafeUrl(value: string): boolean {
  try {
    return safeProtocols.has(new URL(value, resolutionBase).protocol);
  } catch {
    return false;
  }
}

export function isSafeResourceUrl(value: string): boolean {
  try {
    return safeResourceProtocols.has(new URL(value, resolutionBase).protocol);
  } catch {
    return false;
  }
}
