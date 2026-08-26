import { expect, it } from "vitest";

import { authoredDocument } from "./application.test-data.js";
import { createApplicationSnapshots } from "./application-snapshots.js";
import { prepareUnifoldDocument } from "./compiler.js";
import { prepareApplicationStores } from "./store-adapters.js";
import { UnifoldPreparationStatus } from "./types.js";

it("uses captured static values as pristine initial state for unbound controls", () => {
  const preparation = prepareUnifoldDocument(authoredDocument());
  if (preparation.status !== UnifoldPreparationStatus.Valid || preparation.prepared === undefined) {
    throw new Error("Snapshot fixture did not compile.");
  }
  const { document } = preparation.prepared;
  const snapshots = createApplicationSnapshots(
    document,
    0,
    prepareApplicationStores(document, {}),
    { name: "Grace" }
  );
  const name = snapshots.find(({ id }) => id === "name");
  expect(name).toMatchObject({
    control: { initialValue: "Grace", pristine: true, rawValue: "Grace", value: "Grace" },
    properties: { value: "Grace" }
  });
});
