import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const artifacts = await readJson(resolve(packageRoot, "fixtures/upstream-artifacts.json"));
const lockfile = await readFile(resolve(workspaceRoot, "pnpm-lock.yaml"), "utf8");

for (const artifact of artifacts.packages) await verifyArtifact(artifact, lockfile);
await verifyProfileRevision(artifacts.profileRevision);
await verifyFixture();

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function verifyArtifact(artifact, lockfileText) {
  const manifestPath = resolve(
    packageRoot,
    "node_modules",
    ...artifact.name.split("/"),
    "package.json"
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.name, artifact.name, `${artifact.name} resolved to the wrong package.`);
  assert.equal(manifest.version, artifact.version, `${artifact.name} version drifted.`);
  assert.equal(manifest.license, artifact.license, `${artifact.name} license drifted.`);
  assert.equal(manifest.gitHead, artifact.gitHead, `${artifact.name} source revision drifted.`);
  assert.equal(
    artifact.gitHead,
    artifacts.profileRevision,
    `${artifact.name} profile pin drifted.`
  );
  const lockResolution = `'${artifact.name}@${artifact.version}':\n    resolution: {integrity: ${artifact.integrity}}`;
  assert(lockfileText.includes(lockResolution), `${artifact.name} tarball integrity drifted.`);
  const expectedSource = `https://www.npmjs.com/package/${artifact.name}/v/${artifact.version}`;
  assert.equal(artifact.source, expectedSource, `${artifact.name} source URL drifted.`);
}

async function verifyProfileRevision(revision) {
  const schema = await readJson(
    resolve(workspaceRoot, "packages/contracts/schemas/ui-document.schema.json")
  );
  assert.deepEqual(
    schema.$defs.jsonUiProfile.properties.upstream.enum,
    [revision],
    "The document schema and executable upstream artifacts use different revisions."
  );
}

async function verifyFixture() {
  const fixtureRoot = resolve(packageRoot, "fixtures/upstream");
  const provenance = await readJson(resolve(fixtureRoot, "fixture-provenance.json"));
  const content = await readFile(resolve(fixtureRoot, "official-quick-example.json"));
  const digest = createHash("sha256").update(content).digest("hex");
  assert.equal(provenance.sourceRevision, artifacts.profileRevision, "Fixture revision drifted.");
  assert.equal(digest, provenance.sha256, "Upstream fixture content drifted.");
}
