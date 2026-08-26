import { expect, it, vi } from "vitest";

import { createWebStorageStoreAdapter, type UiWebStoragePort } from "./web-storage-adapter.js";

it("loads and writes a versioned JSON envelope through an injected storage port", () => {
  const fixture = storageFixture();
  const adapter = createWebStorageStoreAdapter(fixture.storage, "customer", "2.1.0");
  expect(adapter.load()).toBeUndefined();

  adapter.write?.("/profile/name", "Ada");
  expect(JSON.parse(requireStored(fixture.values))).toEqual({
    value: { profile: { name: "Ada" } },
    version: "2.1.0"
  });
  expect(createWebStorageStoreAdapter(fixture.storage, "customer", "2.1.0").load()).toEqual({
    profile: { name: "Ada" }
  });

  adapter.write?.("", { profile: { name: "Grace" } });
  expect(adapter.load()).toEqual({ profile: { name: "Grace" } });
});

it("rejects malformed, incompatible, unsafe, and failed storage operations generically", () => {
  const fixture = storageFixture("not-json");
  const adapter = createWebStorageStoreAdapter(fixture.storage, "customer", "2.1.0");
  expect(() => adapter.load()).toThrow("Web Storage store failed to load.");

  fixture.values.set("customer", JSON.stringify({ value: {}, version: "3.0.0" }));
  expect(() => adapter.load()).toThrow("Web Storage store failed to load.");
  expect(() => adapter.write?.("/__proto__/polluted", true)).toThrow(
    "Web Storage store failed to write."
  );

  const failedRead = createWebStorageStoreAdapter(failedReadStorage(), "customer", "2.1.0");
  const failedWrite = createWebStorageStoreAdapter(failedWriteStorage(), "customer", "2.1.0");
  expect(() => failedRead.load()).toThrow("Web Storage store failed to load.");
  expect(() => failedWrite.write?.("", {})).toThrow("Web Storage store failed to write.");
});

it("rejects invalid configuration and asynchronous storage writes", () => {
  const fixture = storageFixture();
  expect(() => createWebStorageStoreAdapter(fixture.storage, "", "2.1.0")).toThrow(
    "Web Storage key is invalid."
  );
  expect(() => createWebStorageStoreAdapter(fixture.storage, "customer", "")).toThrow(
    "Web Storage version is invalid."
  );
  const storage = {
    getItem: () => null,
    setItem: (() => Promise.reject(new Error("secret"))) as never
  };
  const adapter = createWebStorageStoreAdapter(storage, "customer", "2.1.0");
  expect(() => adapter.write?.("", {})).toThrow("Web Storage store failed to write.");
});

function storageFixture(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set("customer", initial);
  const storage: UiWebStoragePort = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value)
  };
  return { storage, values };
}

function requireStored(values: ReadonlyMap<string, string>): string {
  const value = values.get("customer");
  if (value === undefined) throw new Error("Stored fixture is missing.");
  return value;
}

function failedReadStorage(): UiWebStoragePort {
  return {
    getItem: vi.fn(() => {
      throw new Error("secret read detail");
    }),
    setItem: vi.fn()
  };
}

function failedWriteStorage(): UiWebStoragePort {
  return {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => {
      throw new Error("secret write detail");
    })
  };
}
