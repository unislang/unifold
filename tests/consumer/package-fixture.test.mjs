import assert from "node:assert/strict";
import test from "node:test";

import { packageClosure, readWorkspaceManifests } from "./package-fixture.mjs";

test("resolves the CLI production closure from package manifests", async () => {
  const manifests = await readWorkspaceManifests();
  const closure = packageClosure(manifests, ["@unislang/unifold-cli"]);
  assert(closure.has("@unislang/unifold-cli"));
  assert(closure.has("@unislang/unifold"));
  assert(!closure.has("@unislang/unifold-studio"));
});
