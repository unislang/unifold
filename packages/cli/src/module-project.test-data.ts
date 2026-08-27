import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  UiModuleResourceKind,
  UiModuleSchemaUri,
  UiModuleSchemaVersion,
  uiModuleIntegrity,
  type UiModule
} from "@unislang/unifold-modules";

import { UI_MODULE_PROJECT_SCHEMA } from "./module-project-schema.js";

export async function writeModuleProject(root: string, invalidIntegrity = false): Promise<void> {
  const sourceRoot = join(root, "modules");
  await mkdir(sourceRoot);
  const shared = sharedModule();
  const integrity = invalidIntegrity ? invalidHash() : await uiModuleIntegrity(shared);
  const application = applicationModule(integrity);
  await Promise.all([
    writeJson(join(sourceRoot, "application.module.json"), application),
    writeJson(join(sourceRoot, "shared.module.json"), shared),
    writeJson(join(root, "modules.project.json"), manifest())
  ]);
}

function applicationModule(integrity: string): UiModule {
  return {
    $schema: UiModuleSchemaUri.Version1,
    exports: {
      compositions: [],
      documents: [{ document: layoutDocument(), name: "application" }],
      resources: []
    },
    id: "org.example.application",
    imports: [
      {
        integrity,
        moduleId: "org.example.shared",
        namespace: "shared",
        version: "1.0.0"
      }
    ],
    schemaVersion: UiModuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}

function sharedModule(): UiModule {
  return {
    $schema: UiModuleSchemaUri.Version1,
    exports: {
      compositions: [],
      documents: [],
      resources: [
        { id: "welcome", kind: UiModuleResourceKind.Message, value: "Welcome from a module" }
      ]
    },
    id: "org.example.shared",
    imports: [],
    schemaVersion: UiModuleSchemaVersion.Version1,
    version: "1.0.0"
  };
}

function layoutDocument() {
  return {
    $schema: "https://schemas.unifold.org/layout-document/1.0/schema.json",
    catalog: { name: "unifold-core", version: "1.0.0" },
    id: "module-project",
    layoutType: "welcome-page",
    layoutVersion: "1.0.0",
    layouts: [
      {
        layoutType: "welcome-page",
        template: { id: "welcome", props: { content: "{{message}}" }, type: "Text" },
        variables: { message: { required: true, type: "string" } },
        version: "1.0.0"
      }
    ],
    revision: "revision-1",
    schemaVersion: "1.0.0",
    variables: { message: "Scratch-style module page" }
  };
}

function manifest() {
  return {
    $schema: UI_MODULE_PROJECT_SCHEMA,
    entry: {
      exportName: "application",
      moduleId: "org.example.application",
      version: "1.0.0"
    },
    schemaVersion: "1.0.0",
    sources: ["modules/shared.module.json", "modules/application.module.json"]
  };
}

function invalidHash(): string {
  return `sha256-${"x".repeat(43)}`;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2));
}
