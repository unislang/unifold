import { expect, it } from "vitest";

import { aiTestDocument, aiTestProposal } from "./proposal.test-data.js";
import { fingerprintJson } from "./fingerprint.js";
import { evaluateUiPatchProposal } from "./proposal.js";
import {
  JsonPatchOperationType,
  UiPatchApprovalStatus,
  UiPatchDiagnosticCode,
  UiPatchEvaluationStatus,
  UiPatchRequestedCheck,
  UiPatchRisk
} from "./types.js";

it("accepts a safe candidate only after patching and compilation", async () => {
  const result = await evaluateUiPatchProposal({
    document: aiTestDocument(),
    proposal: await aiTestProposal()
  });
  expect(result.status).toBe(UiPatchEvaluationStatus.Accepted);
  expect(result.candidate).toMatchObject({
    revision: "2",
    view: { $children: [{ label: "Full name" }] }
  });
});

it("holds consequential proposals for explicit approval", async () => {
  const proposal = await aiTestProposal(UiPatchRisk.Behavior);
  const pending = await evaluateUiPatchProposal({ document: aiTestDocument(), proposal });
  expect(pending.status).toBe(UiPatchEvaluationStatus.ReviewRequired);
  const approved = await evaluateUiPatchProposal({
    approval: UiPatchApprovalStatus.Approved,
    document: aiTestDocument(),
    proposal
  });
  expect(approved.status).toBe(UiPatchEvaluationStatus.Accepted);
});

it("holds underclassified data changes for explicit approval", async () => {
  const proposal = await aiTestProposal(UiPatchRisk.Presentation);
  const underclassified = {
    ...proposal,
    operations: [
      ...proposal.operations,
      {
        op: JsonPatchOperationType.Replace,
        path: "/view/$children/0/value",
        value: "Ada"
      }
    ]
  };
  const pending = await evaluateUiPatchProposal({
    document: aiTestDocument(),
    proposal: underclassified
  });
  expect(pending.status).toBe(UiPatchEvaluationStatus.ReviewRequired);
  const approved = await evaluateUiPatchProposal({
    approval: UiPatchApprovalStatus.Approved,
    document: aiTestDocument(),
    proposal: underclassified
  });
  expect(approved.status).toBe(UiPatchEvaluationStatus.Accepted);
});

it("creates an initial Schema.org graph only after approval", async () => {
  const proposal = await aiTestProposal(UiPatchRisk.Data);
  const result = await evaluateUiPatchProposal({
    approval: UiPatchApprovalStatus.Approved,
    document: aiTestDocument(),
    proposal: {
      ...proposal,
      operations: [...proposal.operations, initialSemanticsOperation()]
    }
  });
  expect(result.status).toBe(UiPatchEvaluationStatus.Accepted);
  expect(result.candidate).toMatchObject({
    semantics: { entities: [{ type: "WebPage" }] }
  });
});

it("rejects a candidate that fails its requested static-export preflight", async () => {
  const document = restrictedStaticDocument();
  const base = await aiTestProposal(UiPatchRisk.Data);
  const proposal = {
    ...base,
    baseHash: await fingerprintJson(document),
    requestedChecks: [UiPatchRequestedCheck.StaticExport]
  };
  const result = await evaluateUiPatchProposal({
    approval: UiPatchApprovalStatus.Approved,
    document,
    proposal
  });
  expect(result.status).toBe(UiPatchEvaluationStatus.Rejected);
  expect(result.diagnostics.map(({ code }) => code)).toContain(
    UiPatchDiagnosticCode.RequestedCheckFailed
  );
});

it("rejects stale, unsafe, and compiler-invalid proposals", async () => {
  const proposal = await aiTestProposal();
  await expectCode(
    { ...proposal, baseRevision: "stale" },
    UiPatchDiagnosticCode.BaseRevisionMismatch
  );
  await expectCode(unsafeProposal(proposal), UiPatchDiagnosticCode.ForbiddenPath);
  await expectCode(invalidComponentProposal(proposal), UiPatchDiagnosticCode.CompilationFailed);
  await expectCode(
    changedAncestorIdProposal(proposal),
    UiPatchDiagnosticCode.StableIdChanged,
    true
  );
});

async function expectCode(
  proposal: unknown,
  code: UiPatchDiagnosticCode,
  approved = false
): Promise<void> {
  const result = await evaluateUiPatchProposal({
    ...(approved ? { approval: UiPatchApprovalStatus.Approved } : {}),
    document: aiTestDocument(),
    proposal
  });
  expect(result.status).toBe(UiPatchEvaluationStatus.Rejected);
  expect(result.diagnostics.map((item) => item.code)).toContain(code);
}

function changedAncestorIdProposal(proposal: Awaited<ReturnType<typeof aiTestProposal>>) {
  const document = aiTestDocument();
  const view = document["view"] as { readonly $children: readonly object[] };
  return {
    ...proposal,
    operations: [
      ...proposal.operations,
      {
        op: JsonPatchOperationType.Replace,
        path: "/view/$children/0",
        value: { ...view.$children[0], id: "renamed-field" }
      }
    ]
  };
}

function initialSemanticsOperation() {
  return {
    op: JsonPatchOperationType.Add,
    path: "/semantics",
    value: {
      contractVersion: "1.0.0",
      entities: [
        {
          id: "urn:unifold:ai:prototype",
          properties: { name: { kind: "constant", value: "AI prototype" } },
          type: "WebPage"
        }
      ],
      primaryEntity: "urn:unifold:ai:prototype",
      publication: { mode: "public-page", profile: "schema.org" },
      vocabulary: { release: "30.0", uri: "https://schema.org" }
    }
  } as const;
}

function restrictedStaticDocument() {
  const document = aiTestDocument();
  const view = document["view"] as { readonly $children: readonly object[] };
  return {
    ...document,
    semantics: boundSemantics(),
    stores: [restrictedStore()],
    view: {
      ...(document["view"] as object),
      $children: [{ ...view.$children[0], path: "/name", store: "profile" }]
    }
  };
}

function restrictedStore() {
  return {
    access: "read-only",
    classification: "restricted",
    id: "profile",
    initialData: "optional",
    maxBytes: 1024,
    migrations: { maximum: "1.0.0", minimum: "1.0.0" },
    ownership: "host",
    persistence: "memory",
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: { name: { type: "string" } },
      required: ["name"],
      type: "object"
    },
    schemaVersion: "1.0.0",
    source: { kind: "host" }
  };
}

function boundSemantics() {
  return {
    contractVersion: "1.0.0",
    entities: [
      {
        id: "urn:unifold:ai:person",
        properties: { name: { kind: "node-control-value", nodeId: "name" } },
        type: "Person"
      }
    ],
    primaryEntity: "urn:unifold:ai:person",
    publication: { mode: "public-page", profile: "schema.org" },
    vocabulary: { release: "30.0", uri: "https://schema.org" }
  };
}

function unsafeProposal(proposal: Awaited<ReturnType<typeof aiTestProposal>>) {
  return {
    ...proposal,
    operations: [
      ...proposal.operations,
      { op: JsonPatchOperationType.Replace, path: "/view/id", value: "unsafe" }
    ]
  };
}

function invalidComponentProposal(proposal: Awaited<ReturnType<typeof aiTestProposal>>) {
  return {
    ...proposal,
    operations: [
      ...proposal.operations,
      {
        op: JsonPatchOperationType.Replace,
        path: "/view/$children/0/$comp",
        value: "UnknownComponent"
      }
    ]
  };
}
