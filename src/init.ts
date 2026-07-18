import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export interface InitResult {
  root: string;
  files: string[];
}

function write(root: string, relativePath: string, content: string, files: string[]): void {
  const target = join(root, relativePath);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content, { encoding: "utf8", flag: "wx" });
  files.push(relativePath);
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function initializeProject(output: string): InitResult {
  const root = resolve(output);
  if (existsSync(root)) {
    throw new Error(`Target already exists: ${root}`);
  }
  mkdirSync(root, { recursive: true });
  const name = basename(root).replace(/[^A-Za-z0-9._-]+/g, "-") || "mssp-project";
  const files: string[] = [];

  write(root, "mssp.yaml", `schemaVersion: "0.1"\nid: ${yamlString(name)}\nname: ${yamlString(name)}\nversion: "0.1.0"\ndescription: "An MSSP-organized system."\nlayers:\n  FMS: FMS\n  SCL: SCL\n  SMS: SMS\n  TMS: TMS\n  DMS: DMS\n  ROUTER: Router\n  RUNTIME: Runtime\npolicies:\n  fmsExecutableFiles: deny\n  tmsDirectDependency: deny\n  smsDependsOnTms: deny\n  requireFmsReview: true\nmetadata:\n  methodology: "Mother-Set and Subset Paradigm"\n` , files);

  write(root, "FMS/00_SYSTEM_NARRATIVE.md", `# System Narrative\n\n## Why this system exists\n\nDescribe the system's purpose in language that a new contributor can understand in five minutes.\n\n## Boundaries\n\nState what belongs to this system and what does not.\n\n## Architectural invariants\n\n- FMS remains pure metadata.\n- SMS never depends on TMS.\n- TMS modules remain independently replaceable and island-testable.\n`, files);
  write(root, "FMS/01_MODULE_INDEX.md", `# Module Index\n\n| ID | Layer | Responsibility |\n|---|---|---|\n| core.echo | SMS | Stable core echo capability |\n| plugin.uppercase | TMS | Optional uppercase transformation |\n| diagnostics.basic | DMS | Human-readable diagnostics |\n| router.default | ROUTER | Select optional capabilities |\n| runtime.default | RUNTIME | Execute the selected plan |\n`, files);
  write(root, "FMS/02_ARCHITECTURE_NOTES.md", `# Architecture Notes\n\nUpdate this document whenever a pull request changes system identity, module boundaries, or dependency direction.\n`, files);

  write(root, "SCL/system.scl.yaml", `schemaVersion: "0.1"\nid: system-controls\nchanges:\n  architecture:\n    allowedBy: [maintainer]\n    requiresReview: true\n  runtimeConfiguration:\n    allowedBy: [maintainer, operator]\n    requiresReview: false\nforbidden:\n  - "SMS depending on TMS"\n  - "Executable source inside FMS"\n`, files);

  write(root, "SMS/core/module.mssp.yaml", `schemaVersion: "0.1"\nid: core.echo\nname: Core Echo\nversion: "0.1.0"\nlayer: SMS\npurpose: "Provide the stable capability required by every execution path."\nentry: index.js\ninputs: [text]\noutputs: [text]\nrequires:\n  modules: []\n  tools: []\n  data: []\npermissions:\n  may: [read-input]\n  mayNot: [network, filesystem-write]\nriskLevel: L0\nfailureModes: [invalid-input]\nvalidation: ["output must be a string"]\ntests: ["returns the provided text"]\ncompatibility:\n  mssp: ">=0.1 <0.2"\nchangeImpact:\n  affects: [plugin.uppercase, router.default, runtime.default]\n  affectedBy: []\nmaintainer: ${yamlString(name)}\n`, files);
  write(root, "SMS/core/index.js", `export function echo(text) {\n  if (typeof text !== "string") throw new TypeError("text must be a string");\n  return text;\n}\n`, files);

  write(root, "TMS/uppercase/module.mssp.yaml", `schemaVersion: "0.1"\nid: plugin.uppercase\nname: Uppercase Plugin\nversion: "0.1.0"\nlayer: TMS\npurpose: "Optionally transform core output to uppercase."\nentry: index.js\nactivateWhen: ["request.transform == uppercase"]\ninputs: [text]\noutputs: [text]\nrequires:\n  modules: [core.echo]\n  tools: []\n  data: []\npermissions:\n  may: [read-input]\n  mayNot: [network, filesystem-write]\nriskLevel: L0\nfailureModes: [invalid-input]\nvalidation: ["output must equal input.toUpperCase()"]\ntests: ["uppercase transformation", "safe rejection of non-string input"]\ncompatibility:\n  mssp: ">=0.1 <0.2"\n  modules:\n    core.echo: ">=0.1 <0.2"\nchangeImpact:\n  affects: []\n  affectedBy: [core.echo, router.default]\nmaintainer: ${yamlString(name)}\n`, files);
  write(root, "TMS/uppercase/index.js", `export function uppercase(text) {\n  if (typeof text !== "string") throw new TypeError("text must be a string");\n  return text.toUpperCase();\n}\n`, files);

  write(root, "DMS/basic/module.mssp.yaml", `schemaVersion: "0.1"\nid: diagnostics.basic\nname: Basic Diagnostics\nversion: "0.1.0"\nlayer: DMS\npurpose: "Translate execution state into human-readable diagnostics."\nentry: index.js\ninputs: [event]\noutputs: [diagnostic]\nrequires:\n  modules: [core.echo]\n  tools: []\n  data: []\npermissions:\n  may: [read-runtime-events]\n  mayNot: [mutate-business-state]\nriskLevel: L0\nfailureModes: [malformed-event]\nvalidation: ["diagnostic includes status and source"]\ntests: ["formats a successful event"]\ncompatibility:\n  mssp: ">=0.1 <0.2"\nchangeImpact:\n  affects: []\n  affectedBy: [core.echo]\nmaintainer: ${yamlString(name)}\n`, files);
  write(root, "DMS/basic/index.js", `export function diagnose(event) {\n  return { status: event?.status ?? "unknown", source: event?.source ?? "unknown" };\n}\n`, files);

  write(root, "Router/module.mssp.yaml", `schemaVersion: "0.1"\nid: router.default\nname: Default Router\nversion: "0.1.0"\nlayer: ROUTER\npurpose: "Select a TMS by declared activation conditions without importing it as a core dependency."\nentry: index.js\ninputs: [request, module-manifests]\noutputs: [selected-module-id]\nrequires:\n  modules: [core.echo]\n  tools: []\n  data: []\npermissions:\n  may: [read-module-manifests]\n  mayNot: [execute-unapproved-module]\nriskLevel: L1\nfailureModes: [no-route, ambiguous-route]\nvalidation: ["selected module exists and activation condition matches"]\ntests: ["selects plugin.uppercase for uppercase requests"]\ncompatibility:\n  mssp: ">=0.1 <0.2"\nchangeImpact:\n  affects: [runtime.default]\n  affectedBy: [core.echo, plugin.uppercase]\nmaintainer: ${yamlString(name)}\n`, files);
  write(root, "Router/index.js", `export function route(request) {\n  return request?.transform === "uppercase" ? "plugin.uppercase" : null;\n}\n`, files);

  write(root, "Runtime/module.mssp.yaml", `schemaVersion: "0.1"\nid: runtime.default\nname: Default Runtime\nversion: "0.1.0"\nlayer: RUNTIME\npurpose: "Execute stable core capabilities and the optional module selected by Router."\nentry: index.js\ninputs: [request, selected-module-id]\noutputs: [result, events]\nrequires:\n  modules: [core.echo, router.default]\n  tools: []\n  data: []\npermissions:\n  may: [execute-declared-modules]\n  mayNot: [execute-undeclared-modules]\nriskLevel: L1\nfailureModes: [module-load-failure, validation-failure]\nvalidation: ["all executed modules are declared in MSSP manifests"]\ntests: ["core-only execution", "core plus selected TMS execution"]\ncompatibility:\n  mssp: ">=0.1 <0.2"\nchangeImpact:\n  affects: []\n  affectedBy: [core.echo, router.default]\nmaintainer: ${yamlString(name)}\n`, files);
  write(root, "Runtime/index.js", `export async function execute(request, core, selectedPlugin) {\n  const base = core.echo(request.text);\n  return selectedPlugin ? selectedPlugin(base) : base;\n}\n`, files);

  write(root, ".github/pull_request_template.md", `## MSSP architecture review\n\n- [ ] I ran \`mssp lint\`.\n- [ ] I ran the relevant TMS island tests.\n- [ ] I updated FMS because this PR changes system identity, module boundaries, or dependency direction.\n- [ ] This PR does not change architecture, so no FMS update is required.\n- [ ] I updated MSSP-VT \`changeImpact\` relations where compatibility may change.\n\n## Validation evidence\n\nDescribe commands, test results, and remaining limitations.\n`, files);

  write(root, "README.md", `# ${name}\n\nThis project uses MSSP (Mother-Set and Subset Paradigm). Start with \`FMS/00_SYSTEM_NARRATIVE.md\`, then inspect \`mssp.yaml\` and each \`*.mssp.yaml\` module contract.\n\n## Local validation\n\n\`\`\`bash\nnpx @evemisslab/mssp-core lint .\nnpx @evemisslab/mssp-core island .\nnpx @evemisslab/mssp-core graph . --format mermaid\n\`\`\`\n`, files);

  return { root, files };
}
