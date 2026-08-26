export function childPath(path: string, segment: number | string): string {
  return `${path}/${pointerSegment(String(segment))}`;
}

function pointerSegment(segment: string): string {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}
