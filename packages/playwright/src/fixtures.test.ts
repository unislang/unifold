import { expect, it, vi } from "vitest";

const extend = vi.hoisted(() => vi.fn((fixtures) => fixtures));
const install = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@playwright/test", () => ({
  expect: Symbol("expect"),
  test: { extend }
}));
vi.mock("../src/browser-capture.js", () => ({ installEventCapture: install }));

it("installs capture before exposing the Unifold fixture", async () => {
  const module = await import("../src/fixtures.js");
  const fixtures = module.test as unknown as {
    unifold: (context: { page: object }, use: (harness: object) => Promise<void>) => Promise<void>;
  };
  const page = {};
  const use = vi.fn(async () => undefined);
  await fixtures.unifold({ page }, use);
  expect(install).toHaveBeenCalledWith(page);
  expect(use).toHaveBeenCalledTimes(1);
});
