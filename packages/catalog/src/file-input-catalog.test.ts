import { CoreComponentType } from "@unislang/unifold-contracts";
import { expect, it } from "vitest";

import {
  DEFAULT_MAXIMUM_FILE_BYTES,
  MAXIMUM_FILE_COUNT,
  fileInputDescriptor,
  isValidFileAccept
} from "./file-input-catalog.js";

it("defines bounded FileInput metadata and native accept contracts", () => {
  expect(fileInputDescriptor).toMatchObject({
    componentType: CoreComponentType.FileInput,
    tagName: "unifold-file-input"
  });
  expect(fileInputDescriptor.properties).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ defaultValue: [], name: "value" }),
      expect.objectContaining({
        defaultValue: DEFAULT_MAXIMUM_FILE_BYTES,
        name: "maximumFileBytes"
      })
    ])
  );
  expect(MAXIMUM_FILE_COUNT).toBe(32);
  expect(isValidFileAccept(".pdf,image/*,application/json")).toBe(true);
  expect(isValidFileAccept("")).toBe(true);
  expect(isValidFileAccept("image, javascript:alert(1)")).toBe(false);
  expect(isValidFileAccept(Array.from({ length: 33 }, () => ".txt").join(","))).toBe(false);
});
