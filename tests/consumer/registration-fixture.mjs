import assert from "node:assert/strict";
import { cp, lstat, mkdir, realpath } from "node:fs/promises";
import { join } from "node:path";

export const registrationExternalDependencies = Object.freeze({
  "@lucide/icons": "1.34.0",
  lit: "3.3.1"
});

const copyNames = Object.freeze(["first", "second"]);

export async function createPhysicalRegistrationCopies(consumerRoot) {
  const source = await realpath(
    join(consumerRoot, "node_modules", "@unislang", "unifold-elements")
  );
  const copyRoot = join(consumerRoot, "physical-copies");
  await mkdir(copyRoot, { recursive: true });
  const copies = await Promise.all(
    copyNames.map(async (name) => copyPhysicalPackage(source, join(copyRoot, name)))
  );
  assert.notEqual(copies[0], copies[1], "Registration copies resolved to one physical path.");
  return copies;
}

async function copyPhysicalPackage(source, target) {
  await cp(source, target, { recursive: true });
  const metadata = await lstat(target);
  assert(metadata.isDirectory(), `${target} is not a package directory.`);
  assert(!metadata.isSymbolicLink(), `${target} is not a physical package copy.`);
  return realpath(target);
}
