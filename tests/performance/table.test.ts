// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { TABLE_ROW_COUNT, disposeTable, mountTable } from "./table-fixture.js";

it("mounts 1,000 JSON rows with complete native table semantics", async () => {
  const mounted = await mountTable();
  try {
    const root = mounted.element.shadowRoot as ShadowRoot;
    expect(root.querySelectorAll("tbody tr")).toHaveLength(TABLE_ROW_COUNT);
    expect(root.querySelectorAll('th[scope="col"]')).toHaveLength(2);
    expect(root.querySelectorAll('th[scope="row"]')).toHaveLength(TABLE_ROW_COUNT);
    expect(mounted.element.rows).toHaveLength(TABLE_ROW_COUNT);
  } finally {
    disposeTable(mounted);
  }
});
