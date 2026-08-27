import { DataClassification } from "@unislang/unifold-contracts";
import { customProvider } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { expect, it } from "vitest";

import { manifestFixture } from "./governance.test-data.js";
import { UiAiProviderCapability } from "./provider-manifest.js";
import {
  UiAiProviderRegistryDiagnosticCode,
  UiAiProviderRegistryStatus,
  UiAiProviderResolutionStatus,
  createUiAiProviderRouteRegistry
} from "./provider-registry.js";

it("resolves a server-owned route through the AI SDK registry", async () => {
  const fixture = await registryFixture();
  expect(fixture.result.status).toBe(UiAiProviderRegistryStatus.Ready);
  const resolved = requireReady(fixture.result).resolve(request());
  expect(resolved.status).toBe(UiAiProviderResolutionStatus.Resolved);
  const provider = requireResolved(resolved);
  expect(provider.model).toBe(fixture.model);
  expect(provider.manifest.signature.keyId).toBe("test-key");
});

it.each([
  [{ routeId: "missing" }, UiAiProviderRegistryDiagnosticCode.UnknownRoute],
  [
    { capability: "missing" as UiAiProviderCapability },
    UiAiProviderRegistryDiagnosticCode.CapabilityDenied
  ],
  [
    { classification: DataClassification.Confidential },
    UiAiProviderRegistryDiagnosticCode.ClassificationDenied
  ],
  [{ region: "eu-west" }, UiAiProviderRegistryDiagnosticCode.RegionDenied]
])("rejects an ineligible route request", async (override, expected) => {
  const fixture = await registryFixture();
  const resolved = requireReady(fixture.result).resolve({ ...request(), ...override });
  expect(diagnosticCode(resolved)).toBe(expected);
});

it("rejects duplicate routes and invalid manifests before model resolution", async () => {
  const fixture = await manifestFixture();
  const provider = customProvider({ languageModels: { "proposal-v1": languageModel() } });
  const route = { routeId: "proposal", signedManifest: fixture.signedManifest };
  const duplicate = await createUiAiProviderRouteRegistry({
    clock: () => fixture.options.nowEpochMs,
    providers: { mock: provider },
    routes: [route, route],
    trustedKeys: fixture.keys
  });
  expect(diagnosticCode(duplicate)).toBe(UiAiProviderRegistryDiagnosticCode.DuplicateRoute);
  const invalid = await createUiAiProviderRouteRegistry({
    clock: () => fixture.options.nowEpochMs,
    providers: { mock: provider },
    routes: [
      {
        ...route,
        signedManifest: {
          ...route.signedManifest,
          signature: { ...route.signedManifest.signature, value: "invalid" }
        }
      }
    ],
    trustedKeys: fixture.keys
  });
  expect(invalid.status).toBe(UiAiProviderRegistryStatus.Rejected);
});

it("contains an unavailable provider without exposing its exception", async () => {
  const fixture = await manifestFixture();
  const result = await createUiAiProviderRouteRegistry({
    clock: () => fixture.options.nowEpochMs,
    providers: { other: customProvider({ languageModels: {} }) },
    routes: [{ routeId: "proposal", signedManifest: fixture.signedManifest }],
    trustedKeys: fixture.keys
  });
  expect(diagnosticCode(requireReady(result).resolve(request()))).toBe(
    UiAiProviderRegistryDiagnosticCode.ProviderUnavailable
  );
});

it("rechecks temporal eligibility on every long-lived registry resolution", async () => {
  const fixture = await manifestFixture();
  let now = fixture.options.nowEpochMs;
  const result = await createUiAiProviderRouteRegistry({
    clock: () => now,
    providers: { mock: customProvider({ languageModels: { "proposal-v1": languageModel() } }) },
    routes: [{ routeId: "proposal", signedManifest: fixture.signedManifest }],
    trustedKeys: fixture.keys
  });
  const registry = requireReady(result);
  now = Date.parse("2027-01-01T00:00:00.000Z");
  expect(diagnosticCode(registry.resolve(request()))).toBe(
    UiAiProviderRegistryDiagnosticCode.ManifestIneligible
  );
});

it("owns immutable verified manifest snapshots", async () => {
  const fixture = await manifestFixture();
  const model = languageModel();
  const result = await createUiAiProviderRouteRegistry({
    clock: () => fixture.options.nowEpochMs,
    providers: { mock: customProvider({ languageModels: { "proposal-v1": model } }) },
    routes: [{ routeId: "proposal", signedManifest: fixture.signedManifest }],
    trustedKeys: fixture.keys
  });
  const registry = requireReady(result);
  mutableManifest(fixture.signedManifest)["modelId"] = "mutated-original";
  const first = requireResolved(registry.resolve(request()));
  mutableManifest(first.manifest)["modelId"] = "mutated-result";
  const second = requireResolved(registry.resolve(request()));
  expect(second.manifest.manifest.modelId).toBe("proposal-v1");
  expect(second.model).toBe(model);
});

it("rejects never-export data even when a signed manifest claims eligibility", async () => {
  const fixture = await manifestFixture({
    classifications: [DataClassification.Internal, DataClassification.NeverExport]
  });
  const result = await createUiAiProviderRouteRegistry({
    clock: () => fixture.options.nowEpochMs,
    providers: { mock: customProvider({ languageModels: { "proposal-v1": languageModel() } }) },
    routes: [{ routeId: "proposal", signedManifest: fixture.signedManifest }],
    trustedKeys: fixture.keys
  });
  const denied = requireReady(result).resolve({
    ...request(),
    classification: DataClassification.NeverExport
  });
  expect(diagnosticCode(denied)).toBe(UiAiProviderRegistryDiagnosticCode.ClassificationDenied);
});

it("rejects malformed aliases and duplicate model routes", async () => {
  const fixture = await manifestFixture();
  const provider = customProvider({ languageModels: { "proposal-v1": languageModel() } });
  const invalid = await createUiAiProviderRouteRegistry({
    clock: () => fixture.options.nowEpochMs,
    providers: { mock: provider },
    routes: [{ routeId: "Bad route", signedManifest: fixture.signedManifest }],
    trustedKeys: fixture.keys
  });
  expect(diagnosticCode(invalid)).toBe(UiAiProviderRegistryDiagnosticCode.InvalidRoute);
  const duplicate = await createUiAiProviderRouteRegistry({
    clock: () => fixture.options.nowEpochMs,
    providers: { mock: provider },
    routes: [
      { routeId: "first", signedManifest: fixture.signedManifest },
      { routeId: "second", signedManifest: fixture.signedManifest }
    ],
    trustedKeys: fixture.keys
  });
  expect(diagnosticCode(duplicate)).toBe(UiAiProviderRegistryDiagnosticCode.DuplicateModel);
});

async function registryFixture() {
  const fixture = await manifestFixture();
  const model = languageModel();
  const result = await createUiAiProviderRouteRegistry({
    clock: () => fixture.options.nowEpochMs,
    providers: { mock: customProvider({ languageModels: { "proposal-v1": model } }) },
    routes: [{ routeId: "proposal", signedManifest: fixture.signedManifest }],
    trustedKeys: fixture.keys
  });
  return { model, result };
}

function request() {
  return {
    capability: UiAiProviderCapability.StructuredOutput,
    classification: DataClassification.Internal,
    region: "us-central",
    routeId: "proposal"
  };
}

function languageModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ text: "{}", type: "text" }],
      finishReason: { raw: "stop", unified: "stop" },
      usage: {
        inputTokens: { cacheRead: 0, cacheWrite: 0, noCache: 1, total: 1 },
        outputTokens: { reasoning: 0, text: 1, total: 1 }
      },
      warnings: []
    }
  });
}

function mutableManifest(value: { readonly manifest: unknown }): Record<string, unknown> {
  return value.manifest as Record<string, unknown>;
}

function diagnosticCode(result: { readonly diagnostics: readonly { readonly code: string }[] }) {
  return result.diagnostics.at(0)?.code;
}

function requireReady(result: Awaited<ReturnType<typeof createUiAiProviderRouteRegistry>>) {
  if (result.status !== UiAiProviderRegistryStatus.Ready)
    throw new Error("registry fixture failed");
  return result.registry;
}

function requireResolved(result: ReturnType<ReturnType<typeof requireReady>["resolve"]>) {
  if (result.status !== UiAiProviderResolutionStatus.Resolved) throw new Error("resolution failed");
  return result.provider;
}
