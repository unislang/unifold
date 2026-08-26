import "@unislang/unifold-theme/tokens.css";
import { CoreCatalogMajor, CoreElementTag, coreCatalog } from "@unislang/unifold-catalog";
import {
  UnifoldApplicationMountStatus,
  UnifoldApplicationUpdateStatus,
  UnifoldDocumentIntegrity,
  UnifoldDocumentTrustRequirement,
  loadAndMountUnifoldApplication
} from "@unislang/unifold";
import {
  ElementRegistrationStatus as FirstRegistrationStatus,
  UnifoldButton as FirstButton,
  defineUnifoldElements as defineFirstCopy
} from "../physical-copies/first/dist/index.js";
import {
  ElementRegistrationDiagnosticCode as SecondDiagnosticCode,
  ElementRegistrationStatus as SecondRegistrationStatus,
  UnifoldButton as SecondButton,
  defineUnifoldElements as defineSecondCopy
} from "../physical-copies/second/dist/index.js";

import initialDocument from "./ui.json" with { type: "json" };
import updatedDocument from "./updated-ui.json" with { type: "json" };

document.documentElement.dataset["registrationEvidence"] = JSON.stringify(registrationEvidence());
const host = requireElement<HTMLElement>("app");
const result = await loadAndMountUnifoldApplication(JSON.stringify(initialDocument), host, {
  trustRequirement: UnifoldDocumentTrustRequirement.AllowUnsigned
});
if (result.status !== UnifoldApplicationMountStatus.Mounted) {
  throw new Error(`Packed consumer mount failed: ${JSON.stringify(result.diagnostics)}`);
}

const application = result.application;
host.dataset["mounted"] = "true";
host.dataset["sourceIntegrity"] = result.provenance.integrity;
if (result.provenance.integrity !== UnifoldDocumentIntegrity.Unsigned) {
  throw new Error("The local packed-consumer fixture unexpectedly required a signature.");
}
const subscription = application.runtime.events$.subscribe((event) => {
  requireTestElement("latest-event").textContent = event.type;
});

requireTestElement("update-document").addEventListener("click", () => {
  const update = application.update(updatedDocument);
  if (update.status !== UnifoldApplicationUpdateStatus.Applied) {
    throw new Error(`Packed consumer update failed: ${JSON.stringify(update.diagnostics)}`);
  }
  host.dataset["updated"] = "true";
});

requireTestElement("dispose-application").addEventListener("click", () => {
  subscription.unsubscribe();
  application.dispose();
  host.dataset["disposed"] = "true";
});

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing packed-consumer element: ${id}.`);
  return element as T;
}

function requireTestElement(testId: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (element === null) throw new Error(`Missing packed-consumer test element: ${testId}.`);
  return element;
}

function registrationEvidence() {
  return { ...sameReleaseEvidence(), ...differentReleaseIframeEvidence() };
}

function sameReleaseEvidence() {
  const first = defineFirstCopy();
  const registeredButton = customElements.get(CoreElementTag.Button);
  const second = defineSecondCopy();
  return {
    constructorsDistinct: !Object.is(FirstButton, SecondButton),
    firstDefinedBaseline: first.definedTags.length === 19,
    firstOwnsButton: registeredButton === FirstButton,
    firstRegistered: first.status === FirstRegistrationStatus.Registered,
    litRuntimeShared: litBase(FirstButton) === litBase(SecondButton),
    secondDefinedNoTags: second.definedTags.length === 0,
    secondRegistered: second.status === SecondRegistrationStatus.Registered
  };
}

function differentReleaseIframeEvidence() {
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const realm = iframe.contentWindow as Window & typeof globalThis;
  class DifferentReleaseButton extends realm.HTMLElement {}
  Object.defineProperty(DifferentReleaseButton, Symbol.for("org.unifold.element-definition"), {
    value: {
      catalogMajor: CoreCatalogMajor.Version1,
      catalogName: coreCatalog.name,
      catalogVersion: `${coreCatalog.version}-different`,
      tagName: CoreElementTag.Button
    }
  });
  realm.customElements.define(CoreElementTag.Button, DifferentReleaseButton);
  const result = defineSecondCopy(realm.customElements);
  const evidence = {
    differentReleaseRejected: result.status === SecondRegistrationStatus.Rejected,
    diagnosticIsCatalogMismatch:
      result.diagnostics[0]?.code === SecondDiagnosticCode.CatalogMismatch,
    iframeWasNotPartiallyRegistered:
      realm.customElements.get(CoreElementTag.TextField) === undefined
  };
  iframe.remove();
  return evidence;
}

function litBase(constructor: CustomElementConstructor): object | null {
  return Object.getPrototypeOf(Object.getPrototypeOf(constructor)) as object | null;
}
