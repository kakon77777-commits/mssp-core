import { execFileSync } from "node:child_process";
import { isAbsolute, join, relative, resolve } from "node:path";
import { isGeneratedSource } from "./repository-evidence.js";
import type { LoadedModule, LoadedProject, MsspLayer } from "./types.js";

export const MSSP_GIT_DIFF_IMPACT_VERSION = "0.2" as const;
export const MSSP_GIT_DIFF_IMPACT_KIND = "mssp-git-diff-impact-report" as const;

export type GitDiffChangeStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "type-changed"
  | "unmerged"
  | "unknown";
export type GitDiffProjectTransition = "within-project" | "into-project" | "out-of-project";
export type GitDiffImpactReportStatus = "no-impact" | "impact-detected" | "indeterminate";
export type GitDiffImpactFindingStatus = "review-required" | "indeterminate";
export type GitDiffImpactSeverity = "error" | "warning" | "info";
export type GitDiffImpactReviewKind =
  | "fms"
  | "scl"
  | "module-contract"
  | "version"
  | "compatibility"
  | "island"
  | "tests";

export interface GitDiffChange {
  status: GitDiffChangeStatus;
  path: string;
  oldPath?: string;
  repositoryPath: string;
  oldRepositoryPath?: string;
  transition: GitDiffProjectTransition;
}

export interface GitDiffCollection {
  base: string;
  head: string;
  comparisonMode: "direct";
  projectPath: string;
  totalChangedFiles: number;
  outsideProjectFiles: number;
  changes: GitDiffChange[];
}

export interface GitDiffImpactEvidence {
  kind: "git" | "manifest" | "mssp-vt" | "fms" | "policy";
  message: string;
  uri?: string;
  moduleId?: string;
  data?: Record<string, unknown>;
}

export interface GitDiffModuleImpact {
  moduleId: string;
  layer: MsspLayer;
  direct: boolean;
  distance: number;
  changedFiles: string[];
  impactKinds: string[];
  evidence: GitDiffImpactEvidence[];
  requiredReviews: GitDiffImpactReviewKind[];
}

export interface GitDiffImpactReviewRequirement {
  kind: GitDiffImpactReviewKind;
  modules: string[];
  reasons: string[];
}

export interface GitDiffImpactFinding {
  code: string;
  severity: GitDiffImpactSeverity;
  status: GitDiffImpactFindingStatus;
  category:
    | "project-contract"
    | "fms-review"
    | "scl-review"
    | "source-ownership"
    | "mssp-vt"
    | "path-transition"
    | "generated-source";
  message: string;
  moduleId?: string;
  layer?: MsspLayer;
  path?: string;
  evidence: GitDiffImpactEvidence[];
  suggestedActions: string[];
}

export interface GitDiffImpactReport {
  schemaVersion: typeof MSSP_GIT_DIFF_IMPACT_VERSION;
  kind: typeof MSSP_GIT_DIFF_IMPACT_KIND;
  generatedBy: {
    name: string;
    version: string;
    adapter: "git-diff-impact-analyzer";
  };
  sourceModel: {
    projectId: string;
    projectName: string;
    projectVersion: string;
    revision?: string;
  };
  comparison: Omit<GitDiffCollection, "changes">;
  analysis: {
    mode: "static-conservative";
    semanticCompatibility: false;
    autoVersionBump: false;
    autoMutation: false;
  };
  changedFiles: GitDiffChange[];
  impactedModules: GitDiffModuleImpact[];
  requiredReviews: GitDiffImpactReviewRequirement[];
  summary: {
    status: GitDiffImpactReportStatus;
    ok: boolean;
    changedFiles: number;
    directModules: number;
    transitiveModules: number;
    reviewRequirements: number;
    indeterminate: number;
    totalFindings: number;
  };
  findings: GitDiffImpactFinding[];
}

export interface GitDiffImpactOptions {
  base: string;
  head?: string;
  revision?: string;
  implementationName?: string;
  implementationVersion?: string;
}

interface RawGitDiffChange {
  status: GitDiffChangeStatus;
  repositoryPath: string;
  oldRepositoryPath?: string;
}

interface ImpactEdge {
  source: string;
  target: string;
  kind: "affects" | "affected-by" | "requires" | "compatibility";
}

interface MutableImpact {
  module: LoadedModule;
  direct: boolean;
  distance: number;
  changedFiles: Set<string>;
  impactKinds: Set<string>;
  evidence: GitDiffImpactEvidence[];
}

const EXECUTABLE_LAYERS = new Set<MsspLayer>(["SMS", "TMS", "DMS", "ROUTER", "RUNTIME"]);
const STATUS_NAMES: Record<string, GitDiffChangeStatus> = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "renamed",
  C: "copied",
  T: "type-changed",
  U: "unmerged",
  X: "unknown",
  B: "unknown",
};

function portable(value: string): string {
  return value.replaceAll("\\", "/");
}

function portablePath(root: string, value: string): string {
  return portable(relative(root, value)) || ".";
}

function pathInside(parent: string, child: string): boolean {
  const normalizedParent = portable(parent).replace(/^\.\//, "").replace(/\/$/, "");
  const normalizedChild = portable(child).replace(/^\.\//, "");
  return !normalizedParent || normalizedParent === "." ||
    normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}/`);
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function parseStatus(token: string): GitDiffChangeStatus {
  return STATUS_NAMES[token[0] ?? ""] ?? "unknown";
}

export function parseGitNameStatus(output: string): RawGitDiffChange[] {
  const tokens = output.split("\0");
  if (tokens.at(-1) === "") tokens.pop();
  const changes: RawGitDiffChange[] = [];

  for (let index = 0; index < tokens.length;) {
    const token = tokens[index++];
    if (!token) throw new Error("Malformed git diff name-status output: missing status token.");
    const status = parseStatus(token);
    if (status === "renamed" || status === "copied") {
      const oldRepositoryPath = tokens[index++];
      const repositoryPath = tokens[index++];
      if (!oldRepositoryPath || !repositoryPath) {
        throw new Error("Malformed git diff name-status output: rename/copy path is incomplete.");
      }
      changes.push({
        status,
        repositoryPath: portable(repositoryPath),
        oldRepositoryPath: portable(oldRepositoryPath),
      });
    } else {
      const repositoryPath = tokens[index++];
      if (!repositoryPath) throw new Error("Malformed git diff name-status output: file path is missing.");
      changes.push({ status, repositoryPath: portable(repositoryPath) });
    }
  }

  return changes.sort((a, b) =>
    `${a.repositoryPath}\u0000${a.oldRepositoryPath ?? ""}`
      .localeCompare(`${b.repositoryPath}\u0000${b.oldRepositoryPath ?? ""}`)
  );
}

function runGit(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Git command failed (${args.join(" ")}): ${detail}`);
  }
}

function transitionFor(
  raw: RawGitDiffChange,
  current: string | undefined,
  previous: string | undefined,
): GitDiffProjectTransition {
  if (raw.status === "added") return "into-project";
  if (raw.status === "deleted") return "out-of-project";
  if (raw.status === "renamed" || raw.status === "copied") {
    if (current && previous) return "within-project";
    return current ? "into-project" : "out-of-project";
  }
  return "within-project";
}

export function collectGitDiffChanges(projectRoot: string, base: string, head = "HEAD"): GitDiffCollection {
  const resolvedProjectRoot = resolve(projectRoot);
  const repositoryRoot = resolve(runGit(resolvedProjectRoot, ["rev-parse", "--show-toplevel"]).trim());
  const projectPath = portablePath(repositoryRoot, resolvedProjectRoot);
  if (projectPath.startsWith("../") || isAbsolute(projectPath)) {
    throw new Error("MSSP project root is outside the detected Git repository.");
  }

  const rawChanges = parseGitNameStatus(runGit(repositoryRoot, [
    "diff",
    "--name-status",
    "-z",
    "--find-renames=50%",
    base,
    head,
    "--",
  ]));
  const projectRelative = (repositoryPath: string): string | undefined => {
    if (projectPath === ".") return repositoryPath;
    if (!pathInside(projectPath, repositoryPath)) return undefined;
    return repositoryPath.slice(projectPath.length).replace(/^\//, "") || ".";
  };

  const changes: GitDiffChange[] = [];
  let outsideProjectFiles = 0;
  for (const raw of rawChanges) {
    const current = projectRelative(raw.repositoryPath);
    const previous = raw.oldRepositoryPath ? projectRelative(raw.oldRepositoryPath) : undefined;
    if (!current && !previous) {
      outsideProjectFiles += 1;
      continue;
    }
    const change: GitDiffChange = {
      status: raw.status,
      path: current ?? previous ?? ".",
      repositoryPath: raw.repositoryPath,
      transition: transitionFor(raw, current, previous),
    };
    if (previous && previous !== change.path) change.oldPath = previous;
    if (raw.oldRepositoryPath) change.oldRepositoryPath = raw.oldRepositoryPath;
    changes.push(change);
  }

  changes.sort((a, b) =>
    `${a.path}\u0000${a.oldPath ?? ""}\u0000${a.status}`
      .localeCompare(`${b.path}\u0000${b.oldPath ?? ""}\u0000${b.status}`)
  );
  return {
    base,
    head,
    comparisonMode: "direct",
    projectPath,
    totalChangedFiles: rawChanges.length,
    outsideProjectFiles,
    changes,
  };
}

function modulePaths(project: LoadedProject, module: LoadedModule): {
  directory: string;
  manifest: string;
  entry?: string;
} {
  const value: { directory: string; manifest: string; entry?: string } = {
    directory: portablePath(project.root, module.directory),
    manifest: portablePath(project.root, module.file),
  };
  if (module.manifest.entry) value.entry = portablePath(project.root, join(module.directory, module.manifest.entry));
  return value;
}

function changePaths(change: GitDiffChange): string[] {
  return uniqueSorted([change.path, ...(change.oldPath ? [change.oldPath] : [])]);
}

function owners(project: LoadedProject, path: string): LoadedModule[] {
  return project.modules
    .filter((module) => pathInside(portablePath(project.root, module.directory), path))
    .sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
}

function layerFor(project: LoadedProject, path: string): MsspLayer | undefined {
  const entries = Object.entries(project.manifest.layers) as [MsspLayer, string | undefined][];
  return entries
    .filter((entry): entry is [MsspLayer, string] => Boolean(entry[1]))
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, root]) => pathInside(portable(root), path))?.[0];
}

function directKind(project: LoadedProject, module: LoadedModule, path: string): string {
  const paths = modulePaths(project, module);
  if (path === paths.manifest) return "manifest";
  if (paths.entry && path === paths.entry) return "entry";
  return "source";
}

function ensureImpact(impacts: Map<string, MutableImpact>, module: LoadedModule, distance: number): MutableImpact {
  const existing = impacts.get(module.manifest.id);
  if (existing) {
    existing.distance = Math.min(existing.distance, distance);
    return existing;
  }
  const created: MutableImpact = {
    module,
    direct: false,
    distance,
    changedFiles: new Set<string>(),
    impactKinds: new Set<string>(),
    evidence: [],
  };
  impacts.set(module.manifest.id, created);
  return created;
}

function impactEdges(project: LoadedProject): ImpactEdge[] {
  const values = new Map<string, ImpactEdge>();
  const add = (edge: ImpactEdge): void => {
    values.set(`${edge.source}\u0000${edge.target}\u0000${edge.kind}`, edge);
  };
  for (const module of project.modules) {
    const id = module.manifest.id;
    for (const target of module.manifest.changeImpact.affects) add({ source: id, target, kind: "affects" });
    for (const source of module.manifest.changeImpact.affectedBy) add({ source, target: id, kind: "affected-by" });
    for (const source of module.manifest.requires.modules) add({ source, target: id, kind: "requires" });
    for (const source of Object.keys(module.manifest.compatibility.modules ?? {})) {
      add({ source, target: id, kind: "compatibility" });
    }
  }
  return [...values.values()].sort((a, b) =>
    `${a.source}\u0000${a.target}\u0000${a.kind}`
      .localeCompare(`${b.source}\u0000${b.target}\u0000${b.kind}`)
  );
}

function reviewsForModule(
  module: LoadedModule,
  direct: boolean,
  requireFmsReview: boolean,
): GitDiffImpactReviewKind[] {
  const reviews = new Set<GitDiffImpactReviewKind>(["tests"]);
  if (direct) {
    reviews.add("module-contract");
    reviews.add("version");
  } else {
    reviews.add("compatibility");
  }
  if (module.manifest.layer === "TMS") reviews.add("island");
  if (requireFmsReview) reviews.add("fms");
  return [...reviews].sort((a, b) => a.localeCompare(b));
}

function aggregateReviews(
  project: LoadedProject,
  impacts: readonly GitDiffModuleImpact[],
  fmsChanged: boolean,
  sclChanged: boolean,
  projectChanged: boolean,
): GitDiffImpactReviewRequirement[] {
  const values = new Map<GitDiffImpactReviewKind, { modules: Set<string>; reasons: Set<string> }>();
  const add = (kind: GitDiffImpactReviewKind, modules: Iterable<string>, reason: string): void => {
    const value = values.get(kind) ?? { modules: new Set<string>(), reasons: new Set<string>() };
    for (const module of modules) value.modules.add(module);
    value.reasons.add(reason);
    values.set(kind, value);
  };
  const all = impacts.map((impact) => impact.moduleId);
  const direct = impacts.filter((impact) => impact.direct).map((impact) => impact.moduleId);
  const transitive = impacts.filter((impact) => !impact.direct).map((impact) => impact.moduleId);
  const tms = impacts.filter((impact) => impact.layer === "TMS").map((impact) => impact.moduleId);

  if (direct.length) {
    add("module-contract", direct, "Directly changed files may alter declared module behavior or contracts.");
    add("version", direct, "Direct module changes require an explicit version-bump decision.");
  }
  if (all.length) add("tests", all, "Every impacted module requires proportionate validation evidence.");
  if (transitive.length) add("compatibility", transitive, "MSSP-VT relations propagated impact beyond directly changed modules.");
  if (tms.length) add("island", tms, "Impacted TMS modules require island-test review.");
  if (project.manifest.policies.requireFmsReview && (all.length || fmsChanged || projectChanged)) {
    add("fms", all, "Project policy requires FMS review for architecture-relevant changes.");
  }
  if (sclChanged || projectChanged) add("scl", all, "Governance or project-level contracts changed.");

  return [...values.entries()]
    .map(([kind, value]): GitDiffImpactReviewRequirement => ({
      kind,
      modules: uniqueSorted(value.modules),
      reasons: uniqueSorted(value.reasons),
    }))
    .sort((a, b) => a.kind.localeCompare(b.kind));
}

export function buildGitDiffImpactReport(
  project: LoadedProject,
  collection: GitDiffCollection,
  options: Omit<GitDiffImpactOptions, "base" | "head"> = {},
): GitDiffImpactReport {
  const findings: GitDiffImpactFinding[] = [];
  const impacts = new Map<string, MutableImpact>();
  const modulesById = new Map(project.modules.map((module) => [module.manifest.id, module]));
  const projectManifestPath = portablePath(project.root, project.manifestFile);
  const fmsRoot = portable(project.manifest.layers.FMS);
  const sclRoot = portable(project.manifest.layers.SCL);
  let projectChanged = false;
  let fmsChanged = false;
  let sclChanged = false;

  for (const change of collection.changes) {
    const paths = changePaths(change);
    if (paths.includes(projectManifestPath)) {
      projectChanged = true;
      findings.push({
        code: "MSSP_IMPACT_001",
        severity: "warning",
        status: "review-required",
        category: "project-contract",
        message: "The project manifest changed; layer roots, policies, identity, or project compatibility may have changed.",
        path: projectManifestPath,
        evidence: [{ kind: "git", message: `${change.status} ${projectManifestPath}.`, uri: projectManifestPath }],
        suggestedActions: ["Review project identity, layer paths, policies, and every affected module declaration."],
      });
      for (const module of project.modules) {
        const impact = ensureImpact(impacts, module, 1);
        impact.impactKinds.add("project-contract");
        impact.evidence.push({
          kind: "manifest",
          message: "Project-level contract change may affect this module.",
          uri: projectManifestPath,
          moduleId: module.manifest.id,
        });
      }
    }

    if (paths.some((path) => pathInside(fmsRoot, path))) fmsChanged = true;
    if (paths.some((path) => pathInside(sclRoot, path))) sclChanged = true;

    for (const path of paths) {
      const pathOwners = owners(project, path);
      const layer = layerFor(project, path);
      if (!pathOwners.length && layer && EXECUTABLE_LAYERS.has(layer)) {
        findings.push({
          code: "MSSP_IMPACT_004",
          severity: "warning",
          status: "indeterminate",
          category: "source-ownership",
          message: `Changed file under ${layer} is outside every declared module boundary.`,
          layer,
          path,
          evidence: [{ kind: "git", message: `${change.status} ${path}.`, uri: path }],
          suggestedActions: ["Assign the path to an existing module or govern and register a new module before approval."],
        });
      }
      if (pathOwners.length > 1) {
        findings.push({
          code: "MSSP_IMPACT_005",
          severity: "warning",
          status: "indeterminate",
          category: "source-ownership",
          message: "Changed file has overlapping module ownership.",
          path,
          evidence: pathOwners.map((owner): GitDiffImpactEvidence => ({
            kind: "manifest",
            message: `${owner.manifest.id} owns a boundary containing ${path}.`,
            uri: portablePath(project.root, owner.file),
            moduleId: owner.manifest.id,
          })),
          suggestedActions: ["Resolve nested or overlapping module ownership before relying on impact propagation."],
        });
      }

      for (const owner of pathOwners) {
        const impact = ensureImpact(impacts, owner, 0);
        impact.direct = true;
        impact.changedFiles.add(path);
        const kind = directKind(project, owner, path);
        impact.impactKinds.add(kind);
        impact.evidence.push({
          kind: "git",
          message: `${change.status} ${path} directly affects ${owner.manifest.id} as ${kind}.`,
          uri: path,
          moduleId: owner.manifest.id,
        });

        const declared = modulePaths(project, owner);
        if ((change.status === "deleted" || change.transition === "out-of-project") &&
          (path === declared.manifest || path === declared.entry)) {
          findings.push({
            code: "MSSP_IMPACT_007",
            severity: "warning",
            status: "indeterminate",
            category: "path-transition",
            message: `A declared ${path === declared.manifest ? "manifest" : "entry"} path was deleted or moved out of the project.`,
            moduleId: owner.manifest.id,
            layer: owner.manifest.layer,
            path,
            evidence: [{ kind: "git", message: `${change.status} ${path}.`, uri: path, moduleId: owner.manifest.id }],
            suggestedActions: ["Update the module declaration, restore the path, or govern the module removal."],
          });
        }
        if (isGeneratedSource(path)) {
          findings.push({
            code: "MSSP_IMPACT_008",
            severity: "warning",
            status: "indeterminate",
            category: "generated-source",
            message: "A generated-source path changed, but generator provenance is not available.",
            moduleId: owner.manifest.id,
            layer: owner.manifest.layer,
            path,
            evidence: [{ kind: "git", message: `${change.status} ${path}.`, uri: path, moduleId: owner.manifest.id }],
            suggestedActions: ["Review the generator input and record generated-source provenance before compatibility approval."],
          });
        }
      }
    }
  }

  if (fmsChanged) {
    findings.push({
      code: "MSSP_IMPACT_002",
      severity: "info",
      status: "review-required",
      category: "fms-review",
      message: "FMS identity or architecture records changed.",
      path: fmsRoot,
      evidence: uniqueSorted(collection.changes.flatMap(changePaths).filter((path) => pathInside(fmsRoot, path)))
        .map((path): GitDiffImpactEvidence => ({ kind: "fms", message: `Changed FMS record: ${path}.`, uri: path })),
      suggestedActions: ["Verify that system narrative, module index, and architecture notes remain mutually consistent."],
    });
  }
  if (sclChanged) {
    findings.push({
      code: "MSSP_IMPACT_003",
      severity: "info",
      status: "review-required",
      category: "scl-review",
      message: "SCL governance records changed.",
      path: sclRoot,
      evidence: uniqueSorted(collection.changes.flatMap(changePaths).filter((path) => pathInside(sclRoot, path)))
        .map((path): GitDiffImpactEvidence => ({ kind: "policy", message: `Changed SCL record: ${path}.`, uri: path })),
      suggestedActions: ["Review authority, approval, activation, and forbidden-change contracts."],
    });
  }

  const edges = impactEdges(project);
  const queue = [...impacts.values()]
    .sort((a, b) => a.distance - b.distance || a.module.manifest.id.localeCompare(b.module.manifest.id))
    .map((impact) => impact.module.manifest.id);
  const queued = new Set(queue);

  while (queue.length) {
    const sourceId = queue.shift();
    if (!sourceId) continue;
    const sourceImpact = impacts.get(sourceId);
    if (!sourceImpact) continue;
    for (const edge of edges.filter((value) => value.source === sourceId)) {
      const target = modulesById.get(edge.target);
      if (!target) {
        findings.push({
          code: "MSSP_IMPACT_006",
          severity: "warning",
          status: "indeterminate",
          category: "mssp-vt",
          message: `Impact propagation references unknown module ${edge.target}.`,
          moduleId: sourceId,
          evidence: [{
            kind: "mssp-vt",
            message: `${sourceId} propagates to ${edge.target} through ${edge.kind}.`,
            moduleId: sourceId,
            data: { source: sourceId, target: edge.target, relation: edge.kind },
          }],
          suggestedActions: ["Correct or remove the stale MSSP-VT relation before approving compatibility."],
        });
        continue;
      }
      const existed = impacts.has(edge.target);
      const targetImpact = ensureImpact(impacts, target, sourceImpact.distance + 1);
      targetImpact.impactKinds.add(edge.kind);
      targetImpact.evidence.push({
        kind: "mssp-vt",
        message: `${sourceId} impacts ${edge.target} through ${edge.kind}.`,
        moduleId: edge.target,
        data: { source: sourceId, target: edge.target, relation: edge.kind },
      });
      if (!existed && !queued.has(edge.target)) {
        queue.push(edge.target);
        queued.add(edge.target);
      }
    }
  }

  for (const impact of impacts.values()) {
    if (!impact.direct && impact.distance > 0) {
      findings.push({
        code: "MSSP_IMPACT_010",
        severity: "info",
        status: "review-required",
        category: "mssp-vt",
        message: `MSSP-VT propagation marks ${impact.module.manifest.id} as transitively impacted.`,
        moduleId: impact.module.manifest.id,
        layer: impact.module.manifest.layer,
        evidence: impact.evidence.filter((value) => value.kind === "mssp-vt"),
        suggestedActions: ["Review declared compatibility ranges, change-impact notes, and regression tests."],
      });
    }
  }

  const impactedModules: GitDiffModuleImpact[] = [...impacts.values()]
    .map((impact): GitDiffModuleImpact => ({
      moduleId: impact.module.manifest.id,
      layer: impact.module.manifest.layer,
      direct: impact.direct,
      distance: impact.distance,
      changedFiles: uniqueSorted(impact.changedFiles),
      impactKinds: uniqueSorted(impact.impactKinds),
      evidence: impact.evidence.sort((a, b) =>
        `${a.kind}\u0000${a.uri ?? ""}\u0000${a.message}`
          .localeCompare(`${b.kind}\u0000${b.uri ?? ""}\u0000${b.message}`)
      ),
      requiredReviews: reviewsForModule(impact.module, impact.direct, project.manifest.policies.requireFmsReview),
    }))
    .sort((a, b) => a.distance - b.distance || a.moduleId.localeCompare(b.moduleId));
  const requiredReviews = aggregateReviews(project, impactedModules, fmsChanged, sclChanged, projectChanged);

  findings.sort((a, b) =>
    `${a.code}\u0000${a.moduleId ?? ""}\u0000${a.path ?? ""}\u0000${a.message}`
      .localeCompare(`${b.code}\u0000${b.moduleId ?? ""}\u0000${b.path ?? ""}\u0000${b.message}`)
  );
  const indeterminate = findings.filter((finding) => finding.status === "indeterminate").length;
  const status: GitDiffImpactReportStatus = indeterminate > 0
    ? "indeterminate"
    : impactedModules.length || requiredReviews.length
      ? "impact-detected"
      : "no-impact";
  const sourceModel: GitDiffImpactReport["sourceModel"] = {
    projectId: project.manifest.id,
    projectName: project.manifest.name,
    projectVersion: project.manifest.version,
  };
  if (options.revision) sourceModel.revision = options.revision;

  return {
    schemaVersion: MSSP_GIT_DIFF_IMPACT_VERSION,
    kind: MSSP_GIT_DIFF_IMPACT_KIND,
    generatedBy: {
      name: options.implementationName ?? "@evemisslab/mssp-core",
      version: options.implementationVersion ?? "0.1.0",
      adapter: "git-diff-impact-analyzer",
    },
    sourceModel,
    comparison: {
      base: collection.base,
      head: collection.head,
      comparisonMode: collection.comparisonMode,
      projectPath: collection.projectPath,
      totalChangedFiles: collection.totalChangedFiles,
      outsideProjectFiles: collection.outsideProjectFiles,
    },
    analysis: {
      mode: "static-conservative",
      semanticCompatibility: false,
      autoVersionBump: false,
      autoMutation: false,
    },
    changedFiles: collection.changes,
    impactedModules,
    requiredReviews,
    summary: {
      status,
      ok: indeterminate === 0,
      changedFiles: collection.changes.length,
      directModules: impactedModules.filter((impact) => impact.direct).length,
      transitiveModules: impactedModules.filter((impact) => !impact.direct).length,
      reviewRequirements: requiredReviews.length,
      indeterminate,
      totalFindings: findings.length,
    },
    findings,
  };
}

export function analyzeGitDiffImpact(project: LoadedProject, options: GitDiffImpactOptions): GitDiffImpactReport {
  const collection = collectGitDiffChanges(project.root, options.base, options.head ?? "HEAD");
  const buildOptions: Omit<GitDiffImpactOptions, "base" | "head"> = {};
  if (options.revision) buildOptions.revision = options.revision;
  if (options.implementationName) buildOptions.implementationName = options.implementationName;
  if (options.implementationVersion) buildOptions.implementationVersion = options.implementationVersion;
  return buildGitDiffImpactReport(project, collection, buildOptions);
}
