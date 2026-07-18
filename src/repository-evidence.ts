import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, posix, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import type {
  IntermediateCandidate,
  IntermediateDiscoveryMarker,
  ModelEvidence,
  ModelSourceReference,
} from "./model.js";

export interface RepositoryEvidenceFile {
  absolute: string;
  path: string;
  extension: string;
  language?: string;
  generated: boolean;
}

export interface RepositoryIgnoreFile {
  path: string;
  basePath: string;
  patterns: string[];
  source: ModelSourceReference;
}

export interface RepositoryIgnoreSummary {
  files: RepositoryIgnoreFile[];
  ignoredFiles: number;
  ignoredDirectories: number;
}

export type RepositoryWorkspaceKind = "npm" | "pnpm" | "cargo";

export interface RepositoryWorkspace {
  kind: RepositoryWorkspaceKind;
  rootPath: string;
  patterns: string[];
  members: string[];
  source: ModelSourceReference;
}

export type RepositoryDependencyScope =
  | "internal"
  | "cross-boundary"
  | "workspace"
  | "external"
  | "unresolved";

export interface RepositoryStaticDependency {
  kind: "static-import";
  scope: RepositoryDependencyScope;
  from: string;
  to: string;
  targetKind: "candidate" | "external" | "unresolved";
  specifiers: string[];
  sourceFiles: string[];
  occurrences: number;
  evidence: ModelEvidence[];
}

export interface RepositoryGeneratedSummary {
  files: number;
  paths: string[];
}

export type ScannerSourceFactory = (
  uri: string,
  format: string,
) => ModelSourceReference;

interface IgnoreRule {
  negative: boolean;
  regex: RegExp;
}

function portablePath(root: string, value: string): string {
  const path = relative(root, value).replaceAll("\\", "/");
  return path || ".";
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globBody(pattern: string): string {
  let output = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        output += ".*";
        index += 1;
      } else {
        output += "[^/]*";
      }
      continue;
    }
    if (character === "?") {
      output += "[^/]";
      continue;
    }
    output += escapeRegex(character ?? "");
  }
  return output;
}

function compileIgnoreRule(basePath: string, rawPattern: string): IgnoreRule | undefined {
  let pattern = rawPattern.trim();
  if (!pattern || pattern.startsWith("#")) return undefined;

  let negative = false;
  if (pattern.startsWith("!")) {
    negative = true;
    pattern = pattern.slice(1);
  } else if (pattern.startsWith("\\!") || pattern.startsWith("\\#")) {
    pattern = pattern.slice(1);
  }
  if (!pattern) return undefined;

  const directoryOnly = pattern.endsWith("/");
  if (directoryOnly) pattern = pattern.slice(0, -1);
  const anchored = pattern.startsWith("/");
  if (anchored) pattern = pattern.slice(1);
  pattern = pattern.replaceAll("\\", "/");

  const base = basePath === "." ? "" : `${escapeRegex(basePath)}/`;
  const hasSlash = pattern.includes("/");
  const prefix = anchored || hasSlash ? base : `${base}(?:.*/)?`;
  const suffix = directoryOnly || !pattern.includes(".") ? "(?:/.*)?" : "";
  return {
    negative,
    regex: new RegExp(`^${prefix}${globBody(pattern)}${suffix}$`),
  };
}

export class GitIgnoreEvaluator {
  readonly summaries: RepositoryIgnoreFile[] = [];
  readonly rules: IgnoreRule[] = [];
  ignoredFiles = 0;
  ignoredDirectories = 0;

  constructor(
    private readonly root: string,
    private readonly source: ScannerSourceFactory,
  ) {}

  enter(directory: string): void {
    const file = join(directory, ".gitignore");
    if (!existsSync(file) || !statSync(file).isFile()) return;
    const path = portablePath(this.root, file);
    if (this.summaries.some((summary) => summary.path === path)) return;
    const basePath = portablePath(this.root, directory);
    const patterns = readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    this.summaries.push({
      path,
      basePath,
      patterns: [...patterns],
      source: this.source(path, "gitignore"),
    });
    for (const pattern of patterns) {
      const rule = compileIgnoreRule(basePath, pattern);
      if (rule) this.rules.push(rule);
    }
  }

  isIgnored(path: string): boolean {
    let ignored = false;
    for (const rule of this.rules) {
      if (rule.regex.test(path)) ignored = !rule.negative;
    }
    return ignored;
  }

  summary(): RepositoryIgnoreSummary {
    return {
      files: [...this.summaries].sort((a, b) => a.path.localeCompare(b.path)),
      ignoredFiles: this.ignoredFiles,
      ignoredDirectories: this.ignoredDirectories,
    };
  }
}

export function isGeneratedSource(path: string): boolean {
  const normalized = path.toLowerCase();
  const segments = normalized.split("/");
  const name = segments.at(-1) ?? normalized;
  return segments.includes("generated")
    || segments.includes("gen")
    || /\.generated\.[^.]+$/.test(name)
    || /\.g\.(?:cs|dart)$/.test(name)
    || /_pb2\.py$/.test(name)
    || /(?:^|\.)min\.(?:js|css)$/.test(name);
}

function wildcardRegex(pattern: string): RegExp {
  const normalized = pattern.replace(/^\.\//, "").replace(/\/$/, "");
  return new RegExp(`^${globBody(normalized)}(?:/.*)?$`);
}

function parseQuotedArray(text: string, key: string): string[] {
  const match = new RegExp(`${key}\\s*=\\s*\\[([\\s\\S]*?)\\]`, "m").exec(text);
  if (!match?.[1]) return [];
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((value) => value[1] ?? "").filter(Boolean);
}

function workspaceMembers(
  rootPath: string,
  patterns: readonly string[],
  candidates: readonly IntermediateCandidate[],
): string[] {
  const basePrefix = rootPath === "." ? "" : `${rootPath}/`;
  const matchers = patterns.map(wildcardRegex);
  return candidates
    .filter((candidate) => candidate.path !== rootPath && candidate.boundaryKind !== "source-root")
    .filter((candidate) => candidate.path.startsWith(basePrefix))
    .filter((candidate) => {
      const local = candidate.path.slice(basePrefix.length);
      return matchers.some((matcher) => matcher.test(local));
    })
    .map((candidate) => candidate.path)
    .sort((a, b) => a.localeCompare(b));
}

export function discoverWorkspaces(
  files: readonly RepositoryEvidenceFile[],
  candidates: readonly IntermediateCandidate[],
  source: ScannerSourceFactory,
): RepositoryWorkspace[] {
  const workspaces: RepositoryWorkspace[] = [];

  for (const file of files) {
    const name = posix.basename(file.path);
    if (statSync(file.absolute).size > 1_000_000) continue;
    const text = readFileSync(file.absolute, "utf8");
    const rootPath = posix.dirname(file.path);

    if (name === "package.json") {
      try {
        const value = JSON.parse(text) as {
          workspaces?: unknown;
        };
        const raw = Array.isArray(value.workspaces)
          ? value.workspaces
          : value.workspaces && typeof value.workspaces === "object"
            ? (value.workspaces as { packages?: unknown }).packages
            : undefined;
        const patterns = Array.isArray(raw)
          ? raw.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
          : [];
        if (patterns.length) {
          workspaces.push({
            kind: "npm",
            rootPath,
            patterns: [...patterns].sort((a, b) => a.localeCompare(b)),
            members: workspaceMembers(rootPath, patterns, candidates),
            source: source(file.path, "json"),
          });
        }
      } catch {
        // Invalid package metadata remains a marker-level observation only.
      }
    }

    if (name === "pnpm-workspace.yaml") {
      try {
        const value = parseYaml(text) as { packages?: unknown } | undefined;
        const patterns = Array.isArray(value?.packages)
          ? value.packages.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
          : [];
        if (patterns.length) {
          workspaces.push({
            kind: "pnpm",
            rootPath,
            patterns: [...patterns].sort((a, b) => a.localeCompare(b)),
            members: workspaceMembers(rootPath, patterns, candidates),
            source: source(file.path, "yaml"),
          });
        }
      } catch {
        // Invalid workspace YAML is not executed or guessed.
      }
    }

    if (name === "Cargo.toml" && /^\s*\[workspace\]\s*$/m.test(text)) {
      const section = /\[workspace\]([\s\S]*?)(?=\n\s*\[|$)/m.exec(text)?.[1] ?? "";
      const patterns = parseQuotedArray(section, "members");
      if (patterns.length) {
        workspaces.push({
          kind: "cargo",
          rootPath,
          patterns: [...patterns].sort((a, b) => a.localeCompare(b)),
          members: workspaceMembers(rootPath, patterns, candidates),
          source: source(file.path, "toml"),
        });
      }
    }
  }

  return workspaces.sort((a, b) =>
    `${a.kind}\u0000${a.source.uri}`.localeCompare(`${b.kind}\u0000${b.source.uri}`),
  );
}

export function refineCandidatesWithWorkspaces(
  candidates: readonly IntermediateCandidate[],
  workspaces: readonly RepositoryWorkspace[],
): IntermediateCandidate[] {
  return candidates.map((candidate) => {
    const memberships = workspaces.filter((workspace) => workspace.members.includes(candidate.path));
    if (!memberships.length) return candidate;
    const evidence = [...candidate.evidence];
    for (const workspace of memberships) {
      evidence.push({
        kind: "source",
        message: `${candidate.path} is selected by a declared ${workspace.kind} workspace pattern.`,
        source: workspace.source,
        data: {
          workspaceKind: workspace.kind,
          workspaceRoot: workspace.rootPath,
          patterns: workspace.patterns,
        },
      });
    }
    return {
      ...candidate,
      boundaryKind: candidate.boundaryKind === "repository" ? "repository" : "package",
      boundaryConfidence: Math.max(candidate.boundaryConfidence, 0.98),
      evidence: evidence.sort((a, b) =>
        `${a.kind}\u0000${a.message}\u0000${a.source?.uri ?? ""}`
          .localeCompare(`${b.kind}\u0000${b.message}\u0000${b.source?.uri ?? ""}`),
      ),
    };
  });
}

function extractSpecifiers(file: RepositoryEvidenceFile): string[] {
  if (!file.language || file.generated || statSync(file.absolute).size > 512_000) return [];
  const text = readFileSync(file.absolute, "utf8");
  const values: string[] = [];
  const add = (value: string | undefined): void => {
    if (value && !values.includes(value)) values.push(value);
  };

  if (["typescript", "javascript", "svelte", "vue"].includes(file.language)) {
    for (const match of text.matchAll(/(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g)) add(match[1]);
    for (const match of text.matchAll(/(?:require|import)\s*\(\s*["']([^"']+)["']\s*\)/g)) add(match[1]);
  } else if (file.language === "python") {
    for (const match of text.matchAll(/^\s*from\s+([.A-Za-z_][\w.]*)\s+import\s+/gm)) add(match[1]);
    for (const match of text.matchAll(/^\s*import\s+([^#\n]+)/gm)) {
      for (const part of (match[1] ?? "").split(",")) add(part.trim().split(/\s+as\s+/)[0]);
    }
  } else if (file.language === "go") {
    for (const match of text.matchAll(/["`]([^"`\n]+)["`]/g)) add(match[1]);
  } else if (file.language === "rust") {
    for (const match of text.matchAll(/^\s*use\s+([A-Za-z_][\w:]*)/gm)) add(match[1]);
  } else if (file.language === "gdscript") {
    for (const match of text.matchAll(/(?:preload|load)\s*\(\s*["']([^"']+)["']\s*\)/g)) add(match[1]);
  }

  return values.sort((a, b) => a.localeCompare(b));
}

function ownerCandidate(
  path: string,
  candidates: readonly IntermediateCandidate[],
): IntermediateCandidate | undefined {
  const contains = (candidate: IntermediateCandidate): boolean =>
    candidate.path === "." || path === candidate.path || path.startsWith(`${candidate.path}/`);
  const byDepth = (a: IntermediateCandidate, b: IntermediateCandidate): number =>
    b.path.split("/").length - a.path.split("/").length;
  const packageOwner = candidates
    .filter((candidate) => candidate.boundaryKind === "package" && contains(candidate))
    .sort(byDepth)[0];
  if (packageOwner) return packageOwner;
  const directoryOwner = candidates
    .filter((candidate) => candidate.boundaryKind === "directory" && contains(candidate))
    .sort(byDepth)[0];
  if (directoryOwner) return directoryOwner;
  const sourceOwner = candidates
    .filter((candidate) => candidate.boundaryKind === "source-root" && contains(candidate))
    .sort(byDepth)[0];
  if (sourceOwner) return sourceOwner;
  return candidates.find((candidate) => candidate.path === ".");
}

const RESOLUTION_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go", ".gd", ".java", ".kt", ".cs",
];

function resolveRelativeTarget(
  file: RepositoryEvidenceFile,
  specifier: string,
  knownFiles: ReadonlySet<string>,
): string | undefined {
  let target: string | undefined;
  if (specifier.startsWith("res://")) {
    target = specifier.slice("res://".length);
  } else if (specifier.startsWith(".")) {
    if (file.language === "python") {
      const dots = /^\.+/.exec(specifier)?.[0].length ?? 0;
      const rest = specifier.slice(dots).replaceAll(".", "/");
      let base = posix.dirname(file.path);
      for (let count = 1; count < dots; count += 1) base = posix.dirname(base);
      target = posix.normalize(posix.join(base, rest));
    } else {
      target = posix.normalize(posix.join(posix.dirname(file.path), specifier));
    }
  }
  if (!target) return undefined;

  const candidates = [target];
  if (!extname(target)) {
    for (const extension of RESOLUTION_EXTENSIONS) candidates.push(`${target}${extension}`);
    for (const extension of RESOLUTION_EXTENSIONS) candidates.push(`${target}/index${extension}`);
    candidates.push(`${target}/__init__.py`);
  }
  return candidates.find((candidate) => knownFiles.has(candidate));
}

function workspaceTarget(
  specifier: string,
  markers: readonly IntermediateDiscoveryMarker[],
  workspaces: readonly RepositoryWorkspace[],
  candidates: readonly IntermediateCandidate[],
): IntermediateCandidate | undefined {
  const memberPaths = new Set(workspaces.flatMap((workspace) => workspace.members));
  const marker = markers.find((value) =>
    value.name
      && memberPaths.has(value.boundaryPath)
      && (specifier === value.name || specifier.startsWith(`${value.name}/`)),
  );
  if (!marker) return undefined;
  return candidates.find((candidate) => candidate.path === marker.boundaryPath);
}

export function discoverStaticDependencies(
  files: readonly RepositoryEvidenceFile[],
  candidates: readonly IntermediateCandidate[],
  markers: readonly IntermediateDiscoveryMarker[],
  workspaces: readonly RepositoryWorkspace[],
  source: ScannerSourceFactory,
): RepositoryStaticDependency[] {
  const knownFiles = new Set(files.map((file) => file.path));
  const aggregate = new Map<string, {
    scope: RepositoryDependencyScope;
    from: string;
    to: string;
    targetKind: "candidate" | "external" | "unresolved";
    specifiers: Set<string>;
    sourceFiles: Set<string>;
    occurrences: number;
  }>();

  for (const file of files) {
    const from = ownerCandidate(file.path, candidates);
    if (!from) continue;
    for (const specifier of extractSpecifiers(file)) {
      const resolved = resolveRelativeTarget(file, specifier, knownFiles);
      const resolvedOwner = resolved ? ownerCandidate(resolved, candidates) : undefined;
      const workspace = !resolved ? workspaceTarget(specifier, markers, workspaces, candidates) : undefined;

      let scope: RepositoryDependencyScope;
      let to: string;
      let targetKind: "candidate" | "external" | "unresolved";
      if (resolvedOwner) {
        scope = resolvedOwner.id === from.id ? "internal" : "cross-boundary";
        to = resolvedOwner.id;
        targetKind = "candidate";
      } else if (workspace) {
        scope = "workspace";
        to = workspace.id;
        targetKind = "candidate";
      } else if (specifier.startsWith(".") || specifier.startsWith("res://")) {
        scope = "unresolved";
        to = `unresolved:${specifier}`;
        targetKind = "unresolved";
      } else {
        scope = "external";
        to = `external:${specifier}`;
        targetKind = "external";
      }

      const key = `${scope}\u0000${from.id}\u0000${to}`;
      const current = aggregate.get(key) ?? {
        scope,
        from: from.id,
        to,
        targetKind,
        specifiers: new Set<string>(),
        sourceFiles: new Set<string>(),
        occurrences: 0,
      };
      current.specifiers.add(specifier);
      current.sourceFiles.add(file.path);
      current.occurrences += 1;
      aggregate.set(key, current);
    }
  }

  return [...aggregate.values()]
    .map((value): RepositoryStaticDependency => {
      const specifiers = [...value.specifiers].sort((a, b) => a.localeCompare(b));
      const sourceFiles = [...value.sourceFiles].sort((a, b) => a.localeCompare(b));
      const firstSource = sourceFiles[0] ?? ".";
      return {
        kind: "static-import",
        scope: value.scope,
        from: value.from,
        to: value.to,
        targetKind: value.targetKind,
        specifiers,
        sourceFiles,
        occurrences: value.occurrences,
        evidence: [{
          kind: "dependency",
          message: `Static source references connect ${value.from} to ${value.to}.`,
          source: source(firstSource, "source"),
          data: {
            parser: "static-regex-v0.2",
            scope: value.scope,
            specifiers,
            sourceFiles,
            occurrences: value.occurrences,
          },
        }],
      };
    })
    .sort((a, b) =>
      `${a.scope}\u0000${a.from}\u0000${a.to}`.localeCompare(`${b.scope}\u0000${b.from}\u0000${b.to}`),
    );
}

export function generatedSummary(files: readonly RepositoryEvidenceFile[]): RepositoryGeneratedSummary {
  const paths = files.filter((file) => file.generated).map((file) => file.path).sort((a, b) => a.localeCompare(b));
  return { files: paths.length, paths };
}
