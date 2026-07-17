import type { LoadedProject, MsspLayer } from "./types.js";

export interface GraphNode {
  id: string;
  label: string;
  layer: MsspLayer;
  version: string;
  purpose: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "requires";
}

export interface MsspGraph {
  project: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraph(project: LoadedProject): MsspGraph {
  return {
    project: project.manifest.id,
    nodes: project.modules.map(({ manifest }) => ({
      id: manifest.id,
      label: manifest.name,
      layer: manifest.layer,
      version: manifest.version,
      purpose: manifest.purpose,
    })),
    edges: project.modules.flatMap(({ manifest }) =>
      manifest.requires.modules.map((dependency) => ({
        from: manifest.id,
        to: dependency,
        kind: "requires" as const,
      })),
    ),
  };
}

function mermaidId(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, "_");
}

function escapeLabel(value: string): string {
  return value.replace(/"/g, "&quot;");
}

export function graphToMermaid(graph: MsspGraph): string {
  const lines = ["flowchart LR"];
  for (const node of graph.nodes) {
    lines.push(
      `  ${mermaidId(node.id)}["${escapeLabel(node.label)}<br/>${node.layer}"]`,
    );
  }
  for (const edge of graph.edges) {
    lines.push(`  ${mermaidId(edge.from)} -->|requires| ${mermaidId(edge.to)}`);
  }
  lines.push("  classDef FMS stroke-dasharray: 5 5");
  for (const layer of ["FMS", "SCL", "SMS", "TMS", "DMS", "ROUTER", "RUNTIME"]) {
    const ids = graph.nodes.filter((node) => node.layer === layer).map((node) => mermaidId(node.id));
    if (ids.length) lines.push(`  class ${ids.join(",")} ${layer}`);
  }
  return `${lines.join("\n")}\n`;
}
