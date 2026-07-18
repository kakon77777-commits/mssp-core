import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { loadProject } from "../src/io.js";
import { validateLoadedProject } from "../src/validate.js";

const example = resolve("examples/hello-mssp");

function copyExample(): string {
  const root = mkdtempSync(join(tmpdir(), "mssp-test-"));
  cpSync(example, root, { recursive: true });
  return root;
}

describe("MSSP validation", () => {
  it("accepts the reference project", () => {
    const report = validateLoadedProject(loadProject(example));
    expect(report.ok).toBe(true);
    expect(report.diagnostics.filter((d) => d.level === "error")).toEqual([]);
  });

  it("rejects executable source in FMS", () => {
    const root = copyExample();
    writeFileSync(join(root, "FMS", "bad.ts"), "export const bad = true;\n");
    const report = validateLoadedProject(loadProject(root));
    expect(report.ok).toBe(false);
    expect(report.diagnostics.some((d) => d.code === "E_FMS_EXECUTABLE")).toBe(true);
  });

  it("rejects TMS-to-TMS runtime coupling", () => {
    const root = copyExample();
    const file = join(root, "TMS", "uppercase", "module.mssp.yaml");
    const manifest = YAML.parse(readFileSync(file, "utf8"));
    manifest.requires.modules = ["plugin.other"];
    writeFileSync(file, YAML.stringify(manifest));
    const otherDir = join(root, "TMS", "other");
    cpSync(join(root, "TMS", "uppercase"), otherDir, { recursive: true });
    const otherFile = join(otherDir, "module.mssp.yaml");
    const other = YAML.parse(readFileSync(otherFile, "utf8"));
    other.id = "plugin.other";
    other.name = "Other Plugin";
    other.requires.modules = ["core.echo"];
    writeFileSync(otherFile, YAML.stringify(other));
    const report = validateLoadedProject(loadProject(root));
    expect(report.ok).toBe(false);
    expect(report.diagnostics.some((d) => d.code === "E_LAYER_DEPENDENCY")).toBe(true);
  });

  it("rejects SMS depending on TMS", () => {
    const root = copyExample();
    const file = join(root, "SMS", "core", "module.mssp.yaml");
    const manifest = YAML.parse(readFileSync(file, "utf8"));
    manifest.requires.modules = ["plugin.uppercase"];
    writeFileSync(file, YAML.stringify(manifest));
    const report = validateLoadedProject(loadProject(root));
    expect(report.ok).toBe(false);
    expect(report.diagnostics.some((d) => d.code === "E_LAYER_DEPENDENCY")).toBe(true);
  });
});
