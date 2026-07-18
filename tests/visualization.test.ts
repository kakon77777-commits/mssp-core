import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadProject } from "../src/io.js";
import { buildIntermediateModel } from "../src/model.js";
import { validateVisualizationSchema } from "../src/schema.js";
import {
  buildVisualizationModel,
  visualizationToHtml,
} from "../src/visualization.js";

const example = resolve("examples/hello-mssp");

describe("MSSP Visualization Model v0.3", () => {
  it("builds a schema-valid layered view with source navigation", () => {
    const model = buildIntermediateModel(loadProject(example), { revision: "viz-test" });
    const visualization = buildVisualizationModel(model, {
      sourceBase: "https://github.com/example/project/blob/viz-test",
    });

    expect(visualization.schemaVersion).toBe("0.3");
    expect(visualization.kind).toBe("mssp-visualization-model");
    expect(visualization.invariants).toEqual({ readOnly: true, autoMutation: false });
    expect(visualization.view.sourceNavigation).toBe(true);
    expect(visualization.nodes).toHaveLength(model.modules.length);
    expect(visualization.edges.some((edge) => edge.kind === "requires")).toBe(true);
    expect(visualization.nodes.every((node) => node.sourceHref?.includes("/blob/viz-test/"))).toBe(true);
    expect(validateVisualizationSchema(visualization)).toBe(true);
  });

  it("preserves unresolved relation targets as explicit reference nodes", () => {
    const model = buildIntermediateModel(loadProject(example));
    const first = model.modules[0];
    expect(first).toBeDefined();
    if (!first) return;

    const visualization = buildVisualizationModel({
      ...model,
      relations: [
        ...model.relations,
        {
          kind: "requires",
          from: first.id,
          to: "missing.module",
          source: first.source,
          evidence: [],
        },
      ],
    });

    expect(visualization.nodes).toContainEqual(expect.objectContaining({
      id: "missing.module",
      kind: "reference",
      group: "UNRESOLVED",
      status: "unresolved",
    }));
    expect(validateVisualizationSchema(visualization)).toBe(true);
  });

  it("is deterministic for identical input and options", () => {
    const model = buildIntermediateModel(loadProject(example));
    const options = { sourceBase: "https://example.test/source" };

    expect(JSON.stringify(buildVisualizationModel(model, options))).toBe(
      JSON.stringify(buildVisualizationModel(model, options)),
    );
  });

  it("renders a self-contained interactive HTML document", () => {
    const visualization = buildVisualizationModel(buildIntermediateModel(loadProject(example)));
    const html = visualizationToHtml(visualization);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('id="mssp-data"');
    expect(html).toContain('id="board"');
    expect(html).toContain("Read-only layered view");
    expect(html).toContain("plugin.uppercase");
    expect(html).not.toMatch(/<script[^>]+src=/u);
    expect(html).not.toMatch(/<link[^>]+href=/u);
  });
});
