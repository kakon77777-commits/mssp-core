import type { Diagnostic, LoadedProject } from "./types.js";

export interface IslandReport {
  ok: boolean;
  diagnostics: Diagnostic[];
  tested: string[];
}

export function runIslandTests(project: LoadedProject, selectedModuleId?: string): IslandReport {
  const byId = new Map(project.modules.map((module) => [module.manifest.id, module]));
  const targets = project.modules.filter((module) =>
    module.manifest.layer === "TMS" && (!selectedModuleId || module.manifest.id === selectedModuleId),
  );
  const diagnostics: Diagnostic[] = [];

  if (selectedModuleId && targets.length === 0) {
    diagnostics.push({
      level: "error",
      code: "E_ISLAND_TARGET",
      message: `No TMS module found with id: ${selectedModuleId}`,
      moduleId: selectedModuleId,
    });
  }

  for (const module of targets) {
    const manifest = module.manifest;
    for (const dependencyId of manifest.requires.modules) {
      const dependency = byId.get(dependencyId);
      if (!dependency) {
        diagnostics.push({
          level: "error",
          code: "E_ISLAND_UNKNOWN_DEPENDENCY",
          message: `Island test cannot resolve dependency: ${dependencyId}`,
          file: module.file,
          moduleId: manifest.id,
        });
      } else if (dependency.manifest.layer !== "SMS") {
        diagnostics.push({
          level: "error",
          code: "E_ISLAND_NON_SMS_DEPENDENCY",
          message: `TMS island may load only declared SMS dependencies; found ${dependency.manifest.layer}:${dependencyId}.`,
          file: module.file,
          moduleId: manifest.id,
        });
      }
    }

    if (!manifest.activateWhen?.length) {
      diagnostics.push({
        level: "error",
        code: "E_ISLAND_NO_ACTIVATION",
        message: "TMS has no activation conditions.",
        file: module.file,
        moduleId: manifest.id,
      });
    }
    if (!manifest.tests.length) {
      diagnostics.push({
        level: "error",
        code: "E_ISLAND_NO_TESTS",
        message: "TMS has no representative tests.",
        file: module.file,
        moduleId: manifest.id,
      });
    }
    if (!manifest.validation.length) {
      diagnostics.push({
        level: "error",
        code: "E_ISLAND_NO_VALIDATION",
        message: "TMS has no declared validation rules.",
        file: module.file,
        moduleId: manifest.id,
      });
    }
    if (!manifest.failureModes.length) {
      diagnostics.push({
        level: "error",
        code: "E_ISLAND_NO_FAILURE_MODE",
        message: "TMS has no declared failure modes.",
        file: module.file,
        moduleId: manifest.id,
      });
    }
  }

  return {
    ok: diagnostics.every((diagnostic) => diagnostic.level !== "error"),
    diagnostics,
    tested: targets.map((module) => module.manifest.id),
  };
}
