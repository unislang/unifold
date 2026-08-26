import {
  CoreCatalogName,
  CoreCatalogVersion,
  CoreComponentType,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject,
  type JsonUiNode,
  type UiDocument
} from "@unislang/unifold-contracts";

import {
  ComponentAccessibilityPattern,
  ComponentDataClassification,
  ComponentEvidenceCheck,
  ComponentSemanticAttachmentKind,
  ComponentSemanticHiddenContentPolicy,
  ComponentSemanticNormalization,
  ComponentSemanticValueSource,
  ComponentStatus
} from "./definition-enums.js";
import type { ComponentDefinitionSidecar, ComponentSemanticAttachmentContract } from "./types.js";

const manualChecks = Object.freeze(Object.values(ComponentEvidenceCheck));

interface DefinitionInput {
  readonly behaviors: readonly string[];
  readonly browserScenarios: readonly string[];
  readonly componentType: CoreComponentType;
  readonly example: JsonUiNode;
  readonly pattern: ComponentAccessibilityPattern;
  readonly purpose: string;
  readonly requirementIds: readonly string[];
  readonly semanticAttachmentPoints: readonly ComponentSemanticAttachmentContract[];
  readonly sensitiveProperties: readonly string[];
}

export function definition(input: DefinitionInput): ComponentDefinitionSidecar {
  const requirementIds = Object.freeze([...input.requirementIds]);
  return Object.freeze({
    accessibility: Object.freeze({
      manualChecks,
      pattern: input.pattern,
      requirementIds: Object.freeze(requirementIds.filter((id) => id.startsWith("A11Y.")))
    }),
    behaviors: Object.freeze([...input.behaviors]),
    componentType: input.componentType,
    examples: Object.freeze([exampleDocument(input.example)]),
    privacy: Object.freeze({
      classification: ComponentDataClassification.Inherit,
      sensitiveProperties: Object.freeze([...input.sensitiveProperties])
    }),
    purpose: input.purpose,
    semanticAttachmentPoints: Object.freeze(
      input.semanticAttachmentPoints.map((attachment) => Object.freeze({ ...attachment }))
    ),
    status: ComponentStatus.Experimental,
    testManifest: Object.freeze({
      browserScenarios: Object.freeze([...input.browserScenarios]),
      requirementIds,
      unitFile: `src/${componentFile(input.componentType)}.test.ts`
    })
  });
}

export function exampleNode(
  $comp: CoreComponentType,
  id: string,
  properties: JsonObject
): JsonUiNode {
  return { $comp, id, ...properties };
}

export function visibleProperty(
  id: string,
  sourceProperty: string
): ComponentSemanticAttachmentContract {
  return semanticAttachment(id, ComponentSemanticAttachmentKind.Property, sourceProperty);
}

export function visibleSubject(
  id: string,
  sourceProperty: string
): ComponentSemanticAttachmentContract {
  return semanticAttachment(id, ComponentSemanticAttachmentKind.Subject, sourceProperty);
}

export function urlProperty(
  id: string,
  sourceProperty: string
): ComponentSemanticAttachmentContract {
  return {
    ...semanticAttachment(id, ComponentSemanticAttachmentKind.Property, sourceProperty),
    normalization: ComponentSemanticNormalization.Url,
    valueSource: ComponentSemanticValueSource.PublicProperty
  };
}

function exampleDocument(view: JsonUiNode): UiDocument {
  return Object.freeze({
    $schema: UiContractSchemaUri.Version1,
    catalog: Object.freeze({
      name: CoreCatalogName.UnifoldCore,
      version: CoreCatalogVersion.Version1
    }),
    id: `${componentFile(view.$comp as CoreComponentType)}-example`,
    jsonUiProfile: Object.freeze({
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    }),
    revision: "example-1",
    schemaVersion: UiSchemaVersion.Version1,
    view: Object.freeze({ ...view })
  });
}

function semanticAttachment(
  id: string,
  kind: ComponentSemanticAttachmentKind,
  sourceProperty: string
): ComponentSemanticAttachmentContract {
  return {
    hiddenContent: ComponentSemanticHiddenContentPolicy.Prohibited,
    id,
    kind,
    normalization: ComponentSemanticNormalization.None,
    sourceProperty,
    valueSource: ComponentSemanticValueSource.VisibleText
  };
}

function componentFile(type: CoreComponentType): string {
  return type.replace(/([a-z])([A-Z])/gu, "$1-$2").toLowerCase();
}
