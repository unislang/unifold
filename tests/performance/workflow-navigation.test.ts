// @vitest-environment happy-dom
import { expect, it } from "vitest";

import {
  disposeWorkflow,
  exerciseWorkflow,
  mountWorkflow,
  WORKFLOW_BUTTON_LIMIT
} from "./workflow-navigation-fixture.js";

it("selects distant workflow state and invokes the final menu item within exact bounded DOM", async () => {
  const mounted = await mountWorkflow();
  try {
    const evidence = await exerciseWorkflow(mounted);
    expect(evidence.renderedButtons).toBeLessThanOrEqual(WORKFLOW_BUTTON_LIMIT);
    expect(evidence.menuItemId).toBe("item-099");
    expect(evidence.menuTriggerFocused).toBe(true);
    expect(evidence.popoverFocused).toBe(true);
    expect(evidence.popoverOpen).toBe(true);
    expect(evidence.stepperValue).toBe("step-099");
    expect(evidence.tabValue).toBe("tab-099");
    expect(evidence.wizardValue).toBe("step-099");
    expect(evidence.visiblePanels).toBe(1);
    expect(evidence.visibleTabPanels).toBe(1);
  } finally {
    disposeWorkflow(mounted);
  }
});
