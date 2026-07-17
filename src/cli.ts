#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildGraph, graphToMermaid } from "./graph.js";
import { initializeProject } from "./init.js";
import { loadProject } from "./io.js";
import { runIslandTests } from "./island.js";
import { formatDiagnostic, formatProjectSummary, formatValidationReport } from "./format.js";
import { validateProject } from "./validate.js";

function usage(): string {
  return `MSSP Core MVP\n\nUsage:\n  mssp init <directory>\n  mssp lint [project] [--json]\n  mssp explain [project]\n  mssp graph [project] [--format mermaid|json] [--out file]\n  mssp island [project] [--module module.id] [--json]\n\nCommands:\n  init      Create an adoption-ready MSSP project skeleton.\n  lint      Validate schemas, layer boundaries, dependency direction, FMS purity, and MSSP-VT references.\n  explain   Print the architecture inventory for humans and agents.\n  graph     Generate a Mermaid or JSON dependency graph.\n  island    Verify that each TMS can stand on SMS dependencies alone.\n`;
}

function valueAfter(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function positional(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const value = args[i];
    if (!value) continue;
    if (value.startsWith("--")) {
      if (["--format", "--out", "--module"].includes(value)) i += 1;
      continue;
    }
    result.push(value);
  }
  return result;
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
    if (args.includes("--json")) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else process.stdout.write(formatValidationReport(report));
    return report.ok ? 0 : 1;
  }

  if (command === "explain") {
    const project = loadProject(projectArg);
    process.stdout.write(formatProjectSummary(project));
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
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
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
    process.stderr.write(`ERROR E_CLI: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
