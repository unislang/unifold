import { expectTypeOf, it } from "vitest";

import { ElementRegistrationStatus } from "./enums.js";
import type {
  ElementRegistrationResult,
  RegisteredElementsResult,
  RejectedElementsResult
} from "./register-types.js";

it("keeps element registration results discriminated by status", () => {
  expectTypeOf<
    RegisteredElementsResult["status"]
  >().toEqualTypeOf<ElementRegistrationStatus.Registered>();
  expectTypeOf<
    RejectedElementsResult["status"]
  >().toEqualTypeOf<ElementRegistrationStatus.Rejected>();
  expectTypeOf<ElementRegistrationResult>().toEqualTypeOf<
    RegisteredElementsResult | RejectedElementsResult
  >();
});
