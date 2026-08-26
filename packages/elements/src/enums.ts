export enum ElementEventName {
  UiEvent = "unifold-event"
}

export enum ElementRegistrationDiagnosticCode {
  CatalogMismatch = "element-catalog-mismatch",
  ConstructorAlreadyDefined = "element-constructor-already-defined",
  DefinitionFailed = "element-definition-failed",
  ForeignDefinition = "foreign-element-definition",
  MissingDefinition = "element-definition-missing",
  RegistryUnavailable = "element-registry-unavailable",
  TagMismatch = "element-tag-mismatch"
}

export enum ElementRegistrationStatus {
  Registered = "registered",
  Rejected = "rejected"
}

export enum ElementEventType {
  ComponentActivated = "org.unifold.ui.component.activated.v1",
  ControlBlurred = "org.unifold.ui.control.blurred.v1",
  ControlInput = "org.unifold.ui.control.input.v1",
  FormResetRequested = "org.unifold.ui.form.reset-requested.v1",
  FormSubmitRequested = "org.unifold.ui.form.submit-requested.v1",
  FormSubmitted = "org.unifold.ui.form.submitted.v1"
}
