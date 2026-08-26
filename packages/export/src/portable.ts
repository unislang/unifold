import {
  prepareUnifoldDocument,
  UnifoldPreparationStatus,
  type PreparedUnifoldDocument,
  type UnifoldApplicationPort
} from "@unislang/unifold";

import { canonicalJson, fingerprintJson } from "./canonical.js";
import {
  UnifoldExportDigestAlgorithm,
  UnifoldExportFileName,
  UnifoldExportFormat,
  UnifoldExportManifestVersion,
  UnifoldExportMediaType,
  UnifoldExportStatus,
  type PortableJsonExportResult,
  type UnifoldExportManifest
} from "./types.js";

export function exportUnifoldApplication(
  application: Pick<UnifoldApplicationPort, "authored">
): Promise<PortableJsonExportResult> {
  return createPortableJsonExport(application.authored);
}

export async function createPortableJsonExport(
  authored: unknown
): Promise<PortableJsonExportResult> {
  const preparation = prepareUnifoldDocument(authored);
  if (preparation.status === UnifoldPreparationStatus.Invalid) {
    return { diagnostics: preparation.diagnostics, status: UnifoldExportStatus.Rejected };
  }
  const prepared = requirePrepared(preparation.prepared);
  const document = prepared.document;
  const content = canonicalJson(prepared.authored);
  const manifest = await createManifest(document.documentId, document.documentRevision, content);
  return exported(content, manifest);
}

function requirePrepared(value: PreparedUnifoldDocument | undefined): PreparedUnifoldDocument {
  if (value === undefined) throw new Error("A valid export preparation has no document.");
  return value;
}

async function createManifest(
  documentId: string,
  documentRevision: string,
  content: string
): Promise<UnifoldExportManifest> {
  return {
    digestAlgorithm: UnifoldExportDigestAlgorithm.Sha256,
    documentId,
    documentRevision,
    fileName: UnifoldExportFileName.UiDocument,
    format: UnifoldExportFormat.PortableJson,
    manifestVersion: UnifoldExportManifestVersion.Version1,
    mediaType: UnifoldExportMediaType.Json,
    sha256: await fingerprintJson(JSON.parse(content))
  };
}

function exported(content: string, manifest: UnifoldExportManifest): PortableJsonExportResult {
  return {
    diagnostics: [],
    output: { content, manifest, manifestContent: canonicalJson(manifest) },
    status: UnifoldExportStatus.Exported
  };
}
