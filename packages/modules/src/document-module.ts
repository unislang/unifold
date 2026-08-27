import type { JsonObject } from "@unislang/unifold-contracts";

import {
  UiModuleSchemaUri,
  UiModuleSchemaVersion,
  type UiModule,
  type UiModuleDocumentExport
} from "./types.js";

export interface CreateUiDocumentModuleOptions {
  readonly document: JsonObject;
  readonly exportName: string;
  readonly moduleId: string;
  readonly version: string;
}

/** Wraps one authored JSON UI document in the strict UiModule 1.0 envelope. */
export function createUiDocumentModule(options: CreateUiDocumentModuleOptions): UiModule {
  return {
    $schema: UiModuleSchemaUri.Version1,
    exports: {
      compositions: [],
      documents: [documentExport(options)],
      resources: []
    },
    id: options.moduleId,
    imports: [],
    schemaVersion: UiModuleSchemaVersion.Version1,
    version: options.version
  };
}

function documentExport(options: CreateUiDocumentModuleOptions): UiModuleDocumentExport {
  return {
    document: structuredClone(options.document),
    name: options.exportName
  };
}
