// @vitest-environment happy-dom
import type { AuditLogEntry } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineUnifoldAuditLog, UnifoldAuditLog } from "./audit-log-entry.js";

it("renders an escaped, authored-order audit timeline with native time semantics", async () => {
  const audit = configuredAudit(2);
  document.body.append(audit);
  await audit.updateComplete;
  const root = audit.shadowRoot as ShadowRoot;

  expect(requireElement(root, "section").getAttribute("role")).toBeNull();
  expect(root.querySelectorAll("li")).toHaveLength(2);
  expect((requireElement(root, "li") as HTMLElement).dataset["entryId"]).toBe("event-0");
  expect(requireElement(root, "time").getAttribute("datetime")).toBe("2026-08-25T12:00:00Z");
  expect(root.textContent).toContain('<img src=x onerror="alert(1)">');
  expect(root.querySelector("img")).toBeNull();
});

it("bounds a 10k history, follows scroll, and exposes collection positions", async () => {
  const audit = configuredAudit(10_000);
  Object.assign(audit, { itemHeight: 1, overscan: 100, viewportHeight: 1_000 });
  document.body.append(audit);
  await audit.updateComplete;
  const root = audit.shadowRoot as ShadowRoot;
  expect(root.querySelectorAll("li")).toHaveLength(200);

  const viewport = requireElement(root, '[part="viewport"]') as HTMLElement;
  viewport.scrollTop = 9_000;
  viewport.dispatchEvent(new Event("scroll"));
  await audit.updateComplete;
  expect(root.querySelector("li")?.getAttribute("aria-posinset")).toBe("8901");
  expect(root.querySelector("li")?.getAttribute("aria-setsize")).toBe("10000");
});

it("renders one deterministic empty-history message", async () => {
  const audit = configuredAudit(0);
  audit.emptyMessage = "Nothing recorded";
  document.body.append(audit);
  await audit.updateComplete;
  expect(requireElement(audit.shadowRoot as ShadowRoot, '[part="empty"]').textContent).toBe(
    "Nothing recorded"
  );
});

function configuredAudit(count: number): UnifoldAuditLog {
  defineUnifoldAuditLog();
  const audit = document.createElement("unifold-audit-log") as UnifoldAuditLog;
  Object.assign(audit, { entries: entries(count), id: "account-audit", label: "Account history" });
  return audit;
}

function entries(count: number): readonly AuditLogEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    action: "updated",
    actor: `Operator ${index}`,
    correlationId: `request-${index}`,
    id: `event-${index}`,
    summary: `<img src=x onerror="alert(1)"> change ${index}`,
    timestamp: "2026-08-25T12:00:00Z"
  }));
}

function requireElement(root: ShadowRoot, selector: string): Element {
  const element = root.querySelector(selector);
  if (element === null) throw new Error(`Missing ${selector}.`);
  return element;
}
