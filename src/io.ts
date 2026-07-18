import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";
import type {
  LoadedModule,
  LoadedProject,
  MsspModuleManifest,
  MsspProjectManifest,
} from "./types.js";

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage", ".tmp"]);

export function parseYamlFile<T>(file: string): T {
  const text = readFileSync(file, "utf8");
  const parsed = YAML.parse(text) as T | null;
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`YAML document is empty or not an object: ${file}`);
  }
  return parsed;
}

export function findProjectRoot(start = process.cwd()): string {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, "mssp.yaml"))) return current;
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(`No mssp.yaml found from ${resolve(start)} upward.`);
    }
    current = parent;
  }
}

export function walkFiles(root: string): string[] {
  const output: string[] = [];
  if (!existsSync(root)) return output;

  for (const entry of readdirSync(root)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) output.push(...walkFiles(path));
    else output.push(path);
  }
  return output;
}

export function discoverModuleManifestFiles(root: string): string[] {
  return walkFiles(root)
    .filter((file) => file.endsWith(".mssp.yaml") || file.endsWith(".mssp.yml"))
    .sort();
}

export function loadProject(input = process.cwd()): LoadedProject {
  const root = existsSync(join(resolve(input), "mssp.yaml"))
    ? resolve(input)
    : findProjectRoot(input);
  const manifestFile = join(root, "mssp.yaml");
  const manifest = parseYamlFile<MsspProjectManifest>(manifestFile);
  const modules: LoadedModule[] = discoverModuleManifestFiles(root).map((file) => ({
    file,
    directory: dirname(file),
    manifest: parseYamlFile<MsspModuleManifest>(file),
  }));

  return { root, manifestFile, manifest, modules };
}
