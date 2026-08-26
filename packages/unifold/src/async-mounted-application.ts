import type { UnifoldIrDocument } from "@unislang/unifold-ir";
import type { DomRenderController } from "@unislang/unifold-renderer-dom";
import type { UnifoldRuntime } from "@unislang/unifold-runtime";

import type { AsyncStoreCommandController } from "./async-store-command-port.js";
import { prepareUnifoldDocument } from "./compiler.js";
import {
  UnifoldApplicationDiagnosticStage,
  UnifoldApplicationUpdateStatus,
  type PreparedUnifoldDocument,
  type UnifoldApplicationPort,
  type UnifoldApplicationUpdateResult,
  type UnifoldPreparationOptions
} from "./types.js";

export class AsyncMountedApplication implements UnifoldApplicationPort {
  readonly renderer: DomRenderController;
  readonly runtime: UnifoldRuntime;
  readonly #application: UnifoldApplicationPort;
  readonly #controller: AsyncStoreCommandController;
  readonly #stores: UnifoldIrDocument["storesById"];
  #disposed = false;

  constructor(
    application: UnifoldApplicationPort,
    controller: AsyncStoreCommandController,
    document: UnifoldIrDocument,
    private readonly preparationOptions: UnifoldPreparationOptions
  ) {
    this.#application = application;
    this.#controller = controller;
    this.#stores = document.storesById;
    this.renderer = application.renderer;
    this.runtime = application.runtime;
  }

  get authored(): unknown {
    return this.#application.authored;
  }

  get document(): UnifoldIrDocument {
    return this.#application.document;
  }

  machineState(id: string) {
    return this.#application.machineState(id);
  }

  update(authored: unknown): UnifoldApplicationUpdateResult {
    const preparation = prepareUnifoldDocument(authored, this.preparationOptions);
    if (storeDefinitionsChanged(this.#stores, preparation.prepared))
      return rejectedUpdate(this.runtime.revision);
    return this.#application.update(authored);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#controller.dispose();
    this.#application.dispose();
  }
}

function storeDefinitionsChanged(
  current: UnifoldIrDocument["storesById"],
  prepared: PreparedUnifoldDocument | undefined
): boolean {
  if (prepared === undefined) return false;
  return JSON.stringify(current) !== JSON.stringify(prepared.document.storesById);
}

function rejectedUpdate(revision: number): UnifoldApplicationUpdateResult {
  return {
    diagnostics: [storeDefinitionDiagnostic()],
    revision,
    status: UnifoldApplicationUpdateStatus.Rejected
  };
}

function storeDefinitionDiagnostic() {
  return {
    code: "async-store-definition-changed",
    message: "A mounted async store definition cannot change during a synchronous update.",
    path: "/stores",
    stage: UnifoldApplicationDiagnosticStage.Store
  };
}
