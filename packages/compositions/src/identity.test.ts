import { expect, it } from "vitest";

import { CompositionIdentitySegmentKind } from "./enums.js";
import {
  compositionSlotNamespace,
  decodeCompositionIdSegment,
  decodeExpandedCompositionId,
  encodeCompositionIdSegment,
  namespacedCompositionId
} from "./identity.js";

it("round-trips canonical composition identity segments without aliases", () => {
  const values = ["field", "profile::editor", "slot:actions", "50%", "\u540d\u524d::\u6b04"];
  const encoded = values.map(encodeCompositionIdSegment);
  expect(encoded).toEqual([
    "field",
    "profile%3A%3Aeditor",
    "slot%3Aactions",
    "50%25",
    "%E5%90%8D%E5%89%8D%3A%3A%E6%AC%84"
  ]);
  expect(encoded.map(decodeCompositionIdSegment)).toEqual(values);
  expect(new Set(encoded).size).toBe(values.length);
});

it("builds and decodes node and slot namespaces", () => {
  const root = namespacedCompositionId(undefined, "profile::editor");
  const slot = compositionSlotNamespace(root, "actions::primary");
  const leaf = namespacedCompositionId(slot, "slot:save%now");
  expect(leaf).toBe("profile%3A%3Aeditor::slot:actions%3A%3Aprimary::slot%3Asave%25now");
  expect(decodeExpandedCompositionId(leaf)).toEqual([
    { kind: CompositionIdentitySegmentKind.Node, value: "profile::editor" },
    { kind: CompositionIdentitySegmentKind.Slot, value: "actions::primary" },
    { kind: CompositionIdentitySegmentKind.Node, value: "slot:save%now" }
  ]);
});

it("rejects empty, malformed, noncanonical, and ambiguous decoded identities", () => {
  expect(encodeCompositionIdSegment("")).toBe("");
  expect(decodeCompositionIdSegment("")).toBeUndefined();
  expect(decodeCompositionIdSegment("bad%2Fescape")).toBe("bad/escape");
  expect(decodeCompositionIdSegment("bad%2fescape")).toBeUndefined();
  expect(decodeCompositionIdSegment("bad%GGescape")).toBeUndefined();
  expect(decodeCompositionIdSegment("raw:colon")).toBeUndefined();
  expect(decodeExpandedCompositionId("root::::leaf")).toBeUndefined();
  expect(decodeExpandedCompositionId("root::slot:")).toBeUndefined();
});
