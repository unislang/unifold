import { CoreComponentType } from "@unislang/unifold-contracts";

import { definition, exampleNode } from "./definition-sidecar-helpers.js";
import { ComponentAccessibilityPattern } from "./definition-enums.js";
import type { ComponentDefinitionSidecar } from "./types.js";

export const fileInputSidecar: ComponentDefinitionSidecar = definition({
  behaviors: [
    "Uses a native file input without serializing file bytes into portable JSON",
    "Emits only bounded opaque ID, media type, size, and count metadata",
    "Resolves selected File objects by opaque ID only for a trusted upload adapter",
    "Rejects disallowed media types, oversized files, and selections over the fixed count ceiling"
  ],
  browserScenarios: ["selects bounded files without admitting bytes into canonical JSON state"],
  componentType: CoreComponentType.FileInput,
  example: exampleNode(CoreComponentType.FileInput, "attachments", {
    accept: ".pdf,image/*",
    label: "Supporting files",
    maximumFileBytes: 10 * 1024 * 1024,
    multiple: true,
    name: "attachments"
  }),
  pattern: ComponentAccessibilityPattern.NativeFileInput,
  purpose:
    "Select bounded local files through native browser semantics while keeping bytes outside JSON state.",
  requirementIds: [
    "A11Y.FILE_INPUT.NATIVE",
    "EVENT.CONTROL.INPUT",
    "SECURITY.FILE_INPUT.NO_BYTES_IN_JSON",
    "SECURITY.FILE_INPUT.BOUNDED_SELECTION"
  ],
  semanticAttachmentPoints: [],
  sensitiveProperties: ["accept", "errorMessage", "label", "value"]
});
