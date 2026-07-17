import { relative } from "node:path";
import type { Diagnostic, LoadedProject, ValidationReport } from "./types.js";

export function formatDiagnostic(diagnostic: Diagnostic, root?: string): string {
  const icon = diagnostic.level === "error" ? "ERROR" : "WARN";
  const location = diagnostic.file
    ? ` ${root ? relative(root, diagnostic.file) : diagnostic.file}`
    : "";
  const module = diagnostic.moduleId ? ` [${diagnostic.moduleId}]` : "";
  return `${icon} ${diagnostic.code}${module}${location}: ${diagnostic.message}`;
}

export function formatValidationReport(report: ValidationReport): string {
  const root = report.project?.root;
  const lines = report.diagnostics.map((diagnostic) =>
    formatDiagnostic(diagnostic, root),
  );
  if (lines.length === 0) lines.push("OK MSSP validation passed with no diagnostics.");
  const errors = report.diagnostics.filter((d) => d.level === "error").length;
  const warnings = report.diagnostics.filter((d) => d.level === "warning").length;
  lines.push(`Summary: ${errors} error(s), ${warnings} warning(s).`);
  return `${lines.join("\n")}\n`;
}

export function formatProjectSummary(project: LoadedProject): string {
  const counts = new Map<string, number>();
  for (const module of project.modules) {
    counts.set(module.manifest.layer, (counts.get(module.manifest.layer) ?? 0) + 1);
  }
  const lines = [
    `${project.manifest.name} (${project.manifest.id}) v${project.manifest.version}`,
    project.manifest.description ?? "",
    "",
    "Layers:",
  ];
  for (const layer of ["FMS", "SCL", "SMS", "TMS", "DMS", "ROUTER", "RUNTIME"]) {
    lines.push(`- ${layer}: ${counts.get(layer) ?? 0} module manifest(s)`);
  }
  lines.push("", "Modules:");
  for (const module of project.modules) {
    lines.push(`- ${module.manifest.id} [${module.manifest.layer}] — ${module.manifest.purpose}`);
  }
  return `${lines.join("\n")}\n`;
}
