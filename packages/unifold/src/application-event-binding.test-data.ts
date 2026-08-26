import {
  UiComponentEventBinding,
  UiMachineSchemaVersion,
  type JsonObject
} from "@unislang/unifold-contracts";

import { authoredDocument } from "./application.test-data.js";

export function eventBoundMachineDocument(): JsonObject {
  return {
    ...authoredDocument("1", { button: true }),
    machines: [
      {
        id: "details-workflow",
        initial: "closed",
        ownerId: "form",
        schemaVersion: UiMachineSchemaVersion.Version1,
        states: { closed: { on: { DETAILS_OPEN: { target: "open" } } }, open: {} },
        version: "1.0.0"
      }
    ],
    view: {
      $children: [
        { $comp: "TextField", id: "name", label: "Name", name: "name", value: "" },
        {
          $comp: "Button",
          events: { [UiComponentEventBinding.Activated]: "DETAILS_OPEN" },
          id: "details",
          label: "Details"
        }
      ],
      $comp: "Form",
      id: "form",
      label: "Profile"
    }
  };
}
