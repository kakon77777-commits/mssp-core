import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { loadProject } from "../src/io.js";
import { runIslandTests } from "../src/island.js";

describe("TMS island test", () => {
  it("passes the reference TMS", () => {
    const project = loadProject(resolve("examples/hello-mssp"));
    const report = runIslandTests(project);
    expect(report.ok).toBe(true);
    expect(report.tested).toEqual(["plugin.uppercase"]);
  });

  it("fails an unknown target", () => {
    const project = loadProject(resolve("examples/hello-mssp"));
    const report = runIslandTests(project, "plugin.missing");
    expect(report.ok).toBe(false);
    expect(report.diagnostics[0]?.code).toBe("E_ISLAND_TARGET");
  });
});
