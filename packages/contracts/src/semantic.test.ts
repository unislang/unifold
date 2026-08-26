import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import schema from "../schemas/semantic-graph.schema.json" with { type: "json" };
import {
  SchemaOrgRelease,
  SchemaOrgVocabularyUri,
  SemanticContractVersion,
  SemanticPublicationMode,
  SemanticPublicationProfile,
  SemanticValueKind,
  type SemanticGraph
} from "./semantic.js";

describe("SemanticGraph contract", () => {
  it("constructs a JSON-safe graph from enum-backed protocol values", () => {
    const graph = boundGraph();

    expect(JSON.parse(JSON.stringify(graph))).toEqual(graph);
  });

  it("keeps enum values aligned with the executable schema", () => {
    const validate = new Ajv2020({ allowUnionTypes: true, strict: true }).compile(schema);
    expect(validate(validGraph())).toBe(true);
    expect(validate({ ...validGraph(), contractVersion: "next" })).toBe(false);
    expect(schema.properties.vocabulary.properties.release.enum).toEqual([
      SchemaOrgRelease.Version30
    ]);
  });
});

function boundGraph(): SemanticGraph {
  return {
    ...validGraph(),
    entities: [
      {
        id: "https://example.com/people/ada",
        properties: { name: { kind: SemanticValueKind.NodeControlValue, nodeId: "name" } },
        type: "Person"
      }
    ],
    primaryEntity: "https://example.com/people/ada"
  };
}

function validGraph(): SemanticGraph {
  return {
    contractVersion: SemanticContractVersion.Version1,
    entities: [],
    publication: {
      mode: SemanticPublicationMode.PublicPage,
      profile: SemanticPublicationProfile.SchemaOrg
    },
    vocabulary: {
      release: SchemaOrgRelease.Version30,
      uri: SchemaOrgVocabularyUri.Canonical
    }
  };
}
