import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import * as dataViews from "./data-view-catalog.js";

it("exports the stable enterprise data-view descriptors", () => {
  expect(Object.values(dataViews).map(({ componentType }) => componentType)).toEqual([
    CoreComponentType.AuditLog,
    CoreComponentType.DataGrid,
    CoreComponentType.MasterDetail,
    CoreComponentType.SearchResults,
    CoreComponentType.Table
  ]);
});
