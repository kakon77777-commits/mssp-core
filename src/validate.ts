import { existsSync } from "node:fs";
import { extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import type {
  Diagnostic,
  LoadedModule,
  LoadedProject,
  MsspLayer,
  ValidationReport,
} from "./types.js";
import { loadProject, walkFiles } from "./io.js";
import {
  formatSchemaErrors,
  validateModuleSchema,
  validateProjectSchema,
} from "./schema.js";

const EXECUTABLE_EXTENSIONS = new Set([
  ".c", ".cc", ".cpp", ".cxx", ".cs", ".go", ".java", ".js", ".jsx",
  ".kt", ".kts", ".lua", ".php", ".py", ".rb", ".rs", ".sh", ".swift",
  ".ts", ".tsx", ".wasm",
]);

const ALLOWED_RUNTIME_DEPENDENCIES: Record<MsspLayer, ReadonlySet<MsspLayer>> = {
  FMS: new Set(),
  SCL: new Set(),
  SMS: new Set(["SMS"]),
  TMS: new Set(["SMS"]),
  DMS: new Set(["SMS"]),
  ROUTER: new Set(["SMS"]),
  RUNTIME: new Set(["SMS", "ROUTER"]),
};

function add(
  diagnostics: Diagnostic[],
  diagnostic: Diagnostic,
): void {
  diagnostics.push(diagnostic);
}

function pathInside(root: string, child: string): boolean {
  const rel = relative(resolve(root), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function resolveEntry(module: LoadedModule): string | undefined {
  const entry = module.manifest.entry;
  if (!entry) return undefined;
  return normalize(join(module.directory, entry));
}

function validateLayerDirectories(project: LoadedProject, diagnostics: Diagnostic[]): void {
  for (const [layer, configuredPath] of Object.entries(project.manifest.layers)) {
    if (!configuredPath) continue;
    const absolute = join(project.root, configuredPath);
    if (!existsSync(absolute)) {
      add(diagnostics, {
        level: "error",
        code: "E_LAYER_PATH_MISSING",
        message: `${layer} layer path does not exist: ${configuredPath}`,
        file: project.manifestFile,
      });
    }
  }
}

function validateFmsPurity(project: LoadedProject, diagnostics: Diagnostic[]): void {
  const fmsRoot = join(project.root, project.manifest.layers.FMS);
  if (!existsSync(fmsRoot)) return;
  const offenders = walkFiles(fmsRoot).filter((file) =>
    EXECUTABLE_EXTENSIONS.has(extname(file).toLowerCase()),
  );
  for (const file of offenders) {
    add(diagnostics, {
      level: project.manifest.policies.fmsExecutableFiles === "deny" ? "error" : "warning",
      code: "E_FMS_EXECUTABLE".replace(
        "E_",
        project.manifest.policies.fmsExecutableFiles === "deny" ? "E_" : "W_",
      ),
      message: "FMS must remain pure metadata; executable source was found.",
      file,
    });
  }
}

function validateModulePlacement(
  project: LoadedProject,
  module: LoadedModule,
  diagnostics: Diagnostic[],
): void {
  const configured = project.manifest.layers[module.manifest.layer];
  if (!configured) {
    add(diagnostics, {
      level: "error",
      code: "E_LAYER_UNCONFIGURED",
      message: `Module declares ${module.manifest.layer}, but that layer path is not configured.`,
      file: module.file,
      moduleId: module.manifest.id,
    });
    return;
  }
  const layerRoot = join(project.root, configured);
  if (!pathInside(layerRoot, module.file)) {
    add(diagnostics, {
      level: "error",
      code: "E_LAYER_PLACEMENT",
      message: `Module ${module.manifest.id} declares ${module.manifest.layer} but is outside ${configured}.`,
      file: module.file,
      moduleId: module.manifest.id,
    });
  }
}

function validateModuleEntry(module: LoadedModule, diagnostics: Diagnostic[]): void {
  const { manifest } = module;
  if ((manifest.layer === "FMS" || manifest.layer === "SCL") && manifest.entry) {
    add(diagnostics, {
      level: "error",
      code: "E_METADATA_EXECUTABLE_ENTRY",
      message: `${manifest.layer} is declarative metadata and may not declare an executable entry.`,
      file: module.file,
      moduleId: manifest.id,
    });
  }
  const entry = resolveEntry(module);
  if (entry && !existsSync(entry)) {
    add(diagnostics, {
      level: "error",
      code: "E_ENTRY_MISSING",
      message: `Declared entry does not exist: ${manifest.entry ?? ""}`,
      file: module.file,
      moduleId: manifest.id,
    });
  }
}

function validateRequiredTmsFields(module: LoadedModule, diagnostics: Diagnostic[]): void {
  if (module.manifest.layer !== "TMS") return;
  const checks: Array<[boolean, string, string]> = [
    [Boolean(module.manifest.activateWhen?.length), "E_TMS_ACTIVATION_MISSING", "TMS must declare activateWhen."],
    [module.manifest.failureModes.length > 0, "E_TMS_FAILURE_MODES_MISSING", "TMS must declare failureModes."],
    [module.manifest.validation.length > 0, "E_TMS_VALIDATION_MISSING", "TMS must declare validation rules."],
    [module.manifest.tests.length > 0, "E_TMS_TESTS_MISSING", "TMS must declare representative tests."],
  ];
  for (const [ok, code, message] of checks) {
    if (!ok) {
      add(diagnostics, {
        level: "error",
        code,
        message,
        file: module.file,
        moduleId: module.manifest.id,
      });
    }
  }
}

function validateDependencies(project: LoadedProject, diagnostics: Diagnostic[]): void {
  const byId = new Map(project.modules.map((module) => [module.manifest.id, module]));
  for (const module of project.modules) {
    const allowed = ALLOWED_RUNTIME_DEPENDENCIES[module.manifest.layer];
    for (const dependencyId of module.manifest.requires.modules) {
      const dependency = byId.get(dependencyId);
      if (!dependency) {
        add(diagnostics, {
          level: "error",
          code: "E_DEPENDENCY_UNKNOWN",
          message: `Unknown module dependency: ${dependencyId}`,
          file: module.file,
          moduleId: module.manifest.id,
        });
        continue;
      }
      if (!allowed.has(dependency.manifest.layer)) {
        let policy: "deny" | "warn" = "deny";
        if (module.manifest.layer === "TMS" && dependency.manifest.layer === "TMS") {
          policy = project.manifest.policies.tmsDirectDependency;
        } else if (module.manifest.layer === "SMS" && dependency.manifest.layer === "TMS") {
          policy = project.manifest.policies.smsDependsOnTms;
        }
        add(diagnostics, {
          level: policy === "deny" ? "error" : "warning",
          code: policy === "deny" ? "E_LAYER_DEPENDENCY" : "W_LAYER_DEPENDENCY",
          message: `${module.manifest.layer} module ${module.manifest.id} may not runtime-depend on ${dependency.manifest.layer} module ${dependencyId}.`,
          file: module.file,
          moduleId: module.manifest.id,
        });
      }
    }
  }
}

function validateCycles(project: LoadedProject, diagnostics: Diagnostic[]): void {
  const byId = new Map(project.modules.map((module) => [module.manifest.id, module]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const reported = new Set<string>();

  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const index = stack.indexOf(id);
      const cycle = [...stack.slice(index), id];
      const key = cycle.join("->");
      if (!reported.has(key)) {
        reported.add(key);
        add(diagnostics, {
          level: "error",
          code: "E_DEPENDENCY_CYCLE",
          message: `Runtime dependency cycle: ${cycle.join(" -> ")}`,
          moduleId: id,
        });
      }
      return;
    }

    visiting.add(id);
    stack.push(id);
    const module = byId.get(id);
    if (module) {
      for (const dep of module.manifest.requires.modules) visit(dep);
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  };

  for (const id of byId.keys()) visit(id);
}

function validateChangeImpact(project: LoadedProject, diagnostics: Diagnostic[]): void {
  const known = new Set(project.modules.map((module) => module.manifest.id));
  for (const module of project.modules) {
    for (const id of [...module.manifest.changeImpact.affects, ...module.manifest.changeImpact.affectedBy]) {
      if (!known.has(id)) {
        add(diagnostics, {
          level: "warning",
          code: "W_CHANGE_IMPACT_UNKNOWN",
          message: `MSSP-VT relation references unknown module: ${id}`,
          file: module.file,
          moduleId: module.manifest.id,
        });
      }
    }
  }
}

export function validateLoadedProject(project: LoadedProject): ValidationReport {
  const diagnostics: Diagnostic[] = [];

  if (!validateProjectSchema(project.manifest)) {
    for (const message of formatSchemaErrors(validateProjectSchema.errors)) {
      add(diagnostics, {
        level: "error",
        code: "E_PROJECT_SCHEMA",
        message,
        file: project.manifestFile,
      });
    }
  }

  for (const module of project.modules) {
    const moduleManifest = module.manifest;
    const moduleId = moduleManifest.id;
    if (!validateModuleSchema(moduleManifest as unknown)) {
      for (const message of formatSchemaErrors(validateModuleSchema.errors)) {
        add(diagnostics, {
          level: "error",
          code: "E_MODULE_SCHEMA",
          message,
          file: module.file,
          moduleId,
        });
      }
    }
  }

  const ids = new Map<string, string>();
  for (const module of project.modules) {
    const previous = ids.get(module.manifest.id);
    if (previous) {
      add(diagnostics, {
        level: "error",
        code: "E_MODULE_ID_DUPLICATE",
        message: `Duplicate module id; first declared in ${previous}`,
        file: module.file,
        moduleId: module.manifest.id,
      });
    } else {
      ids.set(module.manifest.id, module.file);
    }
  }

  validateLayerDirectories(project, diagnostics);
  validateFmsPurity(project, diagnostics);
  for (const module of project.modules) {
    validateModulePlacement(project, module, diagnostics);
    validateModuleEntry(module, diagnostics);
    validateRequiredTmsFields(module, diagnostics);
  }
  validateDependencies(project, diagnostics);
  validateCycles(project, diagnostics);
  validateChangeImpact(project, diagnostics);

  diagnostics.sort((a, b) => {
    if (a.level !== b.level) return a.level === "error" ? -1 : 1;
    return a.code.localeCompare(b.code);
  });

  return {
    ok: diagnostics.every((diagnostic) => diagnostic.level !== "error"),
    diagnostics,
    project,
  };
}

export function validateProject(input = process.cwd()): ValidationReport {
  try {
    return validateLoadedProject(loadProject(input));
  } catch (error) {
    return {
      ok: false,
      diagnostics: [{
        level: "error",
        code: "E_PROJECT_LOAD",
        message: error instanceof Error ? error.message : String(error),
      }],
    };
  }
}
