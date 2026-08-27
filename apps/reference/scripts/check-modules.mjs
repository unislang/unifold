import { UnifoldCliStatus, runUnifoldCli } from "@unislang/unifold-cli";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

const result = await runUnifoldCli(
  [
    "module",
    "check",
    "src/modules/modules.project.json",
    "--lock",
    "src/modules/reference.module.lock.json"
  ],
  { cwd: projectRoot }
);

if (result.status !== UnifoldCliStatus.Succeeded) {
  throw new Error(`Reference module lock check failed: ${JSON.stringify(result)}`);
}
