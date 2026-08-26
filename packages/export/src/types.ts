import type { JsonObject } from "@unislang/unifold-contracts";
import type { UnifoldApplicationDiagnostic } from "@unislang/unifold";

export enum UnifoldExportFormat {
  PortableJson = "portable-json",
  StaticHtml = "static-html"
}

export enum UnifoldExportStatus {
  Exported = "exported",
  Rejected = "rejected"
}

export enum UnifoldExportManifestVersion {
  Version1 = "1.0.0"
}

export enum UnifoldExportDigestAlgorithm {
  Sha256 = "sha256"
}

export enum UnifoldExportMediaType {
  Html = "text/html",
  Json = "application/json"
}

export enum UnifoldExportFileName {
  StaticHtml = "index.html",
  UiDocument = "ui.json"
}

export interface UnifoldExportManifest extends JsonObject {
  readonly digestAlgorithm: UnifoldExportDigestAlgorithm;
  readonly documentId: string;
  readonly documentRevision: string;
  readonly fileName: UnifoldExportFileName;
  readonly format: UnifoldExportFormat;
  readonly manifestVersion: UnifoldExportManifestVersion;
  readonly mediaType: UnifoldExportMediaType;
  readonly sha256: string;
}

export interface PortableJsonExport {
  readonly content: string;
  readonly manifest: UnifoldExportManifest;
  readonly manifestContent: string;
}

export interface ExportedPortableJsonResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly output: PortableJsonExport;
  readonly status: UnifoldExportStatus.Exported;
}

export interface RejectedPortableJsonResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly status: UnifoldExportStatus.Rejected;
}

export type PortableJsonExportResult = ExportedPortableJsonResult | RejectedPortableJsonResult;

export interface StaticHtmlExport {
  readonly content: string;
  readonly manifest: UnifoldExportManifest;
  readonly manifestContent: string;
}

export interface ExportedStaticHtmlResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly output: StaticHtmlExport;
  readonly status: UnifoldExportStatus.Exported;
}

export interface RejectedStaticHtmlResult {
  readonly diagnostics: readonly UnifoldApplicationDiagnostic[];
  readonly status: UnifoldExportStatus.Rejected;
}

export type StaticHtmlExportResult = ExportedStaticHtmlResult | RejectedStaticHtmlResult;
