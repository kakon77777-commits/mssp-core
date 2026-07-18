import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { ErrorObject, ValidateFunction } from "ajv";

const require = createRequire(import.meta.url);
const ajvPackage = require("ajv/dist/2020") as {
  default?: new (options?: Record<string, unknown>) => {
    compile(schema: object): ValidateFunction;
  };
} & (new (options?: Record<string, unknown>) => {
  compile(schema: object): ValidateFunction;
});
const formatsPackage = require("ajv-formats") as {
  default?: (ajv: unknown) => unknown;
} & ((ajv: unknown) => unknown);
const Ajv2020 = ajvPackage.default ?? ajvPackage;
const addFormats = formatsPackage.default ?? formatsPackage;

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");
const schemasRoot = join(packageRoot, "schemas");

function readSchema(name: string): object {
  return JSON.parse(readFileSync(join(schemasRoot, name), "utf8")) as object;
}

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);

export const validateProjectSchema: ValidateFunction = ajv.compile(
  readSchema("mssp.schema.json"),
);
export const validateModuleSchema: ValidateFunction = ajv.compile(
  readSchema("module.schema.json"),
);
export const validateDiagnosticSchema: ValidateFunction = ajv.compile(
  readSchema("diagnostic.schema.json"),
);
export const validateIntermediateModelSchema: ValidateFunction = ajv.compile(
  readSchema("intermediate-model.schema.json"),
);
export const validateClassificationSuggestionsSchema: ValidateFunction = ajv.compile(
  readSchema("classification-suggestions.schema.json"),
);

export function formatSchemaErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => {
    const path = error.instancePath || "/";
    return `${path} ${error.message ?? "is invalid"}`;
  });
}
