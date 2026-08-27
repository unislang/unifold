import { expect, it, vi } from "vitest";

import { createApplicationRenderer } from "./application-renderer.js";

it("exposes element lookup without renderer mutation capabilities", () => {
  const element = {} as HTMLElement;
  const renderer = {
    dispose: vi.fn(),
    getElement: vi.fn(() => element),
    project: vi.fn(),
    update: vi.fn(),
    validate: vi.fn()
  };
  const facade = createApplicationRenderer(renderer as never);
  expect(facade.getElement("name")).toBe(element);
  expect(facade).not.toHaveProperty("renderer");
  expect(facade).not.toHaveProperty("update");
  expect(facade).not.toHaveProperty("project");
  expect(facade).not.toHaveProperty("dispose");
  expect(Reflect.ownKeys(facade)).not.toContain("renderer");
  expect(Object.isFrozen(facade)).toBe(true);
});
