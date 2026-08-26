import { expect, it } from "vitest";

import { ComponentStatus, getComponentDefinitionSidecar } from "./index.js";
import { CoreComponentType } from "@unislang/unifold-contracts";

it("exports the reviewed component-definition boundary", () => {
  expect(getComponentDefinitionSidecar(CoreComponentType.Button)?.status).toBe(
    ComponentStatus.Experimental
  );
});
