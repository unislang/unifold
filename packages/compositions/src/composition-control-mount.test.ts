import { UiControlNodeKind, UiControlTopologyVersion } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  addressDefinition,
  addressFragmentDefinition,
  addressGroupDefinition,
  addressInstance,
  outerDefinition,
  plainView,
  profileDefinition,
  profileInstance,
  slottedProfileDefinition,
  slottedProfileInstance
} from "./composition-control-topology.test-data.js";
import { CompositionContractVersion, CompositionDiagnosticCode } from "./enums.js";
import { expandComposedUiDocument } from "./expander.js";
import { applicationView, composedDocument } from "./expander.test-data.js";

it("namespaces complete local form topologies for every instance", () => {
  const result = expandAddressInstances();

  expect(result.document?.["controls"]).toEqual({
    contractVersion: UiControlTopologyVersion.Version1,
    nodes: [
      { id: "billing::form", kind: UiControlNodeKind.Form },
      {
        id: "billing::street",
        key: "street",
        kind: UiControlNodeKind.Control,
        parentId: "billing::form"
      },
      { id: "shipping::form", kind: UiControlNodeKind.Form },
      {
        id: "shipping::street",
        key: "street",
        kind: UiControlNodeKind.Control,
        parentId: "shipping::form"
      }
    ]
  });
});

function expandAddressInstances() {
  return expandComposedUiDocument(
    composedDocument(
      [addressDefinition()],
      applicationView({
        $children: [addressInstance("billing"), addressInstance("shipping")],
        $comp: "Stack",
        id: "addresses"
      })
    )
  );
}

it("resolves a fragment mount after the caller lexical scope is complete", () => {
  const result = expandComposedUiDocument(
    composedDocument(
      [outerDefinition(), addressFragmentDefinition()],
      applicationView({ $compose: "Outer", $version: "1", id: "editor" })
    )
  );

  expect(result.document?.["controls"]).toMatchObject({
    nodes: [
      { id: "editor::form" },
      { id: "editor::addresses", parentId: "editor::form" },
      { id: "editor::address::group", key: "billing", parentId: "editor::addresses" },
      { id: "editor::address::street", parentId: "editor::address::group" }
    ]
  });
});

it("attaches nested and slotted topology roots to the receiving definition", () => {
  const nested = expandProfileTopology(false);
  const slotted = expandProfileTopology(true);

  expect(nested.document?.["controls"]).toMatchObject({
    nodes: [
      { id: "profile::form" },
      { id: "profile::address", parentId: "profile::form" },
      { id: "profile::address::street", parentId: "profile::address" }
    ]
  });
  expect(slotted.document?.["controls"]).toMatchObject({
    nodes: [
      { id: "profile::form" },
      { id: "profile::slot:content::address", parentId: "profile::form" },
      {
        id: "profile::slot:content::address::street",
        parentId: "profile::slot:content::address"
      }
    ]
  });
});

function expandProfileTopology(slotted: boolean) {
  const definition = slotted ? slottedProfileDefinition() : profileDefinition();
  const instance = slotted ? slottedProfileInstance() : profileInstance();
  return expandComposedUiDocument(
    composedDocument([definition, addressGroupDefinition()], applicationView(instance))
  );
}

it("rejects an unknown lexical mount parent", () => {
  const result = expandComposedUiDocument(
    composedDocument(
      [profileDefinition("missing"), addressGroupDefinition()],
      applicationView(profileInstance())
    )
  );

  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code: CompositionDiagnosticCode.UnknownControlParent })
  );
});

it("requires composition contract v2 for local topology", () => {
  const result = expandComposedUiDocument(
    composedDocument(
      [addressDefinition({ contractVersion: CompositionContractVersion.Version1 })],
      plainView()
    )
  );

  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({ code: CompositionDiagnosticCode.InvalidDocument })
  );
});

it("rejects mounted forms and unmounted reusable fragments", () => {
  const mountedForm = expandComposedUiDocument(
    composedDocument(
      [addressDefinition()],
      applicationView({
        ...addressInstance("address"),
        controlMount: { key: "x", parentId: "app" }
      })
    )
  );
  const unmountedGroup = expandComposedUiDocument(
    composedDocument([addressFragmentDefinition()], applicationView(addressInstance("address")))
  );

  expect(mountedForm.diagnostics).toContainEqual(
    expect.objectContaining({ code: CompositionDiagnosticCode.InvalidControlMount })
  );
  expect(unmountedGroup.diagnostics).toContainEqual(
    expect.objectContaining({ code: CompositionDiagnosticCode.InvalidControlMount })
  );
});

it("rejects fragment mounts into arrays until order is explicit", () => {
  const result = expandComposedUiDocument(
    composedDocument(
      [outerDefinition(UiControlNodeKind.Array), addressFragmentDefinition()],
      applicationView({ $compose: "Outer", $version: "1", id: "editor" })
    )
  );

  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code: CompositionDiagnosticCode.InvalidControlMount,
      message: "Array mounts require an explicit ordering contract."
    })
  );
});
