const forbidden = [
  {
    name: "no-circular-dependencies",
    severity: "error",
    comment: "Cycles make package initialization and ownership unpredictable.",
    from: {},
    to: { circular: true }
  },
  {
    name: "no-unlisted-package-dependencies",
    severity: "error",
    comment: "Every external dependency must be declared by its consuming package.",
    from: { path: "^(packages|apps|examples)/" },
    to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] }
  },
  {
    name: "contracts-do-not-depend-on-implementations",
    severity: "error",
    from: { path: "^packages/contracts/" },
    to: { path: "^packages/(?!contracts/)" }
  },
  {
    name: "ir-does-not-depend-on-ui-implementations",
    severity: "error",
    from: { path: "^packages/ir/" },
    to: {
      path: "^packages/(renderer-dom|elements|angular|studio|control-plane|ai|export)/"
    }
  },
  {
    name: "jsonui-profile-depends-only-on-contracts",
    severity: "error",
    from: { path: "^packages/jsonui/" },
    to: { path: "^packages/(?!contracts/|jsonui/)" }
  },
  {
    name: "state-core-does-not-depend-on-ui-implementations",
    severity: "error",
    from: { path: "^packages/(events|reactivity|runtime|xstate)/" },
    to: { path: "^packages/(renderer-dom|elements|angular|studio)/" }
  }
];

const dependencyCruiserConfig = {
  forbidden,
  options: {
    doNotFollow: { path: "node_modules" },
    includeOnly: "^(packages|apps|examples)",
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true
  }
};

export default dependencyCruiserConfig;
