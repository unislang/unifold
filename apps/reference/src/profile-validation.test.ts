// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { profileAsyncValidators, profileValidators } from "./profile-validation.js";

it("creates isolated synchronous and asynchronous profile validator registries", () => {
  expect(profileValidators()).not.toBe(profileValidators());
  expect(profileAsyncValidators()).not.toBe(profileAsyncValidators());
});
