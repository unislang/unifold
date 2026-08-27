import {
  JsonUiProfileName,
  JsonUiProfileVersion,
  JsonUiUpstreamRevision,
  UiContractSchemaUri,
  UiSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";
import {
  JsonPatchOperationType,
  UiPatchRequestedCheck,
  UiPatchRisk,
  type UiPatchProposal
} from "@unislang/unifold-ai";

export function studioDocument(revision = "1", label = "Name"): JsonObject {
  return {
    $schema: UiContractSchemaUri.Version1,
    catalog: { name: "unifold-core", version: "1.0.0" },
    compositions: [],
    id: "studio-test",
    jsonUiProfile: {
      name: JsonUiProfileName.Unifold,
      upstream: JsonUiUpstreamRevision.Version01025,
      version: JsonUiProfileVersion.Version1
    },
    revision,
    schemaVersion: UiSchemaVersion.Version1,
    view: {
      $children: [{ $comp: "TextField", id: "name", label, name: "name", value: "" }],
      $comp: "Form",
      id: "profile",
      label: "Profile"
    }
  };
}

export function studioProposal(id = "proposal-1"): UiPatchProposal {
  return {
    baseHash: "a".repeat(64),
    baseRevision: "1",
    expectedOutcomes: ["The label is clearer."],
    intentSummary: "Clarify the label.",
    operations: [
      { op: JsonPatchOperationType.Test, path: "/revision", value: "1" },
      { op: JsonPatchOperationType.Replace, path: "/revision", value: "2" },
      {
        op: JsonPatchOperationType.Replace,
        path: "/view/$children/0/label",
        value: "Full name"
      }
    ],
    proposalId: id,
    requestedChecks: [UiPatchRequestedCheck.Accessibility],
    risk: UiPatchRisk.Presentation
  };
}
