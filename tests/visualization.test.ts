import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadProject } from "../src/io.js";
import { buildIntermediateModel } from "../src/model.js";
import { validateVisualizationSchema } from "../src/schema.js";
import {
  buildVisualizationModel,
  visualizationToHtml,
  type VisualizationProjectionId,
} from "../src/visualization.js";

const example = resolve("examples/hello-mssp");

function projectionNodeIds(
  visualization: ReturnType<typeof buildVisualizationModel>,
  id: VisualizationProjectionId,
): string[] {
  const projection = visualization.projections.find((item) => item.id === id);
  expect(projection).toBeDefined();
  return projection?.groups.flatMap((group) => group.nodeIds).sort() ?? [];
}

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
    expect(visualization.view.defaultProjection).toBe("layer");
    expect(visualization.view.availableProjections).toEqual([
      "layer",
      "status",
      "risk",
      "connectivity",
    ]);
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
    expect(projectionNodeIds(visualization, "status")).toContain("missing.module");
    expect(validateVisualizationSchema(visualization)).toBe(true);
  });

  it("projects every node exactly once in every view without changing canonical groups", () => {
    const visualization = buildVisualizationModel(buildIntermediateModel(loadProject(example)));
    const canonicalIds = visualization.nodes.map((node) => node.id).sort();
    const canonicalGroups = new Map(visualization.nodes.map((node) => [node.id, node.group]));

    for (const projection of visualization.view.availableProjections) {
      expect(projectionNodeIds(visualization, projection)).toEqual(canonicalIds);
    }
    expect(new Map(visualization.nodes.map((node) => [node.id, node.group]))).toEqual(canonicalGroups);
  });

  it("derives status, risk, and connectivity views without granting architecture authority", () => {
    const visualization = buildVisualizationModel(buildIntermediateModel(loadProject(example)), {
      defaultProjection: "connectivity",
    });

    expect(visualization.view.defaultProjection).toBe("connectivity");
    expect(visualization.projections.find((item) => item.id === "status")?.groupBy).toBe("node-status");
    expect(visualization.projections.find((item) => item.id === "risk")?.groupBy).toBe("risk-level");
    expect(visualization.projections.find((item) => item.id === "connectivity")?.groupBy).toBe("relation-degree");
    expect(visualization.nodes.every((node) => node.status !== "unclassified" || node.group === "UNCLASSIFIED")).toBe(true);
    expect(visualization.invariants).toEqual({ readOnly: true, autoMutation: false });
  });

  it("records an explicit bounded rendering profile for large graphs", () => {
    const visualization = buildVisualizationModel(buildIntermediateModel(loadProject(example)), {
      largeGraphThreshold: 1,
      initialNodeLimit: 2,
      batchSize: 3,
      maxRenderedEdges: 4,
    });

    expect(visualization.scale).toEqual(expect.objectContaining({
      largeGraph: true,
      threshold: 1,
      initialNodeLimit: 2,
      batchSize: 3,
      maxRenderedEdges: 4,
      nodeRendering: "bounded-batch",
      edgeRendering: "visible-endpoints-only",
    }));
    expect(validateVisualizationSchema(visualization)).toBe(true);
  });

  it("rejects invalid scale controls and unknown default projections", () => {
    const model = buildIntermediateModel(loadProject(example));

    expect(() => buildVisualizationModel(model, { batchSize: 0 })).toThrow("batchSize");
    expect(() => buildVisualizationModel(model, {
      defaultProjection: "unknown" as VisualizationProjectionId,
    })).toThrow("Unknown visualization projection");
  });

  it("is deterministic for identical input and options", () => {
    const model = buildIntermediateModel(loadProject(example));
    const options = {
      sourceBase: "https://example.test/source",
      defaultProjection: "risk" as const,
      largeGraphThreshold: 20,
      initialNodeLimit: 10,
      batchSize: 5,
      maxRenderedEdges: 50,
    };

    expect(JSON.stringify(buildVisualizationModel(model, options))).toBe(
      JSON.stringify(buildVisualizationModel(model, options)),
    );
  });

  it("renders a self-contained multi-view HTML document", () => {
    const visualization = buildVisualizationModel(buildIntermediateModel(loadProject(example)), {
      largeGraphThreshold: 1,
      initialNodeLimit: 2,
    });
    const html = visualizationToHtml(visualization);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('id="mssp-data"');
    expect(html).toContain('id="board"');
    expect(html).toContain('id="projections"');
    expect(html).toContain('id="more"');
    expect(html).toContain("Read-only multi-view architecture");
    expect(html).toContain("bounded-batch rendering");
    expect(html).toContain("plugin.uppercase");
    expect(html).not.toMatch(/<script[^>]+src=/u);
    expect(html).not.toMatch(/<link[^>]+href=/u);
  });
});
