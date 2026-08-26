/** Minimal untrusted semantic document accepted by the executable schema. */
export const validGraph = {
  contractVersion: "1.0.0",
  entities: [
    {
      id: "urn:person:ada",
      properties: { name: { kind: "constant", value: "Ada" } },
      type: "Person"
    }
  ],
  primaryEntity: "urn:person:ada",
  publication: { mode: "public-page", profile: "schema.org" },
  vocabulary: { release: "30.0", uri: "https://schema.org" }
};
