import {
  UiControlNodeKind,
  UiControlTopologyVersion,
  type JsonObject
} from "@unislang/unifold-contracts";

import { CompositionContractVersion } from "./enums.js";
import { applicationView } from "./expander.test-data.js";
import type { CompositionDefinition } from "./types.js";

export function addressDefinition(
  overrides: Partial<CompositionDefinition> = {}
): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version2,
    controls: addressControls(),
    exports: {},
    name: "AddressEditor",
    parameters: {},
    slots: [],
    template: addressTemplate(),
    version: "1.0.0",
    ...overrides
  };
}

function addressControls() {
  return {
    contractVersion: UiControlTopologyVersion.Version1,
    nodes: [
      { id: "form", kind: UiControlNodeKind.Form },
      { id: "street", key: "street", kind: UiControlNodeKind.Control, parentId: "form" }
    ]
  };
}

function addressTemplate(): JsonObject {
  return {
    $children: [
      {
        $children: [{ $comp: "TextField", id: "street", name: "street" }],
        $comp: "Form",
        id: "form"
      }
    ],
    $comp: "Composition",
    id: "root"
  };
}

export function addressInstance(id: string): JsonObject {
  return { $compose: "AddressEditor", $version: "1.0.0", id };
}

export function profileDefinition(parentId = "form"): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version2,
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [{ id: "form", kind: UiControlNodeKind.Form }]
    },
    exports: {},
    name: "ProfileEditor",
    parameters: {},
    slots: [],
    template: {
      $children: [
        { $comp: "Form", id: "form" },
        {
          $compose: "AddressGroup",
          $version: "1.0.0",
          controlMount: { key: "address", parentId },
          id: "address"
        }
      ],
      $comp: "Composition",
      id: "root"
    },
    version: "1.0.0"
  };
}

export function addressGroupDefinition(): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version2,
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [
        { id: "group", kind: UiControlNodeKind.Group },
        { id: "street", key: "street", kind: UiControlNodeKind.Control, parentId: "group" }
      ]
    },
    exports: {},
    name: "AddressGroup",
    parameters: {},
    slots: [],
    template: {
      $children: [{ $comp: "TextField", id: "street", name: "street" }],
      $comp: "Composition",
      id: "group"
    },
    version: "1.0.0"
  };
}

export function profileInstance(): JsonObject {
  return { $compose: "ProfileEditor", $version: "1.0.0", id: "profile" };
}

export function slottedProfileDefinition(): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version2,
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [{ id: "form", kind: UiControlNodeKind.Form }]
    },
    exports: {},
    name: "SlottedProfile",
    parameters: {},
    slots: [{ multiple: false, name: "content", required: true }],
    template: {
      $children: [{ $children: [{ $slot: "content" }], $comp: "Form", id: "form" }],
      $comp: "Composition",
      id: "root"
    },
    version: "1.0.0"
  };
}

export function slottedProfileInstance(): JsonObject {
  return {
    $compose: "SlottedProfile",
    $version: "1.0.0",
    id: "profile",
    slots: {
      content: [
        {
          $compose: "AddressGroup",
          $version: "1.0.0",
          controlMount: { key: "address", parentId: "form" },
          id: "address"
        }
      ]
    }
  };
}

export function plainView(): JsonObject {
  return applicationView({ $comp: "Text", id: "content" });
}

export function addressFragmentDefinition(): CompositionDefinition {
  return addressDefinition({
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [
        { id: "group", kind: UiControlNodeKind.Group },
        { id: "street", key: "street", kind: UiControlNodeKind.Control, parentId: "group" }
      ]
    },
    template: {
      $children: [
        {
          $children: [{ $comp: "TextField", id: "street", name: "street" }],
          $comp: "Stack",
          id: "group"
        }
      ],
      $comp: "Composition",
      id: "root"
    }
  });
}

export function outerDefinition(
  parentKind: UiControlNodeKind = UiControlNodeKind.Group
): CompositionDefinition {
  return {
    contractVersion: CompositionContractVersion.Version2,
    controls: {
      contractVersion: UiControlTopologyVersion.Version1,
      nodes: [
        { id: "form", kind: UiControlNodeKind.Form },
        { id: "addresses", key: "addresses", kind: parentKind, parentId: "form" }
      ]
    },
    exports: {},
    name: "Outer",
    parameters: {},
    slots: [],
    template: outerTemplate(),
    version: "1"
  };
}

function outerTemplate(): JsonObject {
  return {
    $children: [
      {
        $children: [
          {
            $compose: "AddressEditor",
            $version: "1.0.0",
            controlMount: { key: "billing", parentId: "addresses" },
            id: "address"
          },
          { $comp: "Stack", id: "addresses" }
        ],
        $comp: "Form",
        id: "form"
      }
    ],
    $comp: "Composition",
    id: "root"
  };
}
