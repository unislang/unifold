// @vitest-environment happy-dom
import { CoreElementTag } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { defineOptionalElement } from "./optional-element-registration.js";

it("defines an optional family idempotently and rejects an unavailable registry", () => {
  class OptionalElement extends HTMLElement {}
  const first = defineOptionalElement(CoreElementTag.Tooltip, OptionalElement, customElements);
  const second = defineOptionalElement(CoreElementTag.Tooltip, OptionalElement, customElements);
  expect(first).toMatchObject({ definedTags: [CoreElementTag.Tooltip], status: "registered" });
  expect(second).toMatchObject({ definedTags: [], status: "registered" });
  expect(defineOptionalElement(CoreElementTag.AuditLog, OptionalElement, null).status).toBe(
    "rejected"
  );
});

it("rejects occupied and reused registry definitions", () => {
  class OptionalElement extends HTMLElement {}
  class ForeignElement extends HTMLElement {}
  const occupied = {
    define: () => undefined,
    get: () => ForeignElement
  };
  expect(defineOptionalElement(CoreElementTag.AuditLog, OptionalElement, occupied).status).toBe(
    "rejected"
  );

  class ReusedElement extends HTMLElement {}
  const reused = {
    define: () => undefined,
    get: () => undefined,
    getName: () => "already-defined"
  };
  expect(defineOptionalElement(CoreElementTag.DataGrid, ReusedElement, reused).status).toBe(
    "rejected"
  );
});

it("rejects failed and incompatible registry definitions", () => {
  class FailingElement extends HTMLElement {}
  const failing = {
    define: () => {
      throw new Error("denied");
    },
    get: () => undefined,
    getName: () => null
  };
  expect(defineOptionalElement(CoreElementTag.SearchResults, FailingElement, failing).status).toBe(
    "rejected"
  );

  class WrongTagElement extends HTMLElement {}
  defineOptionalElement(CoreElementTag.Tooltip, WrongTagElement, null);
  const wrongTag = { define: () => undefined, get: () => WrongTagElement };
  expect(defineOptionalElement(CoreElementTag.Wizard, WrongTagElement, wrongTag).status).toBe(
    "rejected"
  );
});

it("supports registries without constructor-name lookup and reports non-Error failures", () => {
  class OptionalElement extends HTMLElement {}
  const defined: string[] = [];
  const registry = {
    define: (name: string) => defined.push(name),
    get: () => undefined
  };
  expect(defineOptionalElement(CoreElementTag.Stepper, OptionalElement, registry).status).toBe(
    "registered"
  );
  expect(defined).toEqual([CoreElementTag.Stepper]);

  class FailingElement extends HTMLElement {}
  const failing = {
    define: () => {
      throw "denied";
    },
    get: () => undefined
  };
  expect(defineOptionalElement(CoreElementTag.Tabs, FailingElement, failing).status).toBe(
    "rejected"
  );
});

it("rejects a marked constructor from an incompatible catalog release", () => {
  class IncompatibleElement extends HTMLElement {}
  Object.defineProperty(IncompatibleElement, Symbol.for("org.unifold.element-definition"), {
    value: {
      catalogMajor: "2",
      catalogName: "foreign-catalog",
      catalogVersion: "2.0.0",
      tagName: CoreElementTag.VirtualList
    }
  });
  const registry = { define: () => undefined, get: () => IncompatibleElement };
  const result = defineOptionalElement(CoreElementTag.VirtualList, IncompatibleElement, registry);
  expect(result.status).toBe("rejected");
  expect(result.diagnostics[0]?.code).toBe("element-catalog-mismatch");
});
