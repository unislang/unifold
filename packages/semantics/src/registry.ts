import { SchemaOrgRelease } from "./enums.js";

export const schemaOrgContext = "https://schema.org";

export interface SchemaOrgTypeDefinition {
  readonly properties: ReadonlySet<string>;
}

const commonProperties = ["description", "identifier", "image", "name", "sameAs", "url"];

export const schemaOrgVersion30 = Object.freeze({
  Organization: definition("address", "email", "logo", "telephone"),
  Person: definition("affiliation", "email", "familyName", "givenName", "jobTitle", "telephone"),
  WebPage: definition("about", "breadcrumb", "dateModified", "datePublished", "mainEntity"),
  WebSite: definition("inLanguage", "publisher")
}) satisfies Readonly<Record<string, SchemaOrgTypeDefinition>>;

export function registryFor(release: SchemaOrgRelease) {
  return release === SchemaOrgRelease.Version30 ? schemaOrgVersion30 : undefined;
}

function definition(...properties: readonly string[]): SchemaOrgTypeDefinition {
  return { properties: new Set([...commonProperties, ...properties]) };
}
