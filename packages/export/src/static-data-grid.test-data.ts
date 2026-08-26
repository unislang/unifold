import type { JsonObject } from "@unislang/unifold-contracts";

import { documentWithView } from "./static-html.test-data.js";

export function dataGridStaticDocument(): JsonObject {
  return documentWithView({
    $comp: "DataGrid",
    caption: "People <script>",
    columns: [
      { key: "name", label: "Name" },
      { key: "age", label: "Age" }
    ],
    errorMessage: "Review <unsafe>",
    id: "people-grid",
    rows: [
      { cells: { age: 41, name: "Grace <strong>unsafe</strong>" }, id: "grace" },
      { cells: { age: 37, name: "Ada" }, id: "ada" }
    ],
    selectionMode: "multiple",
    sortableColumns: ["name"],
    value: {
      selectedRowIds: ["ada"],
      sort: { direction: "ascending", key: "name" }
    }
  });
}
