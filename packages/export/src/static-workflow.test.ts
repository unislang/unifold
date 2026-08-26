import { expect, it } from "vitest";

import { prepareTestDocument } from "./static-html.test-data.js";
import { renderStaticTree } from "./static-renderer.js";
import { classifiedStepperDocument, publicWizardDocument } from "./static-workflow.test-data.js";

it("renders escaped progress plus every stable Wizard panel with only the current panel visible", () => {
  const html = renderStaticTree(prepareTestDocument(publicWizardDocument()).document);

  expect(html).toContain('aria-label="Create &lt;account&gt;"');
  expect(html).toContain('aria-current="step"');
  expect(html).toContain('aria-labelledby="account-wizard__step_1"');
  expect(html).toContain('data-unifold-static-node-id="account-panel"');
  expect(html).toContain('data-unifold-static-node-id="review-panel"');
  expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; account");
  expect(html).not.toContain("<img src=x");
  expect(html.match(/role="region"[^>]* hidden/gu)).toHaveLength(1);
});

it("emits an empty navigation shell for classified Stepper state", () => {
  const html = renderStaticTree(prepareTestDocument(classifiedStepperDocument()).document);

  expect(html).toContain('<nav aria-label=""><ol></ol></nav>');
  expect(html).not.toContain("Private progress");
  expect(html).not.toContain("Secret step");
});
