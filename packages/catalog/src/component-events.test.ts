import { CoreComponentType, UiComponentEventBinding } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { getCoreComponentEvents } from "./component-events.js";

it("declares supported workflow signals for every component", () => {
  expect(Object.values(CoreComponentType).map(getCoreComponentEvents)).toHaveLength(30);
  expect(getCoreComponentEvents(CoreComponentType.Button)).toEqual([
    UiComponentEventBinding.Activated
  ]);
  expect(getCoreComponentEvents(CoreComponentType.TextField)).toEqual([
    UiComponentEventBinding.Input,
    UiComponentEventBinding.Blurred
  ]);
  expect(getCoreComponentEvents("Unknown")).toEqual([]);
});
