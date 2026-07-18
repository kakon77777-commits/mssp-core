import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildGitDiffImpactReport,
  collectGitDiffChanges,
  parseGitNameStatus,
} from "../src/impact.js";
import type { GitDiffCollection } from "../src/impact.js";
import { loadProject } from "../src/io.js";
import { validateGitDiffImpactSchema } from "../src/schema.js";

const example = resolve("examples/hello-mssp");

function collection(changes: GitDiffCollection["changes"]): GitDiffCollection {
  return {
    base: "base-revision",
    head: "head-revision",
    comparisonMode: "direct",
    projectPath: "examples/hello-mssp",
    totalChangedFiles: changes.length,
    outsideProjectFiles: 0,
    changes,
  };
}

function modified(path: string): GitDiffCollection["changes"][number] {
  return {
    status: "modified",
    path,
    repositoryPath: `examples/hello-mssp/${path}`,
    transition: "within-project",
  };
}

function git(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

describe("MSSP Git Diff Impact Report v0.2", () => {
  it("parses deterministic Git name-status records including renames", () => {
    const parsed = parseGitNameStatus([
      "M", "examples/hello-mssp/SMS/core/index.js",
      "R100", "examples/hello-mssp/TMS/old.js", "examples/hello-mssp/TMS/new.js",
      "",
    ].join("\0"));

    expect(parsed).toEqual([
      {
        status: "modified",
        repositoryPath: "examples/hello-mssp/SMS/core/index.js",
      },
      {
        status: "renamed",
        repositoryPath: "examples/hello-mssp/TMS/new.js",
        oldRepositoryPath: "examples/hello-mssp/TMS/old.js",
      },
    ]);
  });

  it("records additions and deletions as opposite project-boundary transitions", () => {
    const repository = mkdtempSync(join(tmpdir(), "mssp-impact-git-"));
    const project = join(repository, "project");
    cpSync(example, project, { recursive: true });
    git(repository, ["init", "-q"]);
    git(repository, ["config", "user.email", "impact@example.invalid"]);
    git(repository, ["config", "user.name", "MSSP Impact Test"]);
    git(repository, ["add", "."]);
    git(repository, ["commit", "-qm", "initial"]);

    const addedPath = join(project, "TMS", "uppercase", "generated-note.txt");
    writeFileSync(addedPath, "new\n");
    git(repository, ["add", "."]);
    git(repository, ["commit", "-qm", "add path"]);
    const added = collectGitDiffChanges(project, "HEAD^1", "HEAD").changes
      .find((change) => change.path === "TMS/uppercase/generated-note.txt");
    expect(added?.status).toBe("added");
    expect(added?.transition).toBe("into-project");

    rmSync(addedPath);
    git(repository, ["add", "-A"]);
    git(repository, ["commit", "-qm", "delete path"]);
    const deleted = collectGitDiffChanges(project, "HEAD^1", "HEAD").changes
      .find((change) => change.path === "TMS/uppercase/generated-note.txt");
    expect(deleted?.status).toBe("deleted");
    expect(deleted?.transition).toBe("out-of-project");
  });

  it("emits a schema-valid no-impact report for an empty comparison", () => {
    const report = buildGitDiffImpactReport(loadProject(example), collection([]), {
      revision: "impact-revision",
    });

    expect(report.schemaVersion).toBe("0.2");
    expect(report.kind).toBe("mssp-git-diff-impact-report");
    expect(report.analysis).toEqual({
      mode: "static-conservative",
      semanticCompatibility: false,
      autoVersionBump: false,
      autoMutation: false,
    });
    expect(report.sourceModel.revision).toBe("impact-revision");
    expect(report.summary.status).toBe("no-impact");
    expect(report.summary.ok).toBe(true);
    expect(report.impactedModules).toEqual([]);
    expect(validateGitDiffImpactSchema(report)).toBe(true);
  });

  it("propagates direct SMS changes through MSSP-VT relations", () => {
    const report = buildGitDiffImpactReport(
      loadProject(example),
      collection([modified("SMS/core/index.js")]),
    );

    const ids = report.impactedModules.map((impact) => impact.moduleId);
    expect(ids).toContain("core.echo");
    expect(ids).toContain("plugin.uppercase");
    expect(ids).toContain("router.default");
    expect(ids).toContain("runtime.default");
    expect(report.impactedModules.find((impact) => impact.moduleId === "core.echo")?.direct).toBe(true);
    expect(report.impactedModules.find((impact) => impact.moduleId === "plugin.uppercase")?.direct).toBe(false);
    expect(report.requiredReviews.map((review) => review.kind)).toContain("compatibility");
    expect(report.requiredReviews.map((review) => review.kind)).toContain("version");
    expect(report.summary.status).toBe("impact-detected");
    expect(report.summary.ok).toBe(true);
    expect(validateGitDiffImpactSchema(report)).toBe(true);
  });

  it("records FMS and SCL review requirements without claiming semantic compatibility", () => {
    const report = buildGitDiffImpactReport(
      loadProject(example),
      collection([
        modified("FMS/02_ARCHITECTURE_NOTES.md"),
        modified("SCL/system.scl.yaml"),
      ]),
    );

    expect(report.findings.map((finding) => finding.code)).toContain("MSSP_IMPACT_002");
    expect(report.findings.map((finding) => finding.code)).toContain("MSSP_IMPACT_003");
    expect(report.requiredReviews.map((review) => review.kind)).toContain("fms");
    expect(report.requiredReviews.map((review) => review.kind)).toContain("scl");
    expect(report.analysis.semanticCompatibility).toBe(false);
    expect(validateGitDiffImpactSchema(report)).toBe(true);
  });

  it("preserves indeterminate state for changed executable files without module ownership", () => {
    const report = buildGitDiffImpactReport(
      loadProject(example),
      collection([modified("TMS/orphan.js")]),
    );

    expect(report.findings.map((finding) => finding.code)).toContain("MSSP_IMPACT_004");
    expect(report.summary.status).toBe("indeterminate");
    expect(report.summary.ok).toBe(false);
    expect(validateGitDiffImpactSchema(report)).toBe(true);
  });
});
