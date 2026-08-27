import {
  mountUnifoldApplication,
  UnifoldApplicationMountStatus,
  UnifoldSemanticPublicationMode,
  type MountUnifoldApplicationOptions
} from "@unislang/unifold";

import { StudioDiagnosticCode, type StudioPreviewPort } from "./types.js";

export function createUnifoldStudioPreview(
  container: HTMLElement,
  options: MountUnifoldApplicationOptions = {}
): StudioPreviewPort {
  return {
    open(candidate) {
      const result = mountUnifoldApplication(candidate, container, previewOptions(options));
      if (result.status === UnifoldApplicationMountStatus.Mounted) return result.application;
      throw new StudioPreviewError(result.diagnostics.map(({ message }) => message).join(" "));
    }
  };
}

export class StudioPreviewError extends Error {
  readonly code = StudioDiagnosticCode.PreviewFailed;

  constructor(message: string) {
    super(message || "The isolated preview could not be mounted.");
    this.name = "StudioPreviewError";
  }
}

function previewOptions(options: MountUnifoldApplicationOptions): MountUnifoldApplicationOptions {
  return {
    ...(options.compositionMigrations === undefined
      ? {}
      : { compositionMigrations: options.compositionMigrations }),
    ...(options.layoutRegistry === undefined ? {} : { layoutRegistry: options.layoutRegistry }),
    runtime: {},
    semanticPublication: UnifoldSemanticPublicationMode.Disabled,
    storeAdapters: {}
  };
}
