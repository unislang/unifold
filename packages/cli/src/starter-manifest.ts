interface StarterManifestOptions {
  readonly packageName: string;
  readonly unifoldVersion: string;
}

export function createStarterManifest(options: StarterManifestOptions): string {
  return `${JSON.stringify(starterManifest(options), null, 2)}\n`;
}

function starterManifest(options: StarterManifestOptions): object {
  return {
    name: options.packageName,
    version: "0.0.0",
    private: true,
    type: "module",
    packageManager: "pnpm@10.15.1",
    scripts: starterScripts(),
    dependencies: starterDependencies(options.unifoldVersion),
    devDependencies: starterDevDependencies(options.unifoldVersion)
  };
}

function starterScripts(): object {
  return {
    build: "tsc --noEmit && vite build",
    dev: "vite",
    test: "vitest run src",
    "test:e2e": "playwright test",
    typecheck: "tsc --noEmit"
  };
}

function starterDependencies(unifoldVersion: string): object {
  return {
    "@unislang/unifold": unifoldVersion,
    "@unislang/unifold-events": unifoldVersion,
    "@unislang/unifold-theme": unifoldVersion
  };
}

function starterDevDependencies(unifoldVersion: string): object {
  return {
    "@playwright/test": "1.62.1",
    "@types/node": "24.3.0",
    "@unislang/unifold-playwright": unifoldVersion,
    "happy-dom": "20.0.10",
    typescript: "5.9.2",
    vite: "7.3.6",
    vitest: "3.2.4"
  };
}
