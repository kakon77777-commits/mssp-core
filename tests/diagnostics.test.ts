import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  createDiagnosticEnvelope,
  getCanonicalDiagnosticCode,
} from "../src/diagnostics.js";
import { loadProject } from "../src/io.js";
import { validateDiagnosticSchema } from "../src/schema.js";
import { validateLoadedProject } from "../src/validate.js";

const example = resolve("examples/hello-mssp");

describe("MSSP Diagnostic Protocol v0.2", () => {
  it("maps internal codes to stable public codes", () => {
    expect(getCanonicalDiagnosticCode("E_FMS_EXECUTABLE")).toBe("MSSP_FMS_001");
    expect(getCanonicalDiagnosticCode("W_FMS_EXECUTABLE")).toBe("MSSP_FMS_001");
    expect(getCanonicalDiagnosticCode("E_LAYER_DEPENDENCY")).toBe("MSSP_DEP_002");
  });

  it("serializes a schema-valid envelope with relative locations", () => {
    const root = mkdtempSync(join(tmpdir(), "mssp-diagnostic-"));
    cpSync(example, root, { recursive: true });
    writeFileSync(join(root, "FMS", "bad.ts"), "export const bad = true;\n");

    const report = validateLoadedProject(loadProject(root));
    const envelope = createDiagnosticEnvelope({
      command: "lint",
      ok: report.ok,
      diagnostics: report.diagnostics,
      root: report.project?.root,
      metadata: {
        projectId: report.project?.manifest.id ?? "unknown",
      },
    });

    expect(envelope.ok).toBe(false);
    expect(envelope.summary.errors).toBeGreaterThan(0);
    expect(envelope.diagnostics.some((diagnostic) =>
      diagnostic.code === "MSSP_FMS_001"
      && diagnostic.legacyCode === "E_FMS_EXECUTABLE"
      && diagnostic.location?.file === "FMS/bad.ts"
    )).toBe(true);
    expect(validateDiagnosticSchema(envelope)).toBe(true);
  });

  it("uses a stable fallback for unregistered implementation codes", () => {
    const envelope = createDiagnosticEnvelope({
      command: "test",
      ok: true,
      diagnostics: [{
        level: "info",
        code: "I_EXPERIMENTAL",
        message: "Experimental implementation message.",
      }],
    });

    expect(envelope.diagnostics[0]?.code).toBe("MSSP_INTERNAL_001");
    expect(envelope.diagnostics[0]?.legacyCode).toBe("I_EXPERIMENTAL");
    expect(envelope.summary.info).toBe(1);
    expect(validateDiagnosticSchema(envelope)).toBe(true);
  });
});
