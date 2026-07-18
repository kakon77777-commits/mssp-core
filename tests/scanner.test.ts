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
  mkdirSync(join(root, "ignored-by-rule"), { recursive: true });
  mkdirSync(join(root, "node_modules", "ignored"), { recursive: true });
  mkdirSync(join(root, "dist"), { recursive: true });

  writeFileSync(join(root, ".gitignore"), "ignored-by-rule/\n*.cache.ts\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "scan-demo",
    version: "1.2.3",
    workspaces: ["packages/*"],
  }, null, 2));
  writeFileSync(
    join(root, "src", "core", "index.ts"),
    "import { plugin } from '@scan/plugin';\nimport { util } from './util.js';\nexport const core = plugin + util;\n",
  );
  writeFileSync(join(root, "src", "core", "util.ts"), "export const util = 1;\n");
  writeFileSync(
    join(root, "src", "core", "model.generated.ts"),
    "import generatedOnly from 'generated-only';\nexport default generatedOnly;\n",
  );
  writeFileSync(join(root, "src", "core", "skip.cache.ts"), "export const ignored = true;\n");
  writeFileSync(join(root, "packages", "plugin", "package.json"), JSON.stringify({
    name: "@scan/plugin",
    version: "0.4.0",
  }, null, 2));
  writeFileSync(
    join(root, "packages", "plugin", "src", "index.ts"),
    "import leftPad from 'left-pad';\nexport const plugin = leftPad('1', 2);\n",
  );
  writeFileSync(join(root, "packages", "plugin", "src", "worker.py"), "import requests\n");
  writeFileSync(join(root, "packages", "plugin", ".gitignore"), "secret.py\n");
  writeFileSync(join(root, "packages", "plugin", "secret.py"), "raise RuntimeError('ignored')\n");
  writeFileSync(join(root, "ignored-by-rule", "index.ts"), "throw new Error('ignored');\n");
  writeFileSync(join(root, "node_modules", "ignored", "index.ts"), "throw new Error('ignored');\n");
  writeFileSync(join(root, "dist", "generated.js"), "export const generated = true;\n");
  return root;
}

function goFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "mssp-go-scan-"));
  writeFileSync(join(root, "go.mod"), "module example.com/demo\n\ngo 1.24\n");
  writeFileSync(join(root, "main.go"), [
    "package main",
    "",
    "import (",
    "  \"fmt\"",
    "  alias \"example.com/dependency\"",
    ")",
    "",
    "func main() {",
    "  fmt.Println(\"not-an-import\")",
    "}",
    "",
  ].join("\n"));
  return root;
}

describe("MSSP dependency-aware repository scanner", () => {
  it("emits a schema-valid Intermediate Model without forcing MSSP layers", () => {
    const model = scanRepository(fixture(), { revision: "scan-revision" });

    expect(model.generatedBy.adapter).toBe("repository-scanner");
    expect(model.project.name).toBe("scan-demo");
    expect(model.project.version).toBe("1.2.3");
    expect(model.modules).toEqual([]);
    expect(model.layers).toEqual([]);
    expect(model.relations).toEqual([]);
    expect(model.candidates.length).toBeGreaterThanOrEqual(3);
    expect(model.candidates.every((candidate) => candidate.status === "unclassified")).toBe(true);
    expect(model.candidates.every((candidate) => !("layer" in candidate))).toBe(true);
    expect(model.discovery.revision).toBe("scan-revision");
    expect(validateIntermediateModelSchema(model)).toBe(true);
  });

  it("uses .gitignore files without executing repository code", () => {
    const model = scanRepository(fixture());

    expect(model.discovery.ignore.files.map((file) => file.path)).toEqual([
      ".gitignore",
      "packages/plugin/.gitignore",
    ]);
    expect(model.discovery.ignore.ignoredDirectories).toBe(1);
    expect(model.discovery.ignore.ignoredFiles).toBe(2);
    expect(model.discovery.inventory.languages.map((language) => language.id)).toEqual([
      "python",
      "typescript",
    ]);
  });

  it("discovers workspace membership and strengthens structural evidence", () => {
    const model = scanRepository(fixture());
    const plugin = model.candidates.find((candidate) => candidate.path === "packages/plugin");
    const workspace = model.discovery.workspaces[0];

    expect(workspace?.kind).toBe("npm");
    expect(workspace?.patterns).toEqual(["packages/*"]);
    expect(workspace?.members).toEqual(["packages/plugin"]);
    expect(plugin?.name).toBe("@scan/plugin");
    expect(plugin?.boundaryKind).toBe("package");
    expect(plugin?.boundaryConfidence).toBe(0.98);
    expect(plugin?.evidence.some((evidence) =>
      evidence.message.includes("workspace pattern")
    )).toBe(true);
  });

  it("emits static dependency evidence without converting it into runtime relations", () => {
    const model = scanRepository(fixture());
    const workspaceDependency = model.discovery.dependencies.find((dependency) =>
      dependency.scope === "workspace"
      && dependency.from === "candidate.src"
      && dependency.to === "candidate.packages.plugin"
    );
    const internalDependency = model.discovery.dependencies.find((dependency) =>
      dependency.scope === "internal"
      && dependency.from === "candidate.src"
    );
    const externalTargets = model.discovery.dependencies
      .filter((dependency) => dependency.scope === "external")
      .map((dependency) => dependency.to);

    expect(workspaceDependency?.specifiers).toEqual(["@scan/plugin"]);
    expect(internalDependency?.specifiers).toEqual(["./util.js"]);
    expect(externalTargets).toContain("external:left-pad");
    expect(externalTargets).toContain("external:requests");
    expect(model.relations).toEqual([]);
  });

  it("does not treat ordinary Go string literals as imports", () => {
    const model = scanRepository(goFixture());
    const targets = model.discovery.dependencies.map((dependency) => dependency.to);

    expect(targets).toContain("external:fmt");
    expect(targets).toContain("external:example.com/dependency");
    expect(targets).not.toContain("external:not-an-import");
  });

  it("records generated sources but excludes them from static import evidence", () => {
    const model = scanRepository(fixture());
    const allSpecifiers = model.discovery.dependencies.flatMap((dependency) => dependency.specifiers);

    expect(model.discovery.generated.files).toBe(1);
    expect(model.discovery.generated.paths).toEqual(["src/core/model.generated.ts"]);
    expect(allSpecifiers).not.toContain("generated-only");
  });

  it("is deterministic and records bounded scans", () => {
    const root = fixture();
    const first = JSON.stringify(scanRepository(root, { revision: "same" }));
    const second = JSON.stringify(scanRepository(root, { revision: "same" }));
    const bounded = scanRepository(root, { maxFiles: 2 });

    expect(second).toBe(first);
    expect(bounded.discovery.truncated).toBe(true);
    expect(bounded.discovery.inventory.files).toBe(2);
    expect(validateIntermediateModelSchema(bounded)).toBe(true);
  });
});
