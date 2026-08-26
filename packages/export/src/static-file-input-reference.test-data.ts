import type { JsonObject } from "@unislang/unifold-contracts";

export function referenceFileInputNode(): JsonObject {
  return {
    $comp: "FileInput",
    accept: ".pdf,application/pdf",
    id: "attachments",
    label: "Attachments",
    multiple: true,
    name: "attachments",
    value: []
  };
}
