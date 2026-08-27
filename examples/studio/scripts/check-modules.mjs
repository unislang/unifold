import { UnifoldCliStatus, runUnifoldCli } from "@unislang/unifold-cli";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

const projects = [
  ["src/modules/control.project.json", "src/modules/control.module.lock.json"],
  ["src/modules/live.project.json", "src/modules/live.module.lock.json"]
];

for (const [manifest, lock] of projects) {
  const result = await runUnifoldCli(["module", "check", manifest, "--lock", lock], {
    cwd: projectRoot
  });
  if (result.status !== UnifoldCliStatus.Succeeded) {
    throw new Error(`Studio module lock check failed: ${JSON.stringify(result)}`);
  }
}
