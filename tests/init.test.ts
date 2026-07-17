import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { initializeProject } from "../src/init.js";
import { validateProject } from "../src/validate.js";

describe("mssp init", () => {
  it("creates a valid adoption skeleton", () => {
    const parent = mkdtempSync(join(tmpdir(), "mssp-init-"));
    const root = join(parent, "demo");
    const result = initializeProject(root);
    expect(result.files.length).toBeGreaterThan(10);
    expect(existsSync(join(root, "mssp.yaml"))).toBe(true);
    const report = validateProject(root);
    expect(report.ok).toBe(true);
  });
});
