// @vitest-environment happy-dom
import { expect, it } from "vitest";

import {
  disposeWorkflow,
  exerciseWorkflow,
  mountWorkflow,
  WORKFLOW_BUTTON_LIMIT
} from "./workflow-navigation-fixture.js";

it("selects distant Stepper, Wizard, and Tabs state within exact bounded DOM", async () => {
  const mounted = await mountWorkflow();
  try {
    const evidence = await exerciseWorkflow(mounted);
    expect(evidence.renderedButtons).toBeLessThanOrEqual(WORKFLOW_BUTTON_LIMIT);
    expect(evidence.stepperValue).toBe("step-099");
    expect(evidence.tabValue).toBe("tab-099");
    expect(evidence.wizardValue).toBe("step-099");
    expect(evidence.visiblePanels).toBe(1);
    expect(evidence.visibleTabPanels).toBe(1);
  } finally {
    disposeWorkflow(mounted);
  }
});
