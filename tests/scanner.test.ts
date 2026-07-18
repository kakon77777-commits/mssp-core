import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { validateIntermediateModelSchema } from "../src/schema.js";
import { scanRepository } from "../src/scanner.js";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "mssp-scan-"));
  mkdirSync(join(root, "src", "core"), { recursive: true });
  mkdirSync(join(root, "packages", "plugin", "src"), { recursive: true });
  mkdirSync(join(root, "node_modules", "ignored"), { recursive: true });
  mkdirSync(join(root, "dist"), { recursive: true });

  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "scan-demo",
    version: "1.2.3",
    workspaces: ["packages/*"],
  }, null, 2));
  writeFileSync(join(root, "src", "core", "index.ts"), "export const core = true;\n");
  writeFileSync(join(root, "packages", "plugin", "package.json"), JSON.stringify({
    name: "@scan/plugin",
    version: "0.4.0",
  }, null, 2));
  writeFileSync(join(root, "packages", "plugin", "src", "index.py"), "print('plugin')\n");
  writeFileSync(join(root, "node_modules", "ignored", "index.ts"), "throw new Error('ignored');\n");
  writeFileSync(join(root, "dist", "generated.js"), "export const generated = true;\n");
  return root;
}

describe("MSSP repository scanner foundation", () => {
  it("emits a schema-valid Intermediate Model without forcing MSSP layers", () => {
    const model = scanRepository(fixture(), { revision: "scan-revision" });

    expect(model.generatedBy.adapter).toBe("repository-scanner");
    expect(model.project.name).toBe("scan-demo");
    expect(model.project.version).toBe("1.2.3");
    expect(model.modules).toEqual([]);
    expect(model.layers).toEqual([]);
    expect(model.candidates.length).toBeGreaterThanOrEqual(3);
    expect(model.candidates.every((candidate) => candidate.status === "unclassified")).toBe(true);
    expect(model.candidates.every((candidate) => !("layer" in candidate))).toBe(true);
    expect(model.discovery?.revision).toBe("scan-revision");
    expect(validateIntermediateModelSchema(model)).toBe(true);
  });

  it("discovers markers, source languages, and structural candidates with evidence", () => {
    const model = scanRepository(fixture());
    const plugin = model.candidates.find((candidate) => candidate.path === "packages/plugin");
    const root = model.candidates.find((candidate) => candidate.path === ".");

    expect(model.discovery?.markers.filter((marker) => marker.kind === "node-package")).toHaveLength(2);
    expect(model.discovery?.inventory.files).toBe(4);
    expect(model.discovery?.inventory.sourceFiles).toBe(2);
    expect(model.discovery?.inventory.languages.map((language) => language.id)).toEqual([
      "python",
      "typescript",
    ]);
    expect(plugin?.name).toBe("@scan/plugin");
    expect(plugin?.boundaryKind).toBe("package");
    expect(plugin?.languages).toContain("python");
    expect(plugin?.evidence.some((evidence) => evidence.source?.uri === "packages/plugin/package.json")).toBe(true);
    expect(root?.boundaryConfidence).toBe(1);
  });

  it("is deterministic and records bounded scans", () => {
    const root = fixture();
    const first = JSON.stringify(scanRepository(root, { revision: "same" }));
    const second = JSON.stringify(scanRepository(root, { revision: "same" }));
    const bounded = scanRepository(root, { maxFiles: 2 });

    expect(second).toBe(first);
    expect(bounded.discovery?.truncated).toBe(true);
    expect(bounded.discovery?.inventory.files).toBe(2);
    expect(validateIntermediateModelSchema(bounded)).toBe(true);
  });
});
