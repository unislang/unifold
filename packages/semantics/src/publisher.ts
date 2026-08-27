const selector = "script[type='application/ld+json'][data-unifold-semantics]";

export function publishJsonLd(
  document: Document,
  serialized: string,
  ownerId: string,
  replacedOwnerId?: string
): HTMLScriptElement {
  const existing = ownedPublication(document, ownerId, replacedOwnerId);
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset["unifoldSemantics"] = ownerId;
  script.textContent = serialized;
  installScript(document, existing, script);
  return script;
}

export function removeJsonLd(document: Document, ownerId: string, replacedOwnerId?: string): void {
  existingPublications(document)
    .filter((publication) => isAcceptedOwner(publication, ownerId, replacedOwnerId))
    .forEach((publication) => publication.remove());
}

function ownedPublication(
  document: Document,
  ownerId: string,
  replacedOwnerId?: string
): HTMLScriptElement | null {
  const publications = existingPublications(document).filter((publication) =>
    isAcceptedOwner(publication, ownerId, replacedOwnerId)
  );
  if (publications.length > 1) throw duplicateOwnerError(ownerId);
  return firstPublication(publications);
}

function isAcceptedOwner(
  existing: HTMLScriptElement,
  ownerId: string,
  replacedOwnerId?: string
): boolean {
  const currentOwner = existingOwner(existing);
  return currentOwner === ownerId || currentOwner === replacedOwnerId;
}

function existingOwner(existing: HTMLScriptElement): string | undefined {
  return existing.dataset["unifoldSemantics"];
}

function duplicateOwnerError(ownerId: string): Error {
  return new Error(`Semantic owner ${ownerId} contains multiple publications.`);
}

function firstPublication(publications: readonly HTMLScriptElement[]): HTMLScriptElement | null {
  if (publications.length === 0) return null;
  return publications[0] as HTMLScriptElement;
}

function existingPublications(document: Document): readonly HTMLScriptElement[] {
  return [...document.head.querySelectorAll<HTMLScriptElement>(selector)];
}

function installScript(
  document: Document,
  existing: HTMLScriptElement | null,
  script: HTMLScriptElement
): void {
  if (existing === null) document.head.append(script);
  else existing.replaceWith(script);
}
