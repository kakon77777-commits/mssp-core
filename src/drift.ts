import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { isGeneratedSource } from "./repository-evidence.js";
import { MSSP_LAYERS } from "./types.js";
import type {
  LoadedProject,
  MsspLayer,
} from "./types.js";

export const MSSP_ARCHITECTURE_DRIFT_VERSION = "0.2" as const;
export const MSSP_ARCHITECTURE_DRIFT_KIND = "mssp-architecture-drift-report" as const;

export type ArchitectureDriftSeverity = "error" | "warning" | "info";
export type ArchitectureDriftFindingStatus = "drift" | "indeterminate";
export type ArchitectureDriftReportStatus = "consistent" | "drift-detected" | "indeterminate";

export interface ArchitectureDriftEvidence {
  kind: "declaration" | "fms" | "source" | "scan";
  message: string;
  uri?: string;
  line?: number;
  data?: Record<string, unknown>;
}

export interface ArchitectureDriftFinding {
  code: string;
  severity: ArchitectureDriftSeverity;
  status: ArchitectureDriftFindingStatus;
  category:
    | "fms-presence"
    | "module-index"
    | "layer-boundary"
    | "source-ownership"
    | "scan-completeness";
  message: string;
  moduleId?: string;
  layer?: MsspLayer;
  path?: string;
  declared: ArchitectureDriftEvidence[];
  observed: ArchitectureDriftEvidence[];
  suggestedActions: string[];
}

export interface ArchitectureDriftReport {
  schemaVersion: typeof MSSP_ARCHITECTURE_DRIFT_VERSION;
  kind: typeof MSSP_ARCHITECTURE_DRIFT_KIND;
  generatedBy: {
    name: string;
    version: string;
    adapter: "architecture-drift-analyzer";
  };
  sourceModel: {
    projectId: string;
    projectName: string;
    projectVersion: string;
    revision?: string;
    maxFiles: number;
    examinedFiles: number;
    sourceFiles: number;
    generatedSourceFilesExcluded: number;
    truncated: boolean;
  };
  analysis: {
    mode: "static-conservative";
    semanticEquivalence: false;
    autoMutation: false;
  };
  coverage: {
    canonicalFmsDocuments: number;
    canonicalFmsDocumentsFound: number;
    moduleIndexParsed: boolean;
    declaredModules: number;
    indexedModules: number;
    executableLayerSourceFiles: number;
  };
  summary: {
    status: ArchitectureDriftReportStatus;
    ok: boolean;
    errors: number;
    warnings: number;
    info: number;
    drift: number;
    indeterminate: number;
    total: number;
  };
  findings: ArchitectureDriftFinding[];
}

export interface ArchitectureDriftOptions {
  revision?: string;
  maxFiles?: number;
  implementationName?: string;
  implementationVersion?: string;
}

interface IndexedModule {
  id: string;
  layer: string;
  line: number;
}

interface ParsedModuleIndex {
  parsed: boolean;
  entries: IndexedModule[];
}

interface SourceObservation {
  absolute: string;
  path: string;
  layer: MsspLayer;
}

interface SourceInventory {
  examinedFiles: number;
  generatedSourceFilesExcluded: number;
  truncated: boolean;
  sourceFiles: SourceObservation[];
}

const CANONICAL_FMS_DOCUMENTS = [
  "00_SYSTEM_NARRATIVE.md",
  "01_MODULE_INDEX.md",
  "02_ARCHITECTURE_NOTES.md",
] as const;

const SOURCE_EXTENSIONS = new Set([
  ".c", ".cc", ".cpp", ".cxx", ".cs", ".go", ".java", ".js", ".jsx",
  ".kt", ".kts", ".lua", ".php", ".py", ".rb", ".rs", ".sh", ".swift",
  ".ts", ".tsx", ".wasm",
]);

const SKIP_DIRECTORIES = new Set([
  ".cache",
  ".git",
  ".idea",
  ".mypy_cache",
  ".next",
  ".nuxt",
  ".pytest_cache",
  ".tmp",
  ".venv",
  ".vscode",
  "bin",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "obj",
  "target",
  "venv",
]);

function portablePath(root: string, value: string): string {
  const path = relative(root, value).replaceAll("\\", "/");
  return path || ".";
}

function pathInside(root: string, child: string): boolean {
  const path = relative(resolve(root), resolve(child));
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function cleanCell(value: string): string {
  return value
    .replace(/`/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .trim();
}

function tableCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return [];
  const body = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return body.split("|").map(cleanCell);
}

function isSeparatorRow(cells: readonly string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function parseFmsModuleIndex(text: string): ParsedModuleIndex {
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const cells = tableCells(lines[index] ?? "");
    const normalized = cells.map((cell) => cell.toLowerCase());
    const idColumn = normalized.indexOf("id");
    const layerColumn = normalized.indexOf("layer");
    if (idColumn < 0 || layerColumn < 0) continue;

    const entries: IndexedModule[] = [];
    for (let row = index + 1; row < lines.length; row += 1) {
      const rowCells = tableCells(lines[row] ?? "");
      if (!rowCells.length) {
        if (entries.length) break;
        continue;
      }
      if (isSeparatorRow(rowCells)) continue;
      const id = rowCells[idColumn]?.trim() ?? "";
      const layer = rowCells[layerColumn]?.trim() ?? "";
      if (!id && !layer) continue;
      if (!id || !layer) continue;
      entries.push({ id, layer: layer.toUpperCase(), line: row + 1 });
    }
    return { parsed: true, entries };
  }
  return { parsed: false, entries: [] };
}

function collectSourceInventory(project: LoadedProject, maxFiles: number): SourceInventory {
  const sourceFiles: SourceObservation[] = [];
  const seenFiles = new Set<string>();
  let examinedFiles = 0;
  let generatedSourceFilesExcluded = 0;
  let truncated = false;

  function walk(directory: string, layer: MsspLayer): void {
    if (truncated || !existsSync(directory) || !statSync(directory).isDirectory()) return;
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (truncated) return;
      if (entry.isSymbolicLink()) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) walk(absolute, layer);
        continue;
      }
      if (!entry.isFile()) continue;
      const normalized = resolve(absolute);
      if (seenFiles.has(normalized)) continue;
      seenFiles.add(normalized);
      if (examinedFiles >= maxFiles) {
        truncated = true;
        return;
      }
      examinedFiles += 1;
      const path = portablePath(project.root, absolute);
      if (!SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
      if (isGeneratedSource(path)) {
        generatedSourceFilesExcluded += 1;
        continue;
      }
      sourceFiles.push({ absolute, path, layer });
    }
  }

  for (const layer of MSSP_LAYERS) {
    const configured = project.manifest.layers[layer];
    if (configured) walk(join(project.root, configured), layer);
  }

  return {
    examinedFiles,
    generatedSourceFilesExcluded,
    truncated,
    sourceFiles: sourceFiles.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

function finding(
  value: ArchitectureDriftFinding,
): ArchitectureDriftFinding {
  return value;
}

function sourceEvidence(paths: readonly string[], total: number): ArchitectureDriftEvidence[] {
  return paths.slice(0, 50).map((path) => ({
    kind: "source",
    message: `Observed executable source at ${path}.`,
    uri: path,
    data: { total },
  }));
}

export function buildArchitectureDriftReport(
  project: LoadedProject,
  options: ArchitectureDriftOptions = {},
): ArchitectureDriftReport {
  const maxFiles = options.maxFiles ?? 50_000;
  if (!Number.isInteger(maxFiles) || maxFiles <= 0) {
    throw new Error("Architecture drift maxFiles must be a positive integer.");
  }

  const findings: ArchitectureDriftFinding[] = [];
  const fmsRoot = join(project.root, project.manifest.layers.FMS);
  let canonicalFmsDocumentsFound = 0;

  for (const name of CANONICAL_FMS_DOCUMENTS) {
    const absolute = join(fmsRoot, name);
    if (existsSync(absolute)) {
      canonicalFmsDocumentsFound += 1;
      continue;
    }
    findings.push(finding({
      code: "MSSP_DRIFT_001",
      severity: "warning",
      status: "drift",
      category: "fms-presence",
      message: `Canonical FMS document is missing: ${name}.`,
      path: portablePath(project.root, absolute),
      declared: [{
        kind: "declaration",
        message: "The v0.2 drift profile expects the canonical FMS identity, module index, and architecture notes documents.",
        uri: portablePath(project.root, project.manifestFile),
      }],
      observed: [],
      suggestedActions: [
        `Create ${portablePath(project.root, absolute)} or document an explicit profile-specific equivalent.`,
      ],
    }));
  }

  const moduleIndexPath = join(fmsRoot, "01_MODULE_INDEX.md");
  let parsedIndex: ParsedModuleIndex = { parsed: false, entries: [] };
  if (existsSync(moduleIndexPath)) {
    parsedIndex = parseFmsModuleIndex(readFileSync(moduleIndexPath, "utf8"));
    if (!parsedIndex.parsed) {
      findings.push(finding({
        code: "MSSP_DRIFT_002",
        severity: "warning",
        status: "indeterminate",
        category: "module-index",
        message: "FMS module index exists but no Markdown table with ID and Layer columns could be parsed.",
        path: portablePath(project.root, moduleIndexPath),
        declared: [],
        observed: [{
          kind: "fms",
          message: "The analyzer intentionally does not infer module declarations from unrestricted prose.",
          uri: portablePath(project.root, moduleIndexPath),
        }],
        suggestedActions: [
          "Add a Markdown table with exact ID and Layer columns, or use another declared interoperability profile.",
        ],
      }));
    }
  }

  if (parsedIndex.parsed) {
    const declaredById = new Map(project.modules.map((module) => [module.manifest.id, module]));
    const indexedById = new Map<string, IndexedModule[]>();
    for (const entry of parsedIndex.entries) {
      const values = indexedById.get(entry.id) ?? [];
      values.push(entry);
      indexedById.set(entry.id, values);
    }

    for (const [id, entries] of indexedById) {
      if (entries.length > 1) {
        findings.push(finding({
          code: "MSSP_DRIFT_006",
          severity: "error",
          status: "drift",
          category: "module-index",
          message: `FMS module index contains duplicate entries for ${id}.`,
          moduleId: id,
          path: portablePath(project.root, moduleIndexPath),
          declared: [],
          observed: entries.map((entry) => ({
            kind: "fms",
            message: `${id} is indexed as ${entry.layer}.`,
            uri: portablePath(project.root, moduleIndexPath),
            line: entry.line,
          })),
          suggestedActions: ["Keep exactly one authoritative index row for each module id."],
        }));
      }
    }

    for (const module of [...project.modules].sort((a, b) => a.manifest.id.localeCompare(b.manifest.id))) {
      const entries = indexedById.get(module.manifest.id) ?? [];
      if (!entries.length) {
        findings.push(finding({
          code: "MSSP_DRIFT_003",
          severity: "warning",
          status: "drift",
          category: "module-index",
          message: `Declared module is missing from the FMS module index: ${module.manifest.id}.`,
          moduleId: module.manifest.id,
          layer: module.manifest.layer,
          path: portablePath(project.root, module.file),
          declared: [{
            kind: "declaration",
            message: `${module.manifest.id} declares layer ${module.manifest.layer}.`,
            uri: portablePath(project.root, module.file),
          }],
          observed: [],
          suggestedActions: ["Add the module id, layer, and responsibility to FMS/01_MODULE_INDEX.md."],
        }));
        continue;
      }
      const entry = entries[0];
      if (entry && entry.layer !== module.manifest.layer) {
        findings.push(finding({
          code: "MSSP_DRIFT_005",
          severity: "error",
          status: "drift",
          category: "module-index",
          message: `FMS index and module manifest disagree on the layer of ${module.manifest.id}.`,
          moduleId: module.manifest.id,
          layer: module.manifest.layer,
          path: portablePath(project.root, moduleIndexPath),
          declared: [{
            kind: "declaration",
            message: `Manifest declares ${module.manifest.layer}.`,
            uri: portablePath(project.root, module.file),
          }],
          observed: [{
            kind: "fms",
            message: `FMS index records ${entry.layer}.`,
            uri: portablePath(project.root, moduleIndexPath),
            line: entry.line,
          }],
          suggestedActions: ["Resolve the layer decision through architecture review, then update both declarations consistently."],
        }));
      }
    }

    for (const entry of parsedIndex.entries) {
      if (declaredById.has(entry.id)) continue;
      findings.push(finding({
        code: "MSSP_DRIFT_004",
        severity: "warning",
        status: "drift",
        category: "module-index",
        message: `FMS module index references an undeclared module: ${entry.id}.`,
        moduleId: entry.id,
        path: portablePath(project.root, moduleIndexPath),
        declared: [],
        observed: [{
          kind: "fms",
          message: `${entry.id} is indexed as ${entry.layer}.`,
          uri: portablePath(project.root, moduleIndexPath),
          line: entry.line,
        }],
        suggestedActions: ["Declare the module with a manifest or remove the stale FMS index row."],
      }));
    }
  }

  const inventory = collectSourceInventory(project, maxFiles);
  if (inventory.truncated) {
    findings.push(finding({
      code: "MSSP_DRIFT_009",
      severity: "warning",
      status: "indeterminate",
      category: "scan-completeness",
      message: `Source inventory reached the ${maxFiles}-file bound and is incomplete.`,
      declared: [],
      observed: [{
        kind: "scan",
        message: "The analyzer stopped before examining every file under configured MSSP layers.",
        data: { maxFiles, examinedFiles: inventory.examinedFiles },
      }],
      suggestedActions: ["Rerun mssp drift with a higher --max-files value before approving architecture consistency."],
    }));
  }

  for (const layer of ["FMS", "SCL"] as const) {
    const paths = inventory.sourceFiles
      .filter((source) => source.layer === layer)
      .map((source) => source.path);
    if (!paths.length) continue;
    findings.push(finding({
      code: "MSSP_DRIFT_010",
      severity: "error",
      status: "drift",
      category: "layer-boundary",
      message: `${layer} is declarative metadata but contains executable source.`,
      layer,
      path: project.manifest.layers[layer],
      declared: [{
        kind: "declaration",
        message: `${layer} is declared as a metadata/governance layer rather than an executable module layer.`,
        uri: portablePath(project.root, project.manifestFile),
      }],
      observed: sourceEvidence(paths, paths.length),
      suggestedActions: [`Move executable behavior out of ${layer} and into an explicitly declared executable module.`],
    }));
  }

  const executableLayers = new Set<MsspLayer>(["SMS", "TMS", "DMS", "ROUTER", "RUNTIME"]);
  const unownedByLayer = new Map<MsspLayer, string[]>();
  const ambiguousByLayer = new Map<MsspLayer, string[]>();

  for (const source of inventory.sourceFiles) {
    if (!executableLayers.has(source.layer)) continue;
    const owners = project.modules.filter((module) =>
      module.manifest.layer === source.layer && pathInside(module.directory, source.absolute)
    );
    if (owners.length === 0) {
      const values = unownedByLayer.get(source.layer) ?? [];
      values.push(source.path);
      unownedByLayer.set(source.layer, values);
    } else if (owners.length > 1) {
      const values = ambiguousByLayer.get(source.layer) ?? [];
      values.push(source.path);
      ambiguousByLayer.set(source.layer, values);
    }
  }

  for (const layer of [...unownedByLayer.keys()].sort()) {
    const paths = unownedByLayer.get(layer) ?? [];
    findings.push(finding({
      code: "MSSP_DRIFT_007",
      severity: "warning",
      status: "drift",
      category: "source-ownership",
      message: `${paths.length} executable source file(s) under ${layer} are outside every declared ${layer} module boundary.`,
      layer,
      path: project.manifest.layers[layer],
      declared: project.modules
        .filter((module) => module.manifest.layer === layer)
        .sort((a, b) => a.manifest.id.localeCompare(b.manifest.id))
        .map((module) => ({
          kind: "declaration" as const,
          message: `${module.manifest.id} owns the boundary rooted at ${portablePath(project.root, module.directory)}.`,
          uri: portablePath(project.root, module.file),
        })),
      observed: sourceEvidence(paths, paths.length),
      suggestedActions: [
        "Move the source into an existing declared module boundary, or complete governed candidate promotion and register a new module.",
      ],
    }));
  }

  for (const layer of [...ambiguousByLayer.keys()].sort()) {
    const paths = ambiguousByLayer.get(layer) ?? [];
    findings.push(finding({
      code: "MSSP_DRIFT_008",
      severity: "warning",
      status: "drift",
      category: "source-ownership",
      message: `${paths.length} executable source file(s) under ${layer} are covered by overlapping module boundaries.`,
      layer,
      path: project.manifest.layers[layer],
      declared: project.modules
        .filter((module) => module.manifest.layer === layer)
        .sort((a, b) => a.manifest.id.localeCompare(b.manifest.id))
        .map((module) => ({
          kind: "declaration" as const,
          message: `${module.manifest.id} is rooted at ${portablePath(project.root, module.directory)}.`,
          uri: portablePath(project.root, module.file),
        })),
      observed: sourceEvidence(paths, paths.length),
      suggestedActions: ["Remove nested or overlapping manifest ownership so every source file has one authoritative module boundary."],
    }));
  }

  findings.sort((a, b) =>
    `${a.code}\u0000${a.moduleId ?? ""}\u0000${a.path ?? ""}\u0000${a.message}`
      .localeCompare(`${b.code}\u0000${b.moduleId ?? ""}\u0000${b.path ?? ""}\u0000${b.message}`)
  );

  const errors = findings.filter((value) => value.severity === "error").length;
  const warnings = findings.filter((value) => value.severity === "warning").length;
  const info = findings.filter((value) => value.severity === "info").length;
  const drift = findings.filter((value) => value.status === "drift").length;
  const indeterminate = findings.filter((value) => value.status === "indeterminate").length;
  const status: ArchitectureDriftReportStatus = drift > 0
    ? "drift-detected"
    : indeterminate > 0
      ? "indeterminate"
      : "consistent";

  const sourceModel: ArchitectureDriftReport["sourceModel"] = {
    projectId: project.manifest.id,
    projectName: project.manifest.name,
    projectVersion: project.manifest.version,
    maxFiles,
    examinedFiles: inventory.examinedFiles,
    sourceFiles: inventory.sourceFiles.length,
    generatedSourceFilesExcluded: inventory.generatedSourceFilesExcluded,
    truncated: inventory.truncated,
  };
  if (options.revision) sourceModel.revision = options.revision;

  return {
    schemaVersion: MSSP_ARCHITECTURE_DRIFT_VERSION,
    kind: MSSP_ARCHITECTURE_DRIFT_KIND,
    generatedBy: {
      name: options.implementationName ?? "@evemisslab/mssp-core",
      version: options.implementationVersion ?? "0.1.0",
      adapter: "architecture-drift-analyzer",
    },
    sourceModel,
    analysis: {
      mode: "static-conservative",
      semanticEquivalence: false,
      autoMutation: false,
    },
    coverage: {
      canonicalFmsDocuments: CANONICAL_FMS_DOCUMENTS.length,
      canonicalFmsDocumentsFound,
      moduleIndexParsed: parsedIndex.parsed,
      declaredModules: project.modules.length,
      indexedModules: parsedIndex.entries.length,
      executableLayerSourceFiles: inventory.sourceFiles.filter((source) => executableLayers.has(source.layer)).length,
    },
    summary: {
      status,
      ok: errors === 0,
      errors,
      warnings,
      info,
      drift,
      indeterminate,
      total: findings.length,
    },
    findings,
  };
}
