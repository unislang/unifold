import { UnifoldCliStatus, runUnifoldCli } from "@unislang/unifold-cli";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

const projects = [
  ["src/modules/modules.project.json", "src/modules/hierarchical.module.lock.json"],
  ["src/modules/control-topology.project.json", "src/modules/control-topology.module.lock.json"]
];

for (const [manifest, lock] of projects) {
  const result = await runUnifoldCli(["module", "check", manifest, "--lock", lock], {
    cwd: projectRoot
  });
  if (result.status !== UnifoldCliStatus.Succeeded) {
    throw new Error(`Hierarchical module lock check failed: ${JSON.stringify(result)}`);
  }
}
