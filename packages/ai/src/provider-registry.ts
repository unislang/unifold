import { DataClassification } from "@unislang/unifold-contracts";
import { createProviderRegistry, type LanguageModel } from "ai";

import {
  UiAiManifestVerificationStatus,
  UiAiProviderCapability,
  uiAiManifestTemporalDiagnostic,
  verifyUiAiProviderManifest,
  type SignedUiAiProviderManifest,
  type UiAiManifestDiagnostic
} from "./provider-manifest.js";

export enum UiAiProviderRegistryStatus {
  Ready = "ready",
  Rejected = "rejected"
}

export enum UiAiProviderResolutionStatus {
  Rejected = "rejected",
  Resolved = "resolved"
}

export enum UiAiProviderRegistryDiagnosticCode {
  CapabilityDenied = "capability-denied",
  ClassificationDenied = "classification-denied",
  DuplicateModel = "duplicate-model",
  DuplicateRoute = "duplicate-route",
  InvalidRoute = "invalid-route",
  ManifestIneligible = "manifest-ineligible",
  ProviderUnavailable = "provider-unavailable",
  RegionDenied = "region-denied",
  UnknownRoute = "unknown-route"
}

export interface UiAiProviderRouteDefinition {
  readonly routeId: string;
  readonly signedManifest: SignedUiAiProviderManifest;
}

export interface CreateUiAiProviderRegistryOptions {
  readonly clock: () => number;
  readonly providers: Parameters<typeof createProviderRegistry>[0];
  readonly routes: readonly UiAiProviderRouteDefinition[];
  readonly trustedKeys: ReadonlyMap<string, CryptoKey>;
}

export interface ResolveUiAiProviderOptions {
  readonly capability: UiAiProviderCapability;
  readonly classification: DataClassification;
  readonly region: string;
  readonly routeId: string;
}

export interface UiAiProviderRegistryDiagnostic {
  readonly code: UiAiProviderRegistryDiagnosticCode;
  readonly message: string;
}

export interface ResolvedUiAiProvider {
  readonly manifest: SignedUiAiProviderManifest;
  readonly model: LanguageModel;
  readonly routeId: string;
}

export type UiAiProviderResolutionResult =
  | {
      readonly diagnostics: readonly [];
      readonly provider: ResolvedUiAiProvider;
      readonly status: UiAiProviderResolutionStatus.Resolved;
    }
  | {
      readonly diagnostics: readonly UiAiProviderRegistryDiagnostic[];
      readonly status: UiAiProviderResolutionStatus.Rejected;
    };

export type UiAiProviderRegistryResult =
  | {
      readonly diagnostics: readonly [];
      readonly registry: UiAiProviderRouteRegistry;
      readonly status: UiAiProviderRegistryStatus.Ready;
    }
  | {
      readonly diagnostics: readonly (UiAiManifestDiagnostic | UiAiProviderRegistryDiagnostic)[];
      readonly status: UiAiProviderRegistryStatus.Rejected;
    };

export class UiAiProviderRouteRegistry {
  constructor(
    private readonly providers: ReturnType<typeof createProviderRegistry>,
    private readonly routes: ReadonlyMap<string, SignedUiAiProviderManifest>,
    private readonly clock: () => number
  ) {}

  resolve(options: ResolveUiAiProviderOptions): UiAiProviderResolutionResult {
    const signedManifest = this.routes.get(options.routeId);
    if (signedManifest === undefined)
      return resolutionRejected(UiAiProviderRegistryDiagnosticCode.UnknownRoute);
    const eligibility = routeEligibility(signedManifest, options, this.clock());
    if (eligibility !== undefined) return resolutionRejected(eligibility);
    return this.resolveModel(signedManifest, options.routeId);
  }

  private resolveModel(
    signedManifest: SignedUiAiProviderManifest,
    routeId: string
  ): UiAiProviderResolutionResult {
    const manifest = signedManifest.manifest;
    try {
      const model = this.providers.languageModel(`${manifest.providerId}:${manifest.modelId}`);
      return {
        diagnostics: [],
        provider: { manifest: structuredClone(signedManifest), model, routeId },
        status: UiAiProviderResolutionStatus.Resolved
      };
    } catch {
      return resolutionRejected(UiAiProviderRegistryDiagnosticCode.ProviderUnavailable);
    }
  }
}

export async function createUiAiProviderRouteRegistry(
  options: CreateUiAiProviderRegistryOptions
): Promise<UiAiProviderRegistryResult> {
  const configuration = configurationDiagnostic(options.routes);
  if (configuration !== undefined) return registryRejected(configuration);
  const verified = await Promise.all(options.routes.map((route) => verifyRoute(route, options)));
  return registryFromVerified(options, verified);
}

function registryFromVerified(
  options: CreateUiAiProviderRegistryOptions,
  verified: readonly RouteVerification[]
): UiAiProviderRegistryResult {
  const invalid = verified.find(rejectedRoute);
  if (invalid !== undefined) return rejectedVerification(invalid);
  const routes = verifiedRouteMap(verified.filter(verifiedRoute));
  return {
    diagnostics: [],
    registry: new UiAiProviderRouteRegistry(
      createProviderRegistry(options.providers),
      routes,
      options.clock
    ),
    status: UiAiProviderRegistryStatus.Ready
  };
}

interface VerifiedRoute {
  readonly routeId: string;
  readonly signedManifest: SignedUiAiProviderManifest;
}

type RouteVerification =
  | VerifiedRoute
  | { readonly diagnostics: readonly UiAiManifestDiagnostic[] };

async function verifyRoute(
  route: UiAiProviderRouteDefinition,
  options: CreateUiAiProviderRegistryOptions
): Promise<RouteVerification> {
  const verification = await verifyUiAiProviderManifest({
    nowEpochMs: options.clock(),
    signedManifest: route.signedManifest,
    trustedKeys: options.trustedKeys
  });
  return verification.status === UiAiManifestVerificationStatus.Verified
    ? { routeId: route.routeId, signedManifest: structuredClone(verification.signedManifest) }
    : { diagnostics: verification.diagnostics };
}

function configurationDiagnostic(
  routes: readonly UiAiProviderRouteDefinition[]
): UiAiProviderRegistryDiagnosticCode | undefined {
  return [
    invalidRouteDiagnostic(routes),
    duplicateRouteDiagnostic(routes),
    duplicateModelDiagnostic(routes)
  ].find((code) => code !== undefined);
}

function invalidRouteDiagnostic(
  routes: readonly UiAiProviderRouteDefinition[]
): UiAiProviderRegistryDiagnosticCode | undefined {
  return routes.every(({ routeId }) => validRouteId(routeId))
    ? undefined
    : UiAiProviderRegistryDiagnosticCode.InvalidRoute;
}

function duplicateRouteDiagnostic(
  routes: readonly UiAiProviderRouteDefinition[]
): UiAiProviderRegistryDiagnosticCode | undefined {
  return duplicateRoutes(routes) ? UiAiProviderRegistryDiagnosticCode.DuplicateRoute : undefined;
}

function duplicateModelDiagnostic(
  routes: readonly UiAiProviderRouteDefinition[]
): UiAiProviderRegistryDiagnosticCode | undefined {
  return duplicateModels(routes) ? UiAiProviderRegistryDiagnosticCode.DuplicateModel : undefined;
}

function routeEligibility(
  signed: SignedUiAiProviderManifest,
  options: ResolveUiAiProviderOptions,
  now: number
): UiAiProviderRegistryDiagnosticCode | undefined {
  return [
    temporalEligibility(signed, now),
    capabilityEligibility(signed, options),
    classificationEligibility(signed, options),
    regionEligibility(signed, options)
  ].find((code) => code !== undefined);
}

function temporalEligibility(
  signed: SignedUiAiProviderManifest,
  now: number
): UiAiProviderRegistryDiagnosticCode | undefined {
  return uiAiManifestTemporalDiagnostic(signed.manifest, now) === undefined
    ? undefined
    : UiAiProviderRegistryDiagnosticCode.ManifestIneligible;
}

function capabilityEligibility(
  signed: SignedUiAiProviderManifest,
  options: ResolveUiAiProviderOptions
): UiAiProviderRegistryDiagnosticCode | undefined {
  return signed.manifest.capabilities.includes(options.capability)
    ? undefined
    : UiAiProviderRegistryDiagnosticCode.CapabilityDenied;
}

function classificationEligibility(
  signed: SignedUiAiProviderManifest,
  options: ResolveUiAiProviderOptions
): UiAiProviderRegistryDiagnosticCode | undefined {
  const denied =
    options.classification === DataClassification.NeverExport ||
    !signed.manifest.classifications.includes(options.classification);
  return denied ? UiAiProviderRegistryDiagnosticCode.ClassificationDenied : undefined;
}

function regionEligibility(
  signed: SignedUiAiProviderManifest,
  options: ResolveUiAiProviderOptions
): UiAiProviderRegistryDiagnosticCode | undefined {
  return signed.manifest.regions.includes(options.region)
    ? undefined
    : UiAiProviderRegistryDiagnosticCode.RegionDenied;
}

function rejectedRoute(value: RouteVerification): boolean {
  return "diagnostics" in value;
}

function verifiedRoute(value: RouteVerification): value is VerifiedRoute {
  return !("diagnostics" in value);
}

function verifiedRouteMap(
  routes: readonly VerifiedRoute[]
): ReadonlyMap<string, SignedUiAiProviderManifest> {
  return new Map(routes.map(({ routeId, signedManifest }) => [routeId, signedManifest]));
}

function rejectedVerification(value: RouteVerification): UiAiProviderRegistryResult {
  const diagnostics = "diagnostics" in value ? value.diagnostics : [];
  return { diagnostics, status: UiAiProviderRegistryStatus.Rejected };
}

function duplicateRoutes(routes: readonly UiAiProviderRouteDefinition[]): boolean {
  return new Set(routes.map(({ routeId }) => routeId)).size !== routes.length;
}

function duplicateModels(routes: readonly UiAiProviderRouteDefinition[]): boolean {
  const models = routes.map(
    ({ signedManifest }) =>
      `${signedManifest.manifest.providerId}:${signedManifest.manifest.modelId}`
  );
  return new Set(models).size !== models.length;
}

function validRouteId(value: string): boolean {
  return value.length <= 128 && /^[a-z0-9][a-z0-9._-]*$/u.test(value);
}

function registryRejected(code: UiAiProviderRegistryDiagnosticCode): UiAiProviderRegistryResult {
  return {
    diagnostics: [diagnostic(code)],
    status: UiAiProviderRegistryStatus.Rejected
  };
}

function resolutionRejected(
  code: UiAiProviderRegistryDiagnosticCode
): UiAiProviderResolutionResult {
  return {
    diagnostics: [diagnostic(code)],
    status: UiAiProviderResolutionStatus.Rejected
  };
}

function diagnostic(code: UiAiProviderRegistryDiagnosticCode): UiAiProviderRegistryDiagnostic {
  return { code, message: `Provider route rejected: ${code}.` };
}
