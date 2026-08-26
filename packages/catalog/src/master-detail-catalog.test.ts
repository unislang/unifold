import { CoreComponentType, UiUpdateTrigger } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { CatalogConstraintKind, CatalogPropertyType, CoreElementTag } from "./enums.js";
import { masterDetailDescriptor } from "./master-detail-catalog.js";

it("defines the virtualized MasterDetail control contract", () => {
  expect(masterDetailDescriptor).toMatchObject({
    componentType: CoreComponentType.MasterDetail,
    constraints: [
      { kind: CatalogConstraintKind.TableData },
      { kind: CatalogConstraintKind.MasterDetailState }
    ],
    tagName: CoreElementTag.MasterDetail
  });
  expect(masterDetailDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "columns",
        required: true,
        valueType: CatalogPropertyType.TableColumnList
      }),
      expect.objectContaining({ name: "masterColumn", required: true }),
      expect.objectContaining({ defaultValue: "", name: "value" }),
      expect.objectContaining({ defaultValue: 400, name: "viewportHeight" }),
      expect.objectContaining({ defaultValue: UiUpdateTrigger.Input, name: "updateOn" })
    ])
  );
});
