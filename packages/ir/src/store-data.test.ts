import { UiStoreInitialDataPolicy } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import { StoreInputStatus } from "./enums.js";
import { customerStore } from "./store-validation.test-data.js";
import { validateStoreInput } from "./store-data.js";

it("accepts schema-valid data within the declared version and byte limits", () => {
  expect(validateStoreInput(customerStore(), "2.1.0", { name: "Ada" }).status).toBe(
    StoreInputStatus.Valid
  );
  expect(
    validateStoreInput(
      customerStore({ initialData: UiStoreInitialDataPolicy.Optional }),
      "2.1.0",
      undefined
    ).status
  ).toBe(StoreInputStatus.Valid);
  expect(
    validateStoreInput(
      customerStore({ initialData: UiStoreInitialDataPolicy.Forbidden }),
      "2.1.0",
      undefined
    ).status
  ).toBe(StoreInputStatus.Valid);
});

it("rejects missing, forbidden, corrupt, oversized, and version-mismatched data", () => {
  expect(validateStoreInput(customerStore(), "2.1.0", undefined).status).toBe(
    StoreInputStatus.Missing
  );
  const forbidden = customerStore({ initialData: UiStoreInitialDataPolicy.Forbidden });
  expect(validateStoreInput(forbidden, "2.1.0", { name: "Ada" }).status).toBe(
    StoreInputStatus.Forbidden
  );
  expect(validateStoreInput(customerStore(), "2.1.0", { name: 42 }).status).toBe(
    StoreInputStatus.Invalid
  );
  const limited = customerStore({ maxBytes: 2 });
  expect(validateStoreInput(limited, "2.1.0", { name: "Ada" }).status).toBe(
    StoreInputStatus.QuotaExceeded
  );
  expect(validateStoreInput(customerStore(), "3.0.0", { name: "Ada" }).status).toBe(
    StoreInputStatus.VersionMismatch
  );
});

it("rejects non-JSON-safe adapter values without throwing", () => {
  const cyclic: Record<string, unknown> = { name: "Ada" };
  cyclic["self"] = cyclic;
  const throwing = Object.defineProperty({}, "name", {
    enumerable: true,
    get: () => {
      throw new Error("secret adapter failure");
    }
  });

  for (const value of [cyclic, new Date(), Number.NaN, throwing]) {
    expect(validateStoreInput(customerStore(), "2.1.0", value).status).toBe(
      StoreInputStatus.Invalid
    );
  }
});
