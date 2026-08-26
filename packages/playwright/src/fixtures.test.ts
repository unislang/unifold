import { expect, it, vi } from "vitest";

const extend = vi.hoisted(() => vi.fn((fixtures) => fixtures));
const install = vi.hoisted(() => vi.fn(async () => undefined));
const installNavigation = vi.hoisted(() => vi.fn());

vi.mock("@playwright/test", () => ({
  expect: Symbol("expect"),
  test: { extend }
}));
vi.mock("../src/browser-capture.js", () => ({ installEventCapture: install }));
vi.mock("../src/settled-navigation.js", () => ({ installSettledNavigation: installNavigation }));

it("installs capture before exposing the Unifold fixture", async () => {
  const module = await import("../src/fixtures.js");
  const fixtures = module.test as unknown as {
    unifold: readonly [
      (context: { page: object }, use: (harness: object) => Promise<void>) => Promise<void>,
      { readonly auto: boolean }
    ];
  };
  const page = {};
  const use = vi.fn(async () => undefined);
  await fixtures.unifold[0]({ page }, use);
  expect(install).toHaveBeenCalledWith(page);
  expect(installNavigation).toHaveBeenCalledWith(page);
  expect(fixtures.unifold[1]).toEqual({ auto: true });
  expect(use).toHaveBeenCalledTimes(1);
});
