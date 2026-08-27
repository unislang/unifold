import {
  CoreComponentType,
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import {
  ComponentDefinitionSchemaVersion,
  coreCatalog,
  getComponentDefinitionSidecar,
  getCoreDescriptor,
  type ComponentDefinition,
  type ComponentDefinitionDocument
} from "@unislang/unifold-catalog";

import { fingerprintJson } from "./fingerprint.js";
import {
  JsonPatchOperationType,
  UiPatchRequestedCheck,
  UiPatchRisk,
  type UiPatchProposal
} from "./types.js";

export function aiTestDocument(): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "ai-test",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision: "1",
    schemaVersion: UiSchemaVersion.Version1,
    view: {
      $children: [{ $comp: "TextField", id: "name", label: "Name", name: "name", value: "" }],
      $comp: "Form",
      id: "form",
      label: "Profile"
    }
  };
}

export function aiTestComponentDefinitions(): ComponentDefinitionDocument {
  return {
    catalog: { name: coreCatalog.name, version: coreCatalog.version },
    definitions: [
      testComponentDefinition(CoreComponentType.Form),
      testComponentDefinition(CoreComponentType.TextField)
    ],
    schemaVersion: ComponentDefinitionSchemaVersion.Version1
  };
}

function testComponentDefinition(componentType: CoreComponentType): ComponentDefinition {
  const catalogDescriptor = getCoreDescriptor(componentType);
  const sidecar = getComponentDefinitionSidecar(componentType);
  if (catalogDescriptor === undefined || sidecar === undefined) throw new Error("Missing fixture.");
  return {
    ...sidecar,
    attributesSchema: {},
    catalogDescriptor,
    commonCapabilities: [],
    customElement: {},
    propertiesSchema: {},
    publicSnapshotSchema: {},
    tagName: catalogDescriptor.tagName,
    version: catalogDescriptor.version
  };
}

export async function aiTestProposal(
  risk: UiPatchRisk = UiPatchRisk.Presentation
): Promise<UiPatchProposal> {
  return {
    baseHash: await fingerprintJson(aiTestDocument()),
    baseRevision: "1",
    expectedOutcomes: ["The field uses a specific label."],
    intentSummary: "Clarify the name field.",
    operations: [
      { op: JsonPatchOperationType.Test, path: "/revision", value: "1" },
      { op: JsonPatchOperationType.Replace, path: "/revision", value: "2" },
      {
        op: JsonPatchOperationType.Replace,
        path: "/view/$children/0/label",
        value: "Full name"
      }
    ],
    proposalId: "proposal-1",
    requestedChecks: [UiPatchRequestedCheck.Accessibility],
    risk
  };
}
