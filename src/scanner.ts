import { readFileSync, readdirSync, statSync } from "node:fs";
import {
  basename,
  extname,
  join,
  posix,
  relative,
  resolve,
} from "node:path";
import {
  MSSP_INTERMEDIATE_MODEL_KIND,
  MSSP_INTERMEDIATE_MODEL_VERSION,
} from "./model.js";
import type {
  CandidateBoundaryKind,
  IntermediateCandidate,
  IntermediateDiscovery,
  IntermediateDiscoveryLanguage,
  IntermediateDiscoveryMarker,
  ModelEvidence,
  ModelSourceReference,
  MsspIntermediateModel,
} from "./model.js";

const ADAPTER = "repository-scanner";
const IMPLEMENTATION_NAME = "@evemisslab/mssp-core";
const IMPLEMENTATION_VERSION = "0.1.0";

const IGNORED_DIRECTORIES = new Set([
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

const SOURCE_ROOTS = new Set(["app", "lib", "src"]);
const CONTAINER_ROOTS = new Set([
  "addons",
  "apps",
  "crates",
  "modules",
  "packages",
  "plugins",
  "services",
]);

const LANGUAGE_BY_EXTENSION = new Map<string, string>([
  [".bash", "shell"],
  [".c", "c"],
  [".cc", "cpp"],
  [".cpp", "cpp"],
  [".cs", "csharp"],
  [".cjs", "javascript"],
  [".css", "css"],
  [".ex", "elixir"],
  [".exs", "elixir"],
  [".gd", "gdscript"],
  [".go", "go"],
  [".h", "c"],
  [".hpp", "cpp"],
  [".html", "html"],
  [".java", "java"],
  [".js", "javascript"],
  [".jsx", "javascript"],
  [".kt", "kotlin"],
  [".kts", "kotlin"],
  [".lua", "lua"],
  [".mjs", "javascript"],
  [".php", "php"],
  [".py", "python"],
  [".rb", "ruby"],
  [".rs", "rust"],
  [".scala", "scala"],
  [".sh", "shell"],
  [".sql", "sql"],
  [".svelte", "svelte"],
  [".swift", "swift"],
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".vue", "vue"],
  [".zsh", "shell"],
]);

interface MarkerSpec {
  kind: string;
  ecosystem: string;
  format: string;
}

const MARKERS = new Map<string, MarkerSpec>([
  ["Cargo.toml", { kind: "cargo-manifest", ecosystem: "rust", format: "toml" }],
  ["build.gradle", { kind: "gradle-build", ecosystem: "jvm", format: "gradle" }],
  ["build.gradle.kts", { kind: "gradle-build", ecosystem: "jvm", format: "kotlin" }],
  ["go.mod", { kind: "go-module", ecosystem: "go", format: "go-mod" }],
  ["package.json", { kind: "node-package", ecosystem: "node", format: "json" }],
  ["pom.xml", { kind: "maven-project", ecosystem: "jvm", format: "xml" }],
  ["project.godot", { kind: "godot-project", ecosystem: "godot", format: "godot" }],
  ["pyproject.toml", { kind: "python-project", ecosystem: "python", format: "toml" }],
  ["setup.py", { kind: "python-setup", ecosystem: "python", format: "python" }],
]);

interface ScannedFile {
  absolute: string;
  path: string;
  extension: string;
  language?: string;
}

interface MarkerMetadata {
  name?: string;
  version?: string;
}

interface CandidateDraft {
  path: string;
  name?: string | undefined;
  boundaryKind: CandidateBoundaryKind;
  boundaryConfidence: number;
  evidence: ModelEvidence[];
}

export interface RepositoryScannerOptions {
  revision?: string;
  maxFiles?: number;
  implementationName?: string;
  implementationVersion?: string;
}

function portablePath(root: string, value: string): string {
  const path = relative(root, value).replaceAll("\\", "/");
  return path || ".";
}

function source(
  uri: string,
  format: string,
  revision?: string,
): ModelSourceReference {
  const value: ModelSourceReference = {
    kind: "scanner",
    uri,
    format,
    adapter: ADAPTER,
  };
  if (revision) value.revision = revision;
  return value;
}

function collectRepository(
  root: string,
  maxFiles: number,
): { files: ScannedFile[]; directories: string[]; truncated: boolean } {
  const files: ScannedFile[] = [];
  const directories = new Set<string>(["."]);
  let truncated = false;

  function walk(directory: string): void {
    if (truncated) return;
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (truncated) return;
      if (entry.isSymbolicLink()) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        directories.add(portablePath(root, absolute));
        walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      if (files.length >= maxFiles) {
        truncated = true;
        return;
      }
      const extension = extname(entry.name).toLowerCase();
      const record: ScannedFile = {
        absolute,
        path: portablePath(root, absolute),
        extension,
      };
      const language = LANGUAGE_BY_EXTENSION.get(extension);
      if (language) record.language = language;
      files.push(record);
    }
  }

  walk(root);
  return {
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    directories: [...directories].sort((a, b) => a.localeCompare(b)),
    truncated,
  };
}

function markerSpec(path: string): MarkerSpec | undefined {
  const name = posix.basename(path);
  const exact = MARKERS.get(name);
  if (exact) return exact;
  if (name.endsWith(".csproj")) {
    return { kind: "dotnet-project", ecosystem: "dotnet", format: "xml" };
  }
  if (name.endsWith(".sln")) {
    return { kind: "dotnet-solution", ecosystem: "dotnet", format: "solution" };
  }
  return undefined;
}

function tomlSection(text: string, name: string): string {
  const escaped = name.split(".").join("\\.");
  const pattern = new RegExp(`\\[${escaped}\\]([\\s\\S]*?)(?=\\n\\s*\\[|$)`);
  return pattern.exec(text)?.[1] ?? "";
}

function quotedValue(text: string, key: string): string | undefined {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']`, "m");
  return pattern.exec(text)?.[1];
}

function parseMarkerMetadata(file: ScannedFile, spec: MarkerSpec): MarkerMetadata {
  if (statSync(file.absolute).size > 1_000_000) return {};
  const text = readFileSync(file.absolute, "utf8");
  const fileName = posix.basename(file.path);

  if (fileName === "package.json") {
    try {
      const parsed = JSON.parse(text) as { name?: unknown; version?: unknown };
      const metadata: MarkerMetadata = {};
      if (typeof parsed.name === "string" && parsed.name) metadata.name = parsed.name;
      if (typeof parsed.version === "string" && parsed.version) metadata.version = parsed.version;
      return metadata;
    } catch {
      return {};
    }
  }

  if (fileName === "pyproject.toml") {
    const project = tomlSection(text, "project");
    const poetry = tomlSection(text, "tool.poetry");
    const metadata: MarkerMetadata = {};
    const name = quotedValue(project, "name") ?? quotedValue(poetry, "name");
    const version = quotedValue(project, "version") ?? quotedValue(poetry, "version");
    if (name) metadata.name = name;
    if (version) metadata.version = version;
    return metadata;
  }

  if (fileName === "Cargo.toml") {
    const packageSection = tomlSection(text, "package");
    const metadata: MarkerMetadata = {};
    const name = quotedValue(packageSection, "name");
    const version = quotedValue(packageSection, "version");
    if (name) metadata.name = name;
    if (version) metadata.version = version;
    return metadata;
  }

  if (fileName === "go.mod") {
    const name = /^\s*module\s+([^\s]+)\s*$/m.exec(text)?.[1];
    return name ? { name } : {};
  }

  if (fileName === "project.godot") {
    const name = /^\s*config\/name\s*=\s*["']([^"']+)["']/m.exec(text)?.[1];
    return name ? { name } : {};
  }

  if (spec.kind === "maven-project") {
    const metadata: MarkerMetadata = {};
    const name = /<artifactId>\s*([^<]+)\s*<\/artifactId>/.exec(text)?.[1];
    const version = /<version>\s*([^<]+)\s*<\/version>/.exec(text)?.[1];
    if (name) metadata.name = name;
    if (version) metadata.version = version;
    return metadata;
  }

  if (spec.kind === "dotnet-project") {
    const metadata: MarkerMetadata = {
      name: /<AssemblyName>\s*([^<]+)\s*<\/AssemblyName>/.exec(text)?.[1]
        ?? fileName.replace(/\.csproj$/, ""),
    };
    const version = /<Version>\s*([^<]+)\s*<\/Version>/.exec(text)?.[1];
    if (version) metadata.version = version;
    return metadata;
  }

  return {};
}

function discoverMarkers(
  files: readonly ScannedFile[],
  revision?: string,
): IntermediateDiscoveryMarker[] {
  const markers: IntermediateDiscoveryMarker[] = [];
  for (const file of files) {
    const spec = markerSpec(file.path);
    if (!spec) continue;
    const metadata = parseMarkerMetadata(file, spec);
    const marker: IntermediateDiscoveryMarker = {
      kind: spec.kind,
      ecosystem: spec.ecosystem,
      path: file.path,
      boundaryPath: posix.dirname(file.path),
      source: source(file.path, spec.format, revision),
    };
    if (metadata.name) marker.name = metadata.name;
    if (metadata.version) marker.version = metadata.version;
    markers.push(marker);
  }
  return markers.sort((a, b) =>
    `${a.path}\u0000${a.kind}`.localeCompare(`${b.path}\u0000${b.kind}`),
  );
}

function languageInventory(files: readonly ScannedFile[]): IntermediateDiscoveryLanguage[] {
  const values = new Map<string, { files: number; extensions: Set<string> }>();
  for (const file of files) {
    if (!file.language) continue;
    const current = values.get(file.language) ?? {
      files: 0,
      extensions: new Set<string>(),
    };
    current.files += 1;
    if (file.extension) current.extensions.add(file.extension);
    values.set(file.language, current);
  }
  return [...values.entries()]
    .map(([id, value]) => ({
      id,
      files: value.files,
      extensions: [...value.extensions].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function slug(value: string): string {
  const result = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return result || "repository";
}

function candidateId(path: string): string {
  if (path === ".") return "candidate.repository";
  return `candidate.${path.split("/").map(slug).join(".")}`;
}

function filesWithin(files: readonly ScannedFile[], path: string): ScannedFile[] {
  if (path === ".") return [...files];
  const prefix = `${path}/`;
  return files.filter((file) => file.path.startsWith(prefix));
}

function evidenceKey(evidence: ModelEvidence): string {
  return `${evidence.kind}\u0000${evidence.message}\u0000${evidence.source?.uri ?? ""}`;
}

function discoverCandidates(
  root: string,
  files: readonly ScannedFile[],
  directories: readonly string[],
  markers: readonly IntermediateDiscoveryMarker[],
  revision?: string,
): IntermediateCandidate[] {
  const drafts = new Map<string, CandidateDraft>();
  const priority: Record<CandidateBoundaryKind, number> = {
    repository: 4,
    package: 3,
    directory: 2,
    "source-root": 1,
  };

  function upsert(draft: CandidateDraft): void {
    const existing = drafts.get(draft.path);
    if (!existing) {
      drafts.set(draft.path, draft);
      return;
    }
    if (priority[draft.boundaryKind] > priority[existing.boundaryKind]) {
      existing.boundaryKind = draft.boundaryKind;
    }
    existing.boundaryConfidence = Math.max(
      existing.boundaryConfidence,
      draft.boundaryConfidence,
    );
    if (!existing.name && draft.name) existing.name = draft.name;
    const seen = new Set(existing.evidence.map(evidenceKey));
    for (const evidence of draft.evidence) {
      const key = evidenceKey(evidence);
      if (!seen.has(key)) {
        existing.evidence.push(evidence);
        seen.add(key);
      }
    }
  }

  const rootSource = source(".", "directory", revision);
  upsert({
    path: ".",
    name: basename(root),
    boundaryKind: "repository",
    boundaryConfidence: 1,
    evidence: [{
      kind: "source",
      message: "Repository root is an explicit scan boundary.",
      source: rootSource,
    }],
  });

  for (const marker of markers) {
    const draft: CandidateDraft = {
      path: marker.boundaryPath,
      boundaryKind: marker.boundaryPath === "." ? "repository" : "package",
      boundaryConfidence: marker.boundaryPath === "." ? 1 : 0.95,
      evidence: [{
        kind: "source",
        message: `${marker.kind} identifies a project or package boundary.`,
        source: marker.source,
        data: {
          ecosystem: marker.ecosystem,
          marker: marker.path,
        },
      }],
    };
    if (marker.name) draft.name = marker.name;
    upsert(draft);
  }

  for (const directory of directories) {
    const name = posix.basename(directory);
    const contained = filesWithin(files, directory);

    if (SOURCE_ROOTS.has(name) && contained.some((file) => file.language)) {
      const candidateSource = source(directory, "directory", revision);
      upsert({
        path: directory,
        boundaryKind: "source-root",
        boundaryConfidence: 0.65,
        evidence: [{
          kind: "inference",
          message: `${directory} is a conventional source root containing source files.`,
          source: candidateSource,
          data: { convention: name },
        }],
      });
    }

    if (!CONTAINER_ROOTS.has(name)) continue;
    const children = directories.filter((value) => posix.dirname(value) === directory);
    for (const child of children) {
      if (!filesWithin(files, child).some((file) => file.language)) continue;
      const candidateSource = source(child, "directory", revision);
      upsert({
        path: child,
        boundaryKind: "directory",
        boundaryConfidence: 0.85,
        evidence: [{
          kind: "inference",
          message: `${child} is a source-bearing child of the conventional ${name} container.`,
          source: candidateSource,
          data: { container: directory },
        }],
      });
    }
  }

  return [...drafts.values()]
    .map((draft): IntermediateCandidate => {
      const contained = filesWithin(files, draft.path);
      const languages = [...new Set(
        contained.flatMap((file) => file.language ? [file.language] : []),
      )].sort((a, b) => a.localeCompare(b));
      return {
        id: candidateId(draft.path),
        name: draft.name ?? (draft.path === "." ? basename(root) : posix.basename(draft.path)),
        path: draft.path,
        boundaryKind: draft.boundaryKind,
        boundaryConfidence: draft.boundaryConfidence,
        status: "unclassified",
        fileCount: contained.length,
        sourceFileCount: contained.filter((file) => file.language).length,
        languages,
        source: source(draft.path, "directory", revision),
        evidence: draft.evidence.sort((a, b) => evidenceKey(a).localeCompare(evidenceKey(b))),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function chooseIdentity(
  root: string,
  markers: readonly IntermediateDiscoveryMarker[],
): { id: string; name: string; version: string } {
  const rootMarkers = markers.filter((marker) => marker.boundaryPath === ".");
  const preferredKinds = [
    "node-package",
    "python-project",
    "cargo-manifest",
    "go-module",
    "godot-project",
    "maven-project",
    "dotnet-project",
  ];
  let preferred: IntermediateDiscoveryMarker | undefined;
  for (const kind of preferredKinds) {
    const match = rootMarkers.find((marker) => marker.kind === kind);
    if (match) {
      preferred = match;
      break;
    }
  }
  const name = preferred?.name ?? basename(root);
  return {
    id: `discovered.${slug(name)}`,
    name,
    version: preferred?.version ?? "0.0.0-unknown",
  };
}

export function scanRepository(
  input = process.cwd(),
  options: RepositoryScannerOptions = {},
): MsspIntermediateModel {
  const root = resolve(input);
  const maxFiles = options.maxFiles ?? 50_000;
  if (!Number.isInteger(maxFiles) || maxFiles < 1) {
    throw new Error("Repository scanner maxFiles must be a positive integer.");
  }

  const collected = collectRepository(root, maxFiles);
  const markers = discoverMarkers(collected.files, options.revision);
  const candidates = discoverCandidates(
    root,
    collected.files,
    collected.directories,
    markers,
    options.revision,
  );
  const identity = chooseIdentity(root, markers);
  const discovery: IntermediateDiscovery = {
    root: ".",
    truncated: collected.truncated,
    ignoredDirectories: [...IGNORED_DIRECTORIES].sort((a, b) => a.localeCompare(b)),
    inventory: {
      files: collected.files.length,
      sourceFiles: collected.files.filter((file) => file.language).length,
      languages: languageInventory(collected.files),
    },
    markers,
  };
  if (options.revision) discovery.revision = options.revision;

  return {
    schemaVersion: MSSP_INTERMEDIATE_MODEL_VERSION,
    kind: MSSP_INTERMEDIATE_MODEL_KIND,
    generatedBy: {
      name: options.implementationName ?? IMPLEMENTATION_NAME,
      version: options.implementationVersion ?? IMPLEMENTATION_VERSION,
      adapter: ADAPTER,
    },
    project: {
      ...identity,
      source: source(".", "directory", options.revision),
      metadata: {
        inferred: true,
        classificationStatus: "unclassified",
      },
    },
    layers: [],
    modules: [],
    candidates,
    relations: [],
    policies: [],
    discovery,
  };
}
