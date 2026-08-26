import {
  prepareUnifoldDocument,
  UnifoldPreparationStatus,
  type PreparedUnifoldDocument
} from "@unislang/unifold";

import { canonicalJson, fingerprintText } from "./canonical.js";
import { escapeHtml } from "./html-escape.js";
import { renderStaticTree } from "./static-renderer.js";
import { compileStaticSemantics } from "./static-semantics.js";
import {
  UnifoldExportDigestAlgorithm,
  UnifoldExportFileName,
  UnifoldExportFormat,
  UnifoldExportManifestVersion,
  UnifoldExportMediaType,
  UnifoldExportStatus,
  type StaticHtmlExportResult,
  type UnifoldExportManifest
} from "./types.js";

export function createStaticHtmlExport(authored: unknown): Promise<StaticHtmlExportResult> {
  const preparation = prepareUnifoldDocument(authored);
  if (preparation.status === UnifoldPreparationStatus.Invalid) {
    return Promise.resolve({
      diagnostics: preparation.diagnostics,
      status: UnifoldExportStatus.Rejected
    });
  }
  return createPreparedStaticHtmlExport(requirePrepared(preparation.prepared));
}

export async function createPreparedStaticHtmlExport(
  prepared: PreparedUnifoldDocument
): Promise<StaticHtmlExportResult> {
  const semantics = compileStaticSemantics(prepared);
  if (semantics.serialized === undefined) {
    return { diagnostics: semantics.diagnostics, status: UnifoldExportStatus.Rejected };
  }
  const document = prepared.document;
  const content = staticDocument(
    document.documentId,
    semantics.serialized,
    renderStaticTree(document)
  );
  const manifest = await staticManifest(document.documentId, document.documentRevision, content);
  return {
    diagnostics: [],
    output: { content, manifest, manifestContent: canonicalJson(manifest) },
    status: UnifoldExportStatus.Exported
  };
}

function staticDocument(documentId: string, jsonLd: string, tree: string): string {
  const title = escapeHtml(documentId);
  const owner = escapeHtml(documentId);
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${title}</title>`,
    `<script type="application/ld+json" data-unifold-semantics="${owner}">${jsonLd}</script>`,
    `</head><body><main>${tree}</main></body></html>`
  ].join("");
}

async function staticManifest(
  documentId: string,
  documentRevision: string,
  content: string
): Promise<UnifoldExportManifest> {
  return {
    digestAlgorithm: UnifoldExportDigestAlgorithm.Sha256,
    documentId,
    documentRevision,
    fileName: UnifoldExportFileName.StaticHtml,
    format: UnifoldExportFormat.StaticHtml,
    manifestVersion: UnifoldExportManifestVersion.Version1,
    mediaType: UnifoldExportMediaType.Html,
    sha256: await fingerprintText(content)
  };
}

function requirePrepared(value: PreparedUnifoldDocument | undefined): PreparedUnifoldDocument {
  if (value === undefined) throw new Error("A valid static export preparation has no document.");
  return value;
}
