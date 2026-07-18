#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { buildRepositoryClassificationReport } from "./classification-report.js";
import { createDiagnosticEnvelope, getCanonicalDiagnosticCode } from "./diagnostics.js";
import { buildGraph, graphToMermaid } from "./graph.js";
import { initializeProject } from "./init.js";
import { loadProject } from "./io.js";
import { runIslandTests } from "./island.js";
import { buildIntermediateModel } from "./model.js";
import {
  buildCandidatePromotionReview,
  parseCandidatePromotionReview,
  parseMsspLayer,
  promoteCandidateReview,
} from "./promotion.js";
import type {
  CandidatePromotionDecision,
  PromotionActorKind,
} from "./promotion.js";
import { scanRepository } from "./scanner.js";
import { formatDiagnostic, formatProjectSummary, formatValidationReport } from "./format.js";
import { validateProject } from "./validate.js";

const OPTIONS_WITH_VALUE = new Set([
  "--approval-rationale",
  "--approved-at",
  "--approver",
  "--approver-kind",
  "--candidate",
  "--condition",
  "--decision",
  "--format",
  "--layer",
  "--max-files",
  "--module",
  "--out",
  "--rationale",
  "--reviewed-at",
  "--reviewer",
  "--reviewer-kind",
  "--revision",
]);

function usage(): string {
  return `MSSP Core MVP\n\nUsage:\n  mssp init <directory>\n  mssp lint [project] [--json]\n  mssp explain [project]\n  mssp model [project] [--revision value] [--out file]\n  mssp scan [repository] [--revision value] [--max-files number] [--out file]\n  mssp classify [repository] [--revision value] [--max-files number] [--out file]\n  mssp review-candidate [repository] --candidate id|path --decision approve|reject|defer --reviewer id --rationale text [--layer layer] [--out file]\n  mssp promote-candidate <review.json> --approver id --approval-rationale text --out module.yaml\n  mssp graph [project] [--format mermaid|json] [--out file]\n  mssp island [project] [--module module.id] [--json]\n\nCommands:\n  init               Create an adoption-ready MSSP project skeleton.\n  lint               Validate schemas, layer boundaries, dependency direction, FMS purity, and MSSP-VT references.\n  explain            Print the architecture inventory for humans and agents.\n  model              Export the deterministic, language-neutral MSSP Intermediate Model from manifests.\n  scan               Discover repository markers and unclassified module candidates as an Intermediate Model.\n  classify           Produce evidence-backed, review-required MSSP layer suggestions without promoting candidates.\n  review-candidate   Record an explicit reviewer decision and create a blocked contract draft for approved candidates.\n  promote-candidate  Emit a module manifest only after contract completion and independent final approval.\n  graph              Generate a Mermaid or JSON dependency graph from the Intermediate Model.\n  island             Verify that each TMS can stand on SMS dependencies alone.\n\nJSON diagnostics:\n  --json emits MSSP Diagnostic Protocol v0.2 envelopes with stable MSSP_* codes.\n`;
}

function valueAfter(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function requiredValue(args: string[], name: string): string {
  const value = valueAfter(args, name)?.trim();
  if (!value) throw new Error(`${name} requires a value.`);
  return value;
}

function positional(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const value = args[i];
    if (!value) continue;
    if (value.startsWith("--")) {
      if (OPTIONS_WITH_VALUE.has(value)) i += 1;
      continue;
    }
    result.push(value);
  }
  return result;
}

function parseDecision(value: string): CandidatePromotionDecision {
  if (value === "approve" || value === "reject" || value === "defer") return value;
  throw new Error(`Unknown review decision '${value}'. Expected approve, reject, or defer.`);
}

function parseActorKind(value: string | undefined, label: string): PromotionActorKind | undefined {
  if (!value) return undefined;
  if (value === "human" || value === "agent") return value;
  throw new Error(`${label} must be human or agent.`);
}

function writeJsonOutput(value: unknown, out: string | undefined, label: string): void {
  const output = `${JSON.stringify(value, null, 2)}\n`;
  if (out) {
    const target = resolve(out);
    writeFileSync(target, output, "utf8");
    process.stdout.write(`Wrote ${label} to ${target}\n`);
  } else {
    process.stdout.write(output);
  }
}

function scannerOptions(args: string[]): {
  revision?: string;
  maxFiles?: number;
} {
  const revision = valueAfter(args, "--revision");
  const maxFilesValue = valueAfter(args, "--max-files");
  const options: {
    revision?: string;
    maxFiles?: number;
  } = {};
  if (revision) options.revision = revision;
  if (maxFilesValue) options.maxFiles = Number(maxFilesValue);
  return options;
}

async function main(): Promise<number> {
  const [, , command, ...args] = process.argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return 0;
  }

  if (command === "init") {
    const target = positional(args)[0];
    if (!target) throw new Error("init requires a target directory.");
    const result = initializeProject(target);
    process.stdout.write(`Created MSSP project at ${result.root}\n${result.files.length} file(s) written.\n`);
    return 0;
  }

  const projectArg = positional(args)[0] ?? process.cwd();

  if (command === "lint") {
    const report = validateProject(projectArg);
    if (args.includes("--json")) {
      const metadata: Record<string, unknown> = {};
      if (report.project) {
        metadata.projectId = report.project.manifest.id;
        metadata.projectVersion = report.project.manifest.version;
      }
      process.stdout.write(`${JSON.stringify(createDiagnosticEnvelope({
        command: "lint",
        ok: report.ok,
        diagnostics: report.diagnostics,
        root: report.project?.root,
        metadata,
      }), null, 2)}\n`);
    } else {
      process.stdout.write(formatValidationReport(report));
    }
    return report.ok ? 0 : 1;
  }

  if (command === "explain") {
    const project = loadProject(projectArg);
    process.stdout.write(formatProjectSummary(project));
    return 0;
  }

  if (command === "model") {
    const project = loadProject(projectArg);
    const revision = valueAfter(args, "--revision");
    const model = buildIntermediateModel(project, revision ? { revision } : {});
    writeJsonOutput(model, valueAfter(args, "--out"), "MSSP Intermediate Model");
    return 0;
  }

  if (command === "scan") {
    const model = scanRepository(projectArg, scannerOptions(args));
    writeJsonOutput(model, valueAfter(args, "--out"), "MSSP repository scan model");
    return 0;
  }

  if (command === "classify") {
    const model = scanRepository(projectArg, scannerOptions(args));
    const report = buildRepositoryClassificationReport(model);
    writeJsonOutput(report, valueAfter(args, "--out"), "MSSP classification suggestions");
    return 0;
  }

  if (command === "review-candidate") {
    const model = scanRepository(projectArg, scannerOptions(args));
    const classification = buildRepositoryClassificationReport(model);
    const layerValue = valueAfter(args, "--layer");
    const reviewedAt = valueAfter(args, "--reviewed-at");
    const reviewerKind = parseActorKind(valueAfter(args, "--reviewer-kind"), "--reviewer-kind");
    const condition = valueAfter(args, "--condition");
    const options: Parameters<typeof buildCandidatePromotionReview>[2] = {
      candidate: requiredValue(args, "--candidate"),
      decision: parseDecision(requiredValue(args, "--decision")),
      reviewerId: requiredValue(args, "--reviewer"),
      rationale: requiredValue(args, "--rationale"),
    };
    if (layerValue) options.selectedLayer = parseMsspLayer(layerValue);
    if (reviewedAt) options.reviewedAt = reviewedAt;
    if (reviewerKind) options.reviewerKind = reviewerKind;
    if (condition) options.conditions = [condition];
    const review = buildCandidatePromotionReview(model, classification, options);
    writeJsonOutput(review, valueAfter(args, "--out"), "MSSP candidate promotion review");
    return 0;
  }

  if (command === "promote-candidate") {
    const reviewPath = resolve(projectArg);
    const review = parseCandidatePromotionReview(
      JSON.parse(readFileSync(reviewPath, "utf8")) as unknown,
    );
    const approvedAt = valueAfter(args, "--approved-at");
    const approverKind = parseActorKind(valueAfter(args, "--approver-kind"), "--approver-kind");
    const options: Parameters<typeof promoteCandidateReview>[1] = {
      approverId: requiredValue(args, "--approver"),
      rationale: requiredValue(args, "--approval-rationale"),
    };
    if (approvedAt) options.approvedAt = approvedAt;
    if (approverKind) options.approverKind = approverKind;
    const manifest = promoteCandidateReview(review, options);
    const out = resolve(requiredValue(args, "--out"));
    if (existsSync(out)) {
      throw new Error(`Refusing to overwrite existing promotion target: ${out}`);
    }
    writeFileSync(out, stringifyYaml(manifest), "utf8");
    process.stdout.write(`Promoted ${manifest.id} to ${out}\n`);
    return 0;
  }

  if (command === "graph") {
    const project = loadProject(projectArg);
    const graph = buildGraph(project);
    const format = valueAfter(args, "--format") ?? "mermaid";
    if (format !== "mermaid" && format !== "json") {
      throw new Error(`Unsupported graph format: ${format}`);
    }
    const output = format === "json" ? `${JSON.stringify(graph, null, 2)}\n` : graphToMermaid(graph);
    const out = valueAfter(args, "--out");
    if (out) {
      const target = resolve(out);
      writeFileSync(target, output, "utf8");
      process.stdout.write(`Wrote ${format} graph to ${target}\n`);
    } else {
      process.stdout.write(output);
    }
    return 0;
  }

  if (command === "island") {
    const project = loadProject(projectArg);
    const report = runIslandTests(project, valueAfter(args, "--module"));
    if (args.includes("--json")) {
      process.stdout.write(`${JSON.stringify(createDiagnosticEnvelope({
        command: "island",
        ok: report.ok,
        diagnostics: report.diagnostics,
        root: project.root,
        metadata: {
          projectId: project.manifest.id,
          projectVersion: project.manifest.version,
          tested: report.tested,
        },
      }), null, 2)}\n`);
    } else {
      for (const id of report.tested) process.stdout.write(`TEST TMS island: ${id}\n`);
      if (!report.diagnostics.length) process.stdout.write("OK all selected TMS islands passed.\n");
      for (const diagnostic of report.diagnostics) {
        process.stdout.write(`${formatDiagnostic(diagnostic, project.root)}\n`);
      }
    }
    return report.ok ? 0 : 1;
  }

  process.stderr.write(`Unknown command: ${command}\n\n${usage()}`);
  return 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`ERROR ${getCanonicalDiagnosticCode("E_CLI")}: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
