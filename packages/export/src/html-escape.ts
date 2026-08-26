const htmlEscapes: Readonly<Record<string, string>> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;"
};

export function escapeHtml(value: string): string {
  return value.replaceAll(/[&<>"']/gu, escapedCharacter);
}

function escapedCharacter(value: string): string {
  return htmlEscapes[value] as string;
}
