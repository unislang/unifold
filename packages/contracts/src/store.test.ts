import { expect, it } from "vitest";

import {
  DATA_CLASSIFICATION_ORDER,
  DataClassification,
  UiStoreAccess,
  UiStoreInitialDataPolicy,
  UiStoreOwnership,
  UiStorePersistence,
  UiStoreSchemaVersion,
  UiStoreSourceKind,
  maximumDataClassification
} from "./store.js";

it("exposes enum-backed store policy values", () => {
  expect(DataClassification.Confidential).toBe("confidential");
  expect(DataClassification.NeverExport).toBe("never-export");
  expect(DataClassification.Restricted).toBe("restricted");
  expect(UiStoreAccess.ReadWriteDraft).toBe("read-write-draft");
  expect(UiStoreInitialDataPolicy.Required).toBe("required");
  expect(UiStoreOwnership.RemoteQuery).toBe("remote-query");
  expect(UiStoreOwnership.Runtime).toBe("runtime");
  expect(UiStorePersistence.Local).toBe("local");
  expect(UiStorePersistence.Memory).toBe("memory");
  expect(UiStorePersistence.Session).toBe("session");
  expect(UiStoreSchemaVersion.Version1).toBe("1.0.0");
  expect(UiStoreSourceKind.Local).toBe("local");
  expect(UiStoreSourceKind.Query).toBe("query");
  expect(UiStoreSourceKind.Route).toBe("route");
});

it("defines an exact least-to-most-restrictive classification order", () => {
  expect(DATA_CLASSIFICATION_ORDER).toEqual([
    DataClassification.Public,
    DataClassification.Internal,
    DataClassification.Confidential,
    DataClassification.Restricted,
    DataClassification.NeverExport
  ]);
  expect(Object.isFrozen(DATA_CLASSIFICATION_ORDER)).toBe(true);
});

it("selects the most restrictive classification for every pair", () => {
  const cases = DATA_CLASSIFICATION_ORDER.flatMap((left, leftIndex) =>
    DATA_CLASSIFICATION_ORDER.map((right, rightIndex) => ({
      expected: DATA_CLASSIFICATION_ORDER[Math.max(leftIndex, rightIndex)],
      left,
      right
    }))
  );
  cases.forEach(({ expected, left, right }) => {
    expect(maximumDataClassification([left, right])).toBe(expected);
  });
  expect(maximumDataClassification([])).toBe(DataClassification.Public);
});
