import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildArchitectureDriftReport,
  parseFmsModuleIndex,
} from "../src/drift.js";
import { loadProject } from "../src/io.js";
import { validateArchitectureDriftSchema } from "../src/schema.js";

const example = resolve("examples/hello-mssp");

function copiedExample(): string {
  const root = mkdtempSync(join(tmpdir(), "mssp-drift-"));
  cpSync(example, root, { recursive: true });
  return root;
}

function codes(report: ReturnType<typeof buildArchitectureDriftReport>): string[] {
  return report.findings.map((finding) => finding.code);
}

describe("MSSP Architecture Drift Report v0.2", () => {
  it("recognizes the canonical reference project as statically consistent", () => {
    const report = buildArchitectureDriftReport(loadProject(example), {
      revision: "drift-revision",
    });

    expect(report.schemaVersion).toBe("0.2");
    expect(report.kind).toBe("mssp-architecture-drift-report");
    expect(report.analysis).toEqual({
      mode: "static-conservative",
      semanticEquivalence: false,
      autoMutation: false,
    });
    expect(report.sourceModel.revision).toBe("drift-revision");
    expect(report.coverage.moduleIndexParsed).toBe(true);
    expect(report.summary.status).toBe("consistent");
    expect(report.summary.ok).toBe(true);
    expect(report.findings).toEqual([]);
    expect(validateArchitectureDriftSchema(report)).toBe(true);
  });

  it("detects stale FMS rows, missing declarations, layer mismatch, and unowned source", () => {
    const root = copiedExample();
    writeFileSync(join(root, "FMS", "01_MODULE_INDEX.md"), [
      "# Module Index",
      "",
      "| ID | Layer | Responsibility |",
      "|---|---|---|",
      "| core.echo | TMS | stale layer |",
      "| diagnostics.basic | DMS | diagnostics |",
      "| router.default | ROUTER | routing |",
      "| runtime.default | RUNTIME | runtime |",
      "| ghost.module | SMS | stale module |",
      "",
    ].join("\n"));
    writeFileSync(join(root, "TMS", "orphan.ts"), "export const orphan = true;\n");

    const report = buildArchitectureDriftReport(loadProject(root));

    expect(codes(report)).toContain("MSSP_DRIFT_003");
    expect(codes(report)).toContain("MSSP_DRIFT_004");
    expect(codes(report)).toContain("MSSP_DRIFT_005");
    expect(codes(report)).toContain("MSSP_DRIFT_007");
    expect(report.summary.status).toBe("drift-detected");
    expect(report.summary.ok).toBe(false);
    expect(validateArchitectureDriftSchema(report)).toBe(true);
  });

  it("reports duplicate index ownership and declarative source violations", () => {
    const root = copiedExample();
    const indexPath = join(root, "FMS", "01_MODULE_INDEX.md");
    const original = parseFmsModuleIndex([
      "| ID | Layer |",
      "|---|---|",
      "| core.echo | SMS |",
      "| core.echo | SMS |",
    ].join("\n"));
    expect(original.parsed).toBe(true);
    expect(original.entries).toHaveLength(2);

    writeFileSync(indexPath, [
      "| ID | Layer |",
      "|---|---|",
      "| core.echo | SMS |",
      "| core.echo | SMS |",
      "| plugin.uppercase | TMS |",
      "| diagnostics.basic | DMS |",
      "| router.default | ROUTER |",
      "| runtime.default | RUNTIME |",
    ].join("\n"));
    writeFileSync(join(root, "SCL", "policy.ts"), "export const policy = true;\n");

    const report = buildArchitectureDriftReport(loadProject(root));

    expect(codes(report)).toContain("MSSP_DRIFT_006");
    expect(codes(report)).toContain("MSSP_DRIFT_010");
    expect(report.summary.errors).toBeGreaterThanOrEqual(2);
    expect(validateArchitectureDriftSchema(report)).toBe(true);
  });

  it("preserves indeterminate state when the index is prose-only or inventory is truncated", () => {
    const root = copiedExample();
    writeFileSync(
      join(root, "FMS", "01_MODULE_INDEX.md"),
      "# Module Index\n\nThe module inventory is described only in unrestricted prose.\n",
    );
    mkdirSync(join(root, "SMS", "extra"), { recursive: true });
    writeFileSync(join(root, "SMS", "extra", "one.ts"), "export const one = 1;\n");

    const report = buildArchitectureDriftReport(loadProject(root), { maxFiles: 1 });

    expect(codes(report)).toContain("MSSP_DRIFT_002");
    expect(codes(report)).toContain("MSSP_DRIFT_009");
    expect(report.sourceModel.truncated).toBe(true);
    expect(report.summary.indeterminate).toBe(2);
    expect(validateArchitectureDriftSchema(report)).toBe(true);
  });
});
