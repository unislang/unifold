import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createPhysicalRegistrationCopies,
  registrationExternalDependencies
} from "./registration-fixture.mjs";

test("creates two physical copies of the installed element artifact", async () => {
  const root = await mkdtemp(join(tmpdir(), "unifold-registration-fixture-"));
  try {
    const source = join(root, "node_modules", "@unislang", "unifold-elements");
    await mkdir(source, { recursive: true });
    await writeFile(join(source, "package.json"), "{}\n");
    const copies = await createPhysicalRegistrationCopies(root);
    assert.equal(copies.length, 2);
    assert.notEqual(copies[0], copies[1]);
    assert.deepEqual(registrationExternalDependencies, {
      "@lucide/icons": "1.34.0",
      lit: "3.3.1"
    });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
