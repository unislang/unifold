import { DataClassification, type JsonObject } from "@unislang/unifold-contracts";

import { classifiedVirtualListDocument, documentWithView } from "./static-html.test-data.js";

export function largeMasterDetailDocument(count = 205): JsonObject {
  return documentWithView(masterDetailNode(count));
}

export function classifiedMasterDetailDocument(classification: DataClassification): JsonObject {
  return {
    ...classifiedVirtualListDocument(classification),
    view: { ...masterDetailNode(2), path: "/name", store: "profile", value: "ada" }
  };
}

function masterDetailNode(count: number): JsonObject {
  return {
    $comp: "MasterDetail",
    columns: [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" }
    ],
    detailLabel: "Account details",
    id: "accounts",
    label: "Accounts",
    masterColumn: "name",
    rows: masterRows(count),
    value: count > 200 ? `record-${count - 1}` : "ada"
  };
}

function masterRows(count: number): readonly JsonObject[] {
  if (count === 2)
    return [
      { cells: { name: "Ada", status: "Active" }, id: "ada" },
      { cells: { name: "Grace", status: "Pending" }, id: "grace" }
    ];
  return Array.from({ length: count }, (_, index) => ({
    cells: { name: `Record ${index}`, status: `<script>${index}</script>` },
    id: `record-${index}`
  }));
}
