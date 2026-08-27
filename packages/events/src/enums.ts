export enum CloudEventsSpecVersion {
  V1 = "1.0"
}

export { DataClassification } from "@unislang/unifold-contracts";

export enum UiControlStatus {
  Valid = "valid",
  Invalid = "invalid",
  Pending = "pending",
  Disabled = "disabled"
}

export enum UiEventContentType {
  Json = "application/json"
}

export enum UiEventDataSchema {
  EffectV1 = "https://schemas.unifold.org/events/effect-data/1.0/schema.json"
}

export enum UiEventPhase {
  Intent = "intent",
  State = "state",
  Effect = "effect",
  Inspection = "inspection"
}

export enum UiEventDisclosureMode {
  Full = "full",
  MetadataOnly = "metadata-only"
}

export enum UiEventRedactionReason {
  Classification = "classification",
  StoreWrite = "store-write"
}

export enum UiEventType {
  CommandApplied = "org.unifold.ui.command.applied.v1",
  EffectCompleted = "org.unifold.ui.effect.completed.v1",
  EffectFailed = "org.unifold.ui.effect.failed.v1",
  EffectRequested = "org.unifold.ui.effect.requested.v1",
  FormInvalid = "org.unifold.ui.form.invalid.v1",
  FormReset = "org.unifold.ui.form.reset.v1",
  FormSubmitted = "org.unifold.ui.form.submitted.v1",
  RuntimeDisposed = "org.unifold.ui.runtime.disposed.v1",
  TransactionCommitted = "org.unifold.ui.transaction.committed.v1",
  TransactionRejected = "org.unifold.ui.transaction.rejected.v1",
  ValidationCancelled = "org.unifold.ui.validation.cancelled.v1",
  ValidationCompleted = "org.unifold.ui.validation.completed.v1",
  ValidationFailed = "org.unifold.ui.validation.failed.v1",
  ValidationStarted = "org.unifold.ui.validation.started.v1"
}

export enum UiTransactionStatus {
  Committed = "committed",
  Rejected = "rejected"
}

export enum UiValidationSeverity {
  Error = "error",
  Warning = "warning"
}

export enum UiCommandType {
  ControlCollectionInsert = "control.collection-insert",
  ControlCollectionMove = "control.collection-move",
  ControlCollectionRemove = "control.collection-remove",
  ControlMarkTouched = "control.mark-touched",
  ControlSetDisabled = "control.set-disabled",
  ControlSetValue = "control.set-value",
  ControlSetStatus = "control.set-status",
  ControlValidationCancel = "control.validation-cancel",
  ControlValidationResolve = "control.validation-resolve",
  ControlValidationStart = "control.validation-start",
  FormReset = "form.reset",
  FormSubmit = "form.submit",
  NodePatchProperties = "node.patch-properties",
  StructureInstantiate = "structure.instantiate",
  StructureReconcile = "structure.reconcile",
  StructureRemove = "structure.remove",
  StoreWrite = "store.write",
  FocusRequest = "focus.request",
  AnnouncementRequest = "announcement.request",
  NavigationRequest = "navigation.request",
  EffectInvoke = "effect.invoke"
}

export enum UiValidationCancellationReason {
  Disabled = "disabled",
  Disposed = "disposed",
  Failed = "failed",
  Removed = "removed",
  Superseded = "superseded"
}

export { UiUpdateTrigger } from "@unislang/unifold-contracts";
