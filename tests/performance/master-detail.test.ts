// @vitest-environment happy-dom
import { expect, it } from "vitest";

import {
  disposeMasterDetail,
  exerciseMasterDetail,
  MASTER_DETAIL_RENDER_LIMIT,
  mountMasterDetail
} from "./master-detail-fixture.js";

it("mounts and selects a detail from 10,000 JSON records with bounded DOM", async () => {
  const mounted = await mountMasterDetail();
  try {
    const evidence = await exerciseMasterDetail(mounted.element);
    expect(evidence.renderedOptions).toBeLessThanOrEqual(MASTER_DETAIL_RENDER_LIMIT);
    expect(evidence.selectedValue).toBe("account-00001");
    expect(evidence.detailText).toContain("Pending");
  } finally {
    disposeMasterDetail(mounted);
  }
});
