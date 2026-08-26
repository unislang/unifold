import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(packageRoot, "../..");
const vitestExecutable = resolve(workspaceRoot, "node_modules/vitest/vitest.mjs");
const resultDirectory = resolve(workspaceRoot, "benchmark-results");
const rawPath = resolve(resultDirectory, "selective-rendering.raw.json");
const profilePath = resolve(resultDirectory, "performance-profile.raw.json");
const lifecycleMemoryPath = resolve(resultDirectory, "lifecycle-memory.raw.json");
const virtualListPath = resolve(resultDirectory, "virtual-list-startup.raw.json");
const comboboxFilterPath = resolve(resultDirectory, "combobox-filter.raw.json");
const tablePath = resolve(resultDirectory, "table-startup.raw.json");
const dataGridPath = resolve(resultDirectory, "data-grid-performance.raw.json");
const masterDetailPath = resolve(resultDirectory, "master-detail-performance.raw.json");
const searchResultsPath = resolve(resultDirectory, "search-results-performance.raw.json");
const workflowPath = resolve(resultDirectory, "workflow-navigation-performance.raw.json");
const auditLogPath = resolve(resultDirectory, "audit-log-performance.raw.json");
const dataActorPath = resolve(resultDirectory, "data-actor-performance.raw.json");
const collaborationPath = resolve(resultDirectory, "collaboration-performance.raw.json");
const devtoolsPath = resolve(resultDirectory, "devtools-performance.raw.json");
const controlPlaneTransportPath = resolve(
  resultDirectory,
  "control-plane-transport-performance.raw.json"
);
const controlPlaneDurabilityPath = resolve(
  resultDirectory,
  "control-plane-durability-performance.raw.json"
);
const asyncStorePath = resolve(resultDirectory, "async-store-performance.raw.json");
const documentProvenancePath = resolve(resultDirectory, "document-provenance-performance.raw.json");
const fileInputPath = resolve(resultDirectory, "file-input-performance.raw.json");
const finalPath = resolve(resultDirectory, "selective-rendering.json");
const profileRuns = [
  ["performance-profile.test.ts", "UNIFOLD_PERFORMANCE_PROFILE_OUTPUT", profilePath],
  ["lifecycle-memory-profile.test.ts", "UNIFOLD_LIFECYCLE_MEMORY_OUTPUT", lifecycleMemoryPath],
  ["virtual-list-profile.test.ts", "UNIFOLD_VIRTUAL_LIST_OUTPUT", virtualListPath],
  ["combobox-filter-profile.test.ts", "UNIFOLD_COMBOBOX_FILTER_OUTPUT", comboboxFilterPath],
  ["table-profile.test.ts", "UNIFOLD_TABLE_OUTPUT", tablePath],
  ["data-grid-profile.test.ts", "UNIFOLD_DATA_GRID_OUTPUT", dataGridPath],
  ["master-detail-profile.test.ts", "UNIFOLD_MASTER_DETAIL_OUTPUT", masterDetailPath],
  ["search-results-profile.test.ts", "UNIFOLD_SEARCH_RESULTS_OUTPUT", searchResultsPath],
  ["workflow-navigation-profile.test.ts", "UNIFOLD_WORKFLOW_OUTPUT", workflowPath],
  ["audit-log-profile.test.ts", "UNIFOLD_AUDIT_LOG_OUTPUT", auditLogPath],
  ["data-actor-profile.test.ts", "UNIFOLD_DATA_ACTOR_OUTPUT", dataActorPath],
  ["collaboration-profile.test.ts", "UNIFOLD_COLLABORATION_OUTPUT", collaborationPath],
  ["devtools-profile.test.ts", "UNIFOLD_DEVTOOLS_OUTPUT", devtoolsPath],
  [
    "control-plane-durability-profile.test.ts",
    "UNIFOLD_CONTROL_PLANE_DURABILITY_OUTPUT",
    controlPlaneDurabilityPath
  ],
  [
    "control-plane-transport-profile.test.ts",
    "UNIFOLD_CONTROL_PLANE_TRANSPORT_OUTPUT",
    controlPlaneTransportPath
  ],
  ["async-store-profile.test.ts", "UNIFOLD_ASYNC_STORE_OUTPUT", asyncStorePath],
  [
    "document-provenance-profile.test.ts",
    "UNIFOLD_DOCUMENT_PROVENANCE_OUTPUT",
    documentProvenancePath
  ],
  ["file-input-profile.test.ts", "UNIFOLD_FILE_INPUT_OUTPUT", fileInputPath]
];

await mkdir(resultDirectory, { recursive: true });
runVitest();
runProfile();
const benchmark = JSON.parse(await readFile(rawPath, "utf8"));
const measuredProfile = JSON.parse(await readFile(profilePath, "utf8"));
const lifecycleMemory = JSON.parse(await readFile(lifecycleMemoryPath, "utf8"));
const virtualListStartup = JSON.parse(await readFile(virtualListPath, "utf8"));
const comboboxFilter = JSON.parse(await readFile(comboboxFilterPath, "utf8"));
const tableStartup = JSON.parse(await readFile(tablePath, "utf8"));
const dataGridPerformance = JSON.parse(await readFile(dataGridPath, "utf8"));
const masterDetailPerformance = JSON.parse(await readFile(masterDetailPath, "utf8"));
const searchResultsPerformance = JSON.parse(await readFile(searchResultsPath, "utf8"));
const workflowNavigationPerformance = JSON.parse(await readFile(workflowPath, "utf8"));
const auditLogPerformance = JSON.parse(await readFile(auditLogPath, "utf8"));
const dataActorPerformance = JSON.parse(await readFile(dataActorPath, "utf8"));
const collaborationPerformance = JSON.parse(await readFile(collaborationPath, "utf8"));
const devtoolsPerformance = JSON.parse(await readFile(devtoolsPath, "utf8"));
const controlPlaneTransportPerformance = JSON.parse(
  await readFile(controlPlaneTransportPath, "utf8")
);
const controlPlaneDurabilityPerformance = JSON.parse(
  await readFile(controlPlaneDurabilityPath, "utf8")
);
const asyncStorePerformance = JSON.parse(await readFile(asyncStorePath, "utf8"));
const documentProvenancePerformance = JSON.parse(await readFile(documentProvenancePath, "utf8"));
const fileInputPerformance = JSON.parse(await readFile(fileInputPath, "utf8"));
const profile = {
  ...measuredProfile,
  gates: [
    ...measuredProfile.gates,
    lifecycleMemory.gate,
    virtualListStartup.gate,
    comboboxFilter.gate,
    tableStartup.gate,
    ...dataGridPerformance.gates,
    ...masterDetailPerformance.gates,
    ...searchResultsPerformance.gates,
    ...workflowNavigationPerformance.gates,
    ...auditLogPerformance.gates,
    ...dataActorPerformance.gates,
    ...collaborationPerformance.gates,
    ...devtoolsPerformance.gates,
    ...controlPlaneDurabilityPerformance.gates,
    ...controlPlaneTransportPerformance.gates,
    ...asyncStorePerformance.gates,
    ...documentProvenancePerformance.gates,
    fileInputPerformance.gate
  ],
  asyncStorePerformance,
  comboboxFilter,
  auditLogPerformance,
  collaborationPerformance,
  controlPlaneDurabilityPerformance,
  controlPlaneTransportPerformance,
  devtoolsPerformance,
  documentProvenancePerformance,
  fileInputPerformance,
  dataActorPerformance,
  lifecycleMemory,
  dataGridPerformance,
  masterDetailPerformance,
  searchResultsPerformance,
  tableStartup,
  virtualListStartup,
  workflowNavigationPerformance
};
const report = {
  benchmark,
  environment: environmentMetadata(),
  generatedAt: new Date().toISOString(),
  profile,
  schemaVersion: "2.23.0"
};
await writeFile(finalPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`Benchmark report: ${finalPath}\n`);

function runVitest() {
  execFileSync(
    process.execPath,
    [vitestExecutable, "bench", "--run", "--config", "vitest.config.ts", "--outputJson", rawPath],
    { cwd: packageRoot, env: benchmarkEnvironment(), stdio: "inherit" }
  );
}

function runProfile() {
  profileRuns.forEach(([testFile, environmentKey, outputPath]) =>
    runNamedProfile(vitestExecutable, testFile, environmentKey, outputPath)
  );
}

function runNamedProfile(executable, testFile, environmentKey, outputPath) {
  execFileSync(
    process.execPath,
    [executable, "run", testFile, "--config", "performance-profile.vitest.config.ts"],
    {
      cwd: packageRoot,
      env: benchmarkEnvironment(environmentKey, outputPath),
      stdio: "inherit"
    }
  );
}

function benchmarkEnvironment(environmentKey, outputPath) {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !/^(npm|pnpm)/i.test(name))
  );
  if (environmentKey !== undefined && outputPath !== undefined) {
    environment[environmentKey] = outputPath;
  }
  return environment;
}

function environmentMetadata() {
  const processors = cpus();
  return {
    architecture: process.arch,
    cpu: processors[0]?.model ?? "unknown",
    cpuCount: processors.length,
    gitRevision: gitRevision(),
    node: process.version,
    platform: process.platform,
    totalMemoryBytes: totalmem()
  };
}

function gitRevision() {
  try {
    return execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return null;
  }
}
