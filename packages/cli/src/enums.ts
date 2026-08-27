export enum UnifoldCliCommand {
  Generate = "generate",
  Module = "module",
  Validate = "validate"
}

export enum UnifoldCliModuleAction {
  Check = "check",
  Flatten = "flatten",
  Validate = "validate"
}

export enum UnifoldCliModuleProjectSchemaUri {
  Version1 = "https://schemas.unifold.org/ui-module-project/1.0/schema.json"
}

export enum UnifoldCliModuleProjectSchemaVersion {
  Version1 = "1.0.0"
}

export enum UnifoldCliModuleBuildSchemaUri {
  Version1 = "https://schemas.unifold.org/ui-module-build/1.0/schema.json"
}

export enum UnifoldCliModuleBuildSchemaVersion {
  Version1 = "1.0.0"
}

export enum UnifoldCliGenerator {
  Starter = "starter"
}

export enum UnifoldCliDiagnosticCode {
  DocumentInvalid = "document-invalid",
  InputInvalid = "input-invalid",
  InputReadFailed = "input-read-failed",
  InvocationInvalid = "invocation-invalid",
  ModuleBuildInvalid = "module-build-invalid",
  ModuleInvalid = "module-invalid",
  ModuleLockInvalid = "module-lock-invalid",
  ModuleLockStale = "module-lock-stale",
  ModuleManifestInvalid = "module-manifest-invalid",
  ModuleWriteFailed = "module-write-failed",
  StarterGenerationFailed = "starter-generation-failed",
  StarterTargetExists = "starter-target-exists",
  StarterTargetUnsafe = "starter-target-unsafe"
}

export enum UnifoldCliStatus {
  Failed = "failed",
  Succeeded = "succeeded"
}
