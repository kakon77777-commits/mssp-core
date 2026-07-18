import {
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  basename,
  dirname,
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
  IntermediateDiscoveryLanguage,
  IntermediateDiscoveryMarker,
  ModelEvidence,
  ModelSourceReference,
  MsspIntermediateModel,
} from "./model.js";

const SCANNER_ADAPTER = "repository-scanner";
const IMPLEMENTATION_NAME = "@evemisslab/mssp-core";
const IMPLEMENTATION_VERSION = "0.1.0";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".cache",
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

interface ScannedFile {
  absolute: string;
  path: string;
  extension: string;
  language?: string;
}

interface MarkerDefinition {
  kind: string;
  ecosystem: string;
  format: string;
}

interface MarkerMetadata {
  name?: string;
  version?: string;
}

interface CandidateDraft {
  path: string;
  name?: string;
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

function scannerSource(
  uri: string,
  format: string,
  revision?: string,
): ModelSourceReference {
  const source: ModelSourceReference = {
    kind: "scanner",
    uri,
    format,
    adapter: SCANNER_ADAPTER,
  };
  if (revision) source.revision = revision;
  return source;
}

function collectRepository(
  root: string,
  maxFiles: number,
): { files: ScannedFile[]; directories: string[]; truncated: boolean } {
  const files: ScannedFile[] = [];
  const directories = new Set<string>(["."]);
  let truncated = false;

  function walk(current: string): void {
    if (truncated) return;
    const entries = readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (truncated) return;
      if (entry.isSymbolicLink()) continue;
      const absolute = join(current, entry.name);
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
      const language = LANGUAGE_BY_EXTENSION.get(extension);
      const file: ScannedFile = {
        absolute,
        path: portablePath(root, absolute),
        extension,
      };
      if (language) file.language = language;
      files.push(file);
    }
  }

  walk(root);
  return {
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    directories: [...directories].sort((a, b) => a.localeCompare(b)),
    truncated,
  };
}

function markerDefinition(path: string): MarkerDefinition | undefined {
  const name = posix.basename(path);
  const exact = new Map<string, MarkerDefinition>([
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
  const definition = exact.get(name);
  if (definition) return definition;
  if (name.endsWith(".csproj")) {
    return { kind: "dotnet-project", ecosystem: "dotnet", format: "xml" };
  }
  if (name.endsWith(".sln")) {
    return { kind: "dotnet-solution", ecosystem: "dotnet", format: "solution" };
  }
  return undefined;
}

function section(text: string, name: string): string {
  const pattern = new RegExp(`\\[${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\]([\\s\\S]*?)(?=\\n\\s*\\[|$)`);
  return pattern.exec(text)?.[1] ?? "";
}

function quotedValue(text: string, key: string): string | undefined {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']`, "m");
  return pattern.exec(text)?.[1];
}

function parseMarkerMetadata(file: ScannedFile, definition: MarkerDefinition): MarkerMetadata {
  if (statSync(file.absolute).size > 1_000_000) return {};
  const text = readFileSync(file.absolute, "utf8");
  const name = posix.basename(file.path);

  try {
    if (name === "package.json") {
      const value = JSON.parse(text) as { name?: unknown; version?: unknown };
      const metadata: MarkerMetadata = {};
      if (typeof value.name === "string" && value.name) metadata.name = value.name;
      if (typeof value.version === "string" && value.version) metadata.version = value.version;
      return metadata;
    }
  } catch {
    return {};
  }

  if (name === "pyproject.toml") {
    const project = section(text, "project");
    const poetry = section(text, "tool.poetry");
    const metadata: MarkerMetadata = {};
    const inferredName = quotedValue(project, "name") ?? quotedValue(poetry, "name");
    const inferredVersion = quotedValue(project, "version") ?? quotedValue(poetry, "version");
    if (inferredName) metadata.name = inferredName;
    if (inferredVersion) metadata.version = inferredVersion;
    return metadata;
  }

  if (name === "Cargo.toml") {
    const packageSection = section(text, "package");
    const metadata: MarkerMetadata = {};
    const inferredName = quotedValue(packageSection, "name");
    const inferredVersion = quotedValue(packageSection, "version");
    if (inferredName) metadata.name = inferredName;
    if (inferredVersion) metadata.version = inferredVersion;
    return metadata;
  }

  if (name === "go.mod") {
    const moduleName = /^\s*module\s+([^\s]+)\s*$/m.exec(text)?.[1];
    return moduleName ? { name: moduleName } : {};
  }

  if (name === "project.godot") {
    const projectName = /^\s*config\/name\s*=\s*["']([^"']+)["']/m.exec(text)?.[1];
    return projectName ? { name: projectName } : {};
  }

  if (definition.kind === "maven-project") {
    const artifact = /<artifactId>\s*([^<]+)\s*<\/artifactId>/.exec(text)?.[1];
    const version = /<version>\s*([^<]+)\s*<\/version>/.exec(text)?.[1];
    const metadata: MarkerMetadata = {};
    if (artifact) metadata.name = artifact;
    if (version) metadata.version = version;
    return metadata;
  }

  if (definition.kind === "dotnet-project") {
    const assembly = /<AssemblyName>\s*([^<]+)\s*<\/AssemblyName>/.exec(text)?.[1];
    const version = /<Version>\s*([^<]+)\s*<\/Version>/.exec(text)?.[1];
    const metadata: MarkerMetadata = { name: assembly ?? name.replace(/\.csproj$/, "") };
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
    const definition = markerDefinition(file.path);
    if (!definition) continue;
    const metadata = parseMarkerMetadata(file, definition);
    const marker: IntermediateDiscoveryMarker = {
      kind: definition.kind,
      ecosystem: definition.ecosystem,
      path: file.path,
      boundaryPath: posix.dirname(file.path) === "" ? "." : posix.dirname(file.path),
      source: scannerSource(file.path, definition.format, revision),
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
  const counts = new Map<string, { files: number; extensions: Set<string> }>();
  for (const file of files) {
    if (!file.language) continue;
    const current = counts.get(file.language) ?? { files: 0, extensions: new Set<string>() };
    current.files += 1;
    if (file.extension) current.extensions.add(file.extension);
    counts.set(file.language, current);
  }
  return [...counts.entries()]
    .map(([id, value]) => ({
      id,
      files: value.files,
      extensions: [...value.extensions].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function slug(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "repository";
}

function candidateId(path: string): string {
  if (path === ".") return "candidate.repository";
  return `candidate.${path.split("/").map(slug).join(".")}`;
}

function filesWithin(files: readonly ScannedFile[], path: string): ScannedFile[] {
  if (path === ".") return [...files];
  const prefix = `${path}/`;
  return files.filter((file) => file.path === path || file.path.startsWith(prefix));
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
      if (!seen.has(evidenceKey(evidence))) existing.evidence.push(evidence);
    }
  }

  const rootSource = scannerSource(".", "directory", revision);
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
    const path = marker.boundaryPath;
    upsert({
      path,
      name: marker.name,
      boundaryKind: path === "." ? "repository" : "package",
      boundaryConfidence: path === "." ? 1 : 0.95,
      evidence: [{
        kind: "source",
        message: `${marker.kind} identifies a project or package boundary.`,
        source: marker.source,
        data: {
          ecosystem: marker.ecosystem,
          marker: marker.path,
        },
      }],
    });
  }

  for (const directory of directories) {
    const directoryName = posix.basename(directory);
    if (SOURCE_ROOTS.has(directoryName)) {
      const contained = filesWithin(files, directory);
      if (contained.some((file) => file.language)) {
        const source = scannerSource(directory, "directory", revision);
        upsert({
          path: directory,
          boundaryKind: "source-root",
          boundaryConfidence: 0.65,
          evidence: [{
            kind: "inference",
            message: `${directory} is a conventional source root containing source files.`,
            source,
            data: { convention: directoryName },
          }],
        });
      }
    }

    if (!CONTAINER_ROOTS.has(directoryName)) continue;
    for (const child of directories.filter((value) => posix.dirname(value) === directory)) {
      const contained = filesWithin(files, child);
      if (!contained.some((file) => file.language)) continue;
      const source = scannerSource(child, "directory", revision);
      upsert({
        path: child,
        boundaryKind: "directory",
        boundaryConfidence: 0.85,
        evidence: [{
          kind: "inference",
          message: `${child} is a source-bearing child of the conventional ${directoryName} container.`,
          source,
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
      const markerName = markers.find((marker) => marker.boundaryPath === draft.path)?.name;
      return {
        id: candidateId(draft.path),
        name: draft.name ?? markerName ?? (draft.path === "." ? basename(root) : posix.basename(draft.path)),
        path: draft.path,
        boundaryKind: draft.boundaryKind,
        boundaryConfidence: draft.boundaryConfidence,
        status: "unclassified",
        fileCount: contained.length,
        sourceFileCount: contained.filter((file) => file.language).length,
        languages,
        source: scannerSource(draft.path, "directory", revision),
        evidence: draft.evidence.sort((a, b) => evidenceKey(a).localeCompare(evidenceKey(b))),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function chooseProjectIdentity(
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
  const preferred = preferredKinds
    .map((kind) => rootMarkers.find((marker) => marker.kind === kind))
    .find((marker) => marker !== undefined);
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
  const identity = chooseProjectIdentity(root, markers);
  const projectSource = scannerSource(".", "directory", options.revision);
  const discovery = {
    root: "." as const,
    truncated: collected.truncated,
    ignoredDirectories: [...IGNORED_DIRECTORIES].sort((a, b) => a.localeCompare(b)),
    inventory: {
      files: collected.files.length,
      sourceFiles: collected.files.filter((file) => file.language).length,
      languages: languageInventory(collected.files),
    },
    markers,
  };
  if (options.revision) {
    Object.assign(discovery, { revision: options.revision });
  }

  return {
    schemaVersion: MSSP_INTERMEDIATE_MODEL_VERSION,
    kind: MSSP_INTERMEDIATE_MODEL_KIND,
    generatedBy: {
      name: options.implementationName ?? IMPLEMENTATION_NAME,
      version: options.implementationVersion ?? IMPLEMENTATION_VERSION,
      adapter: SCANNER_ADAPTER,
    },
    project: {
      ...identity,
      source: projectSource,
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
