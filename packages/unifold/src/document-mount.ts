import { mountPreparedUnifoldApplication } from "./mount.js";
import { loadUnifoldDocument } from "./document-loader.js";
import {
  UnifoldDocumentLoadStatus,
  type LoadAndMountUnifoldApplicationResult,
  type LoadUnifoldDocumentOptions
} from "./document-loading-types.js";
import { UnifoldApplicationMountStatus, type MountUnifoldApplicationOptions } from "./types.js";

export async function loadAndMountUnifoldApplication(
  source: unknown,
  container: HTMLElement,
  loadOptions: LoadUnifoldDocumentOptions,
  mountOptions: MountUnifoldApplicationOptions = {}
): Promise<LoadAndMountUnifoldApplicationResult> {
  const loaded = await loadUnifoldDocument(source, loadOptions);
  if (loaded.status === UnifoldDocumentLoadStatus.Rejected) {
    return { diagnostics: loaded.diagnostics, status: UnifoldApplicationMountStatus.Rejected };
  }
  const mounted = mountPreparedUnifoldApplication(loaded.prepared, container, mountOptions);
  return { ...mounted, provenance: loaded.provenance };
}
