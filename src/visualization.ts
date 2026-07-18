import type {
  IntermediateCandidate,
  IntermediateModule,
  IntermediateRelationKind,
  ModelSourceReference,
  MsspIntermediateModel,
} from "./model.js";
import type { MsspLayer, RiskLevel } from "./types.js";

export const MSSP_VISUALIZATION_VERSION = "0.3" as const;
export const MSSP_VISUALIZATION_KIND = "mssp-visualization-model" as const;

export type VisualizationGroupId = MsspLayer | "UNCLASSIFIED" | "UNRESOLVED";
export type VisualizationNodeKind = "module" | "candidate" | "reference";
export type VisualizationNodeStatus = "declared" | "unclassified" | "unresolved";
export type VisualizationProjectionId = "layer" | "status" | "risk" | "connectivity";
export type VisualizationProjectionGroupBy =
  | "architecture-layer"
  | "node-status"
  | "risk-level"
  | "relation-degree";

export const VISUALIZATION_PROJECTION_IDS: readonly VisualizationProjectionId[] = [
  "layer",
  "status",
  "risk",
  "connectivity",
];

export interface VisualizationGroup {
  id: VisualizationGroupId;
  label: string;
  order: number;
}

export interface VisualizationNode {
  id: string;
  kind: VisualizationNodeKind;
  label: string;
  group: VisualizationGroupId;
  status: VisualizationNodeStatus;
  source: ModelSourceReference;
  sourceUri: string;
  sourceHref?: string;
  version?: string;
  purpose?: string;
  entry?: string;
  riskLevel?: RiskLevel;
  boundaryKind?: IntermediateCandidate["boundaryKind"];
  boundaryConfidence?: number;
  fileCount?: number;
  sourceFileCount?: number;
  languages?: string[];
}

export interface VisualizationEdge {
  id: string;
  from: string;
  to: string;
  kind: IntermediateRelationKind;
  label: string;
  source: ModelSourceReference;
  evidenceCount: number;
}

export interface VisualizationProjectionGroup {
  id: string;
  label: string;
  order: number;
  nodeIds: string[];
}

export interface VisualizationProjection {
  id: VisualizationProjectionId;
  label: string;
  description: string;
  groupBy: VisualizationProjectionGroupBy;
  groups: VisualizationProjectionGroup[];
}

export interface VisualizationScaleProfile {
  nodeCount: number;
  edgeCount: number;
  largeGraph: boolean;
  threshold: number;
  initialNodeLimit: number;
  batchSize: number;
  maxRenderedEdges: number;
  nodeRendering: "bounded-batch";
  edgeRendering: "visible-endpoints-only";
}

export interface MsspVisualizationModel {
  schemaVersion: typeof MSSP_VISUALIZATION_VERSION;
  kind: typeof MSSP_VISUALIZATION_KIND;
  generatedBy: MsspIntermediateModel["generatedBy"];
  project: {
    id: string;
    name: string;
    version: string;
  };
  view: {
    layout: "layered";
    direction: "left-to-right";
    interactive: true;
    sourceNavigation: boolean;
    defaultProjection: VisualizationProjectionId;
    availableProjections: VisualizationProjectionId[];
  };
  groups: VisualizationGroup[];
  projections: VisualizationProjection[];
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  scale: VisualizationScaleProfile;
  invariants: {
    readOnly: true;
    autoMutation: false;
  };
}

export interface VisualizationOptions {
  sourceBase?: string;
  defaultProjection?: VisualizationProjectionId;
  largeGraphThreshold?: number;
  initialNodeLimit?: number;
  batchSize?: number;
  maxRenderedEdges?: number;
}

const DEFAULT_LARGE_GRAPH_THRESHOLD = 500;
const DEFAULT_INITIAL_NODE_LIMIT = 200;
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_MAX_RENDERED_EDGES = 2000;

const GROUP_ORDER: readonly VisualizationGroupId[] = [
  "FMS",
  "SCL",
  "SMS",
  "TMS",
  "DMS",
  "ROUTER",
  "RUNTIME",
  "UNCLASSIFIED",
  "UNRESOLVED",
];

function compareText(a: string, b: string): number {
  return a.localeCompare(b);
}

function groupLabel(group: VisualizationGroupId): string {
  if (group === "UNCLASSIFIED") return "Unclassified candidates";
  if (group === "UNRESOLVED") return "Unresolved references";
  return group;
}

function sourceHref(sourceBase: string | undefined, uri: string): string | undefined {
  const base = sourceBase?.trim().replace(/\/+$/u, "");
  if (!base || !uri || uri === ".") return undefined;
  const path = uri
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return path ? `${base}/${path}` : undefined;
}

function positiveInteger(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return resolved;
}

function moduleNode(module: IntermediateModule, options: VisualizationOptions): VisualizationNode {
  const node: VisualizationNode = {
    id: module.id,
    kind: "module",
    label: module.name,
    group: module.layer,
    status: "declared",
    source: module.source,
    sourceUri: module.source.uri,
    version: module.version,
    purpose: module.purpose,
    riskLevel: module.riskLevel,
  };
  const href = sourceHref(options.sourceBase, module.source.uri);
  if (href) node.sourceHref = href;
  if (module.entry) node.entry = module.entry;
  return node;
}

function candidateNode(
  candidate: IntermediateCandidate,
  options: VisualizationOptions,
): VisualizationNode {
  const node: VisualizationNode = {
    id: candidate.id,
    kind: "candidate",
    label: candidate.name,
    group: "UNCLASSIFIED",
    status: "unclassified",
    source: candidate.source,
    sourceUri: candidate.path,
    boundaryKind: candidate.boundaryKind,
    boundaryConfidence: candidate.boundaryConfidence,
    fileCount: candidate.fileCount,
    sourceFileCount: candidate.sourceFileCount,
    languages: [...candidate.languages].sort(compareText),
  };
  const href = sourceHref(options.sourceBase, candidate.path);
  if (href) node.sourceHref = href;
  return node;
}

function unresolvedNode(
  id: string,
  source: ModelSourceReference,
  options: VisualizationOptions,
): VisualizationNode {
  const node: VisualizationNode = {
    id,
    kind: "reference",
    label: id,
    group: "UNRESOLVED",
    status: "unresolved",
    source,
    sourceUri: source.uri,
  };
  const href = sourceHref(options.sourceBase, source.uri);
  if (href) node.sourceHref = href;
  return node;
}

function projectionGroup(
  id: string,
  label: string,
  order: number,
  nodes: readonly VisualizationNode[],
  predicate: (node: VisualizationNode) => boolean,
): VisualizationProjectionGroup | undefined {
  const nodeIds = nodes.filter(predicate).map((node) => node.id).sort(compareText);
  return nodeIds.length ? { id, label, order, nodeIds } : undefined;
}

function definedGroups(
  groups: Array<VisualizationProjectionGroup | undefined>,
): VisualizationProjectionGroup[] {
  return groups.filter((group): group is VisualizationProjectionGroup => Boolean(group));
}

function buildProjections(
  nodes: readonly VisualizationNode[],
  edges: readonly VisualizationEdge[],
  groups: readonly VisualizationGroup[],
): VisualizationProjection[] {
  const degree = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }

  const layerGroups = groups.map((group) => ({
    id: group.id,
    label: group.label,
    order: group.order,
    nodeIds: nodes
      .filter((node) => node.group === group.id)
      .map((node) => node.id)
      .sort(compareText),
  }));

  return [
    {
      id: "layer",
      label: "Architecture layer",
      description: "Canonical MSSP layers plus unclassified and unresolved boundaries.",
      groupBy: "architecture-layer",
      groups: layerGroups,
    },
    {
      id: "status",
      label: "Declaration status",
      description: "Declared modules, unclassified candidates, and unresolved references.",
      groupBy: "node-status",
      groups: definedGroups([
        projectionGroup("declared", "Declared", 0, nodes, (node) => node.status === "declared"),
        projectionGroup("unclassified", "Unclassified", 1, nodes, (node) => node.status === "unclassified"),
        projectionGroup("unresolved", "Unresolved", 2, nodes, (node) => node.status === "unresolved"),
      ]),
    },
    {
      id: "risk",
      label: "Risk level",
      description: "Declared risk metadata without inferring risk for undeclared entities.",
      groupBy: "risk-level",
      groups: definedGroups([
        ...(["L0", "L1", "L2", "L3", "L4"] as const).map((risk, order) =>
          projectionGroup(risk, risk, order, nodes, (node) => node.riskLevel === risk)),
        projectionGroup(
          "UNSPECIFIED",
          "Unspecified",
          5,
          nodes,
          (node) => node.riskLevel === undefined,
        ),
      ]),
    },
    {
      id: "connectivity",
      label: "Relation connectivity",
      description: "A structural degree view derived only from visible declared relations.",
      groupBy: "relation-degree",
      groups: definedGroups([
        projectionGroup("isolated", "Isolated (0)", 0, nodes, (node) => (degree.get(node.id) ?? 0) === 0),
        projectionGroup("leaf", "Leaf (1)", 1, nodes, (node) => (degree.get(node.id) ?? 0) === 1),
        projectionGroup("connected", "Connected (2–3)", 2, nodes, (node) => {
          const value = degree.get(node.id) ?? 0;
          return value >= 2 && value <= 3;
        }),
        projectionGroup("hub", "Hub (4+)", 3, nodes, (node) => (degree.get(node.id) ?? 0) >= 4),
      ]),
    },
  ];
}

export function buildVisualizationModel(
  model: MsspIntermediateModel,
  options: VisualizationOptions = {},
): MsspVisualizationModel {
  const defaultProjection = options.defaultProjection ?? "layer";
  if (!VISUALIZATION_PROJECTION_IDS.includes(defaultProjection)) {
    throw new Error(`Unknown visualization projection '${defaultProjection}'.`);
  }

  const threshold = positiveInteger(
    options.largeGraphThreshold,
    DEFAULT_LARGE_GRAPH_THRESHOLD,
    "largeGraphThreshold",
  );
  const initialNodeLimit = positiveInteger(
    options.initialNodeLimit,
    DEFAULT_INITIAL_NODE_LIMIT,
    "initialNodeLimit",
  );
  const batchSize = positiveInteger(options.batchSize, DEFAULT_BATCH_SIZE, "batchSize");
  const maxRenderedEdges = positiveInteger(
    options.maxRenderedEdges,
    DEFAULT_MAX_RENDERED_EDGES,
    "maxRenderedEdges",
  );

  const nodes = [
    ...model.modules.map((module) => moduleNode(module, options)),
    ...model.candidates.map((candidate) => candidateNode(candidate, options)),
  ];
  const nodeIds = new Set(nodes.map((node) => node.id));

  for (const relation of model.relations) {
    if (!nodeIds.has(relation.from)) {
      nodes.push(unresolvedNode(relation.from, relation.source, options));
      nodeIds.add(relation.from);
    }
    if (!nodeIds.has(relation.to)) {
      nodes.push(unresolvedNode(relation.to, relation.source, options));
      nodeIds.add(relation.to);
    }
  }

  nodes.sort((a, b) => {
    const groupDifference = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
    return groupDifference || compareText(a.id, b.id);
  });

  const edgesById = new Map<string, VisualizationEdge>();
  for (const relation of model.relations) {
    const id = `${relation.kind}:${relation.from}->${relation.to}`;
    if (!edgesById.has(id)) {
      edgesById.set(id, {
        id,
        from: relation.from,
        to: relation.to,
        kind: relation.kind,
        label: relation.kind,
        source: relation.source,
        evidenceCount: relation.evidence.length,
      });
    }
  }
  const edges = [...edgesById.values()].sort((a, b) => compareText(a.id, b.id));

  const usedGroups = new Set(nodes.map((node) => node.group));
  const groups = GROUP_ORDER
    .filter((group) => usedGroups.has(group))
    .map((group, order) => ({
      id: group,
      label: groupLabel(group),
      order,
    }));

  return {
    schemaVersion: MSSP_VISUALIZATION_VERSION,
    kind: MSSP_VISUALIZATION_KIND,
    generatedBy: model.generatedBy,
    project: {
      id: model.project.id,
      name: model.project.name,
      version: model.project.version,
    },
    view: {
      layout: "layered",
      direction: "left-to-right",
      interactive: true,
      sourceNavigation: nodes.some((node) => Boolean(node.sourceHref)),
      defaultProjection,
      availableProjections: [...VISUALIZATION_PROJECTION_IDS],
    },
    groups,
    projections: buildProjections(nodes, edges, groups),
    nodes,
    edges,
    scale: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      largeGraph: nodes.length >= threshold,
      threshold,
      initialNodeLimit,
      batchSize,
      maxRenderedEdges,
      nodeRendering: "bounded-batch",
      edgeRendering: "visible-endpoints-only",
    },
    invariants: {
      readOnly: true,
      autoMutation: false,
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function visualizationToHtml(model: MsspVisualizationModel): string {
  const title = `${model.project.name} — MSSP Architecture`;
  const payload = safeJson(model);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: Canvas; color: CanvasText; }
    header { position: sticky; top: 0; z-index: 10; padding: 1rem; border-bottom: 1px solid color-mix(in srgb, CanvasText 18%, transparent); background: color-mix(in srgb, Canvas 94%, transparent); backdrop-filter: blur(12px); }
    h1 { margin: 0 0 .25rem; font-size: 1.2rem; }
    .meta { opacity: .72; font-size: .85rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .8rem; align-items: center; }
    .control-group { display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; }
    input, button { border: 1px solid color-mix(in srgb, CanvasText 25%, transparent); border-radius: .55rem; padding: .55rem .7rem; background: Canvas; color: CanvasText; }
    input { min-width: 17rem; }
    button { cursor: pointer; }
    button[aria-pressed="false"] { opacity: .48; }
    main { display: grid; grid-template-columns: minmax(0, 1fr) 19rem; min-height: calc(100vh - 9rem); }
    #viewport { position: relative; overflow: auto; padding: 1rem; }
    #edges { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
    #board { position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(15rem, 1fr); gap: 1rem; min-width: max-content; }
    .group { min-width: 15rem; border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: .8rem; padding: .7rem; background: color-mix(in srgb, Canvas 96%, CanvasText 4%); }
    .group h2 { margin: 0 0 .7rem; font-size: .86rem; letter-spacing: .08em; text-transform: uppercase; }
    .node-list { display: grid; gap: .65rem; }
    .node { position: relative; z-index: 2; width: 100%; text-align: left; border-radius: .7rem; padding: .75rem; background: Canvas; box-shadow: 0 4px 16px color-mix(in srgb, CanvasText 10%, transparent); }
    .node strong, .node small { display: block; }
    .node small { margin-top: .3rem; opacity: .66; }
    .node[data-status="unclassified"] { border-style: dashed; }
    .node[data-status="unresolved"] { border-style: dotted; opacity: .75; }
    .node.selected { outline: 3px solid Highlight; outline-offset: 2px; }
    #more { margin: 1rem; }
    aside { border-left: 1px solid color-mix(in srgb, CanvasText 18%, transparent); padding: 1rem; overflow: auto; }
    aside h2 { margin-top: 0; font-size: 1rem; }
    dl { display: grid; grid-template-columns: 6rem 1fr; gap: .45rem .7rem; font-size: .86rem; }
    dt { opacity: .62; }
    dd { margin: 0; overflow-wrap: anywhere; }
    a { color: LinkText; }
    path { fill: none; stroke: color-mix(in srgb, CanvasText 34%, transparent); stroke-width: 1.5; }
    path[data-kind="affects"], path[data-kind="affected-by"] { stroke-dasharray: 6 4; }
    @media (max-width: 850px) { main { grid-template-columns: 1fr; } aside { border-left: 0; border-top: 1px solid color-mix(in srgb, CanvasText 18%, transparent); } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <div id="meta" class="meta">Read-only multi-view architecture</div>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Search modules, candidates, or source paths" aria-label="Search architecture">
      <div id="projections" class="control-group" role="group" aria-label="Projection views"></div>
      <div id="filters" class="control-group" role="group" aria-label="Projection group filters"></div>
    </div>
  </header>
  <main>
    <section id="viewport" aria-label="Architecture graph">
      <svg id="edges" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs></svg>
      <div id="board"></div>
      <button id="more" type="button" hidden>Show more</button>
    </section>
    <aside id="details"><h2>Selection</h2><p>Select a node to inspect its contract and source reference.</p></aside>
  </main>
  <script id="mssp-data" type="application/json">${payload}</script>
  <script>
    const model = JSON.parse(document.getElementById("mssp-data").textContent);
    const board = document.getElementById("board");
    const viewport = document.getElementById("viewport");
    const svg = document.getElementById("edges");
    const details = document.getElementById("details");
    const search = document.getElementById("search");
    const filters = document.getElementById("filters");
    const projections = document.getElementById("projections");
    const more = document.getElementById("more");
    const meta = document.getElementById("meta");
    const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
    const projectionById = new Map(model.projections.map((projection) => [projection.id, projection]));
    const edgeIndexesByNode = new Map();
    model.edges.forEach((edge, index) => {
      for (const id of [edge.from, edge.to]) {
        const indexes = edgeIndexesByNode.get(id) || [];
        indexes.push(index);
        edgeIndexesByNode.set(id, indexes);
      }
    });

    let activeProjectionId = model.view.defaultProjection;
    let enabledGroups = new Set();
    let visibleLimit = model.scale.largeGraph ? model.scale.initialNodeLimit : Number.POSITIVE_INFINITY;
    let selectedNodeId;

    function text(value) {
      return value === undefined || value === null ? "" : String(value);
    }

    function create(tag, className, content) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (content !== undefined) element.textContent = content;
      return element;
    }

    function activeProjection() {
      return projectionById.get(activeProjectionId) || model.projections[0];
    }

    function resetProjectionState() {
      const projection = activeProjection();
      enabledGroups = new Set(projection.groups.map((group) => group.id));
      visibleLimit = model.scale.largeGraph ? model.scale.initialNodeLimit : Number.POSITIVE_INFINITY;
    }

    for (const projection of model.projections) {
      const button = create("button", "", projection.label);
      button.type = "button";
      button.dataset.projectionId = projection.id;
      button.title = projection.description;
      button.addEventListener("click", () => {
        activeProjectionId = projection.id;
        resetProjectionState();
        render();
      });
      projections.appendChild(button);
    }

    function renderFilters(projection) {
      filters.replaceChildren();
      for (const group of projection.groups) {
        const button = create("button", "", group.label);
        button.type = "button";
        button.setAttribute("aria-pressed", enabledGroups.has(group.id) ? "true" : "false");
        button.addEventListener("click", () => {
          if (enabledGroups.has(group.id)) enabledGroups.delete(group.id); else enabledGroups.add(group.id);
          render();
        });
        filters.appendChild(button);
      }
    }

    function matchesSearch(node, query) {
      if (!query) return true;
      return [node.id, node.label, node.sourceUri, node.purpose, node.version, node.riskLevel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    }

    function render() {
      const projection = activeProjection();
      const query = search.value.trim().toLowerCase();
      document.querySelectorAll("[data-projection-id]").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.projectionId === projection.id ? "true" : "false");
      });
      renderFilters(projection);

      const matches = [];
      for (const group of projection.groups) {
        if (!enabledGroups.has(group.id)) continue;
        for (const nodeId of group.nodeIds) {
          const node = nodeById.get(nodeId);
          if (node && matchesSearch(node, query)) matches.push({ group, node });
        }
      }

      const displayed = matches.slice(0, visibleLimit);
      const displayedByGroup = new Map();
      for (const item of displayed) {
        const items = displayedByGroup.get(item.group.id) || [];
        items.push(item.node);
        displayedByGroup.set(item.group.id, items);
      }

      board.replaceChildren();
      for (const group of projection.groups) {
        const items = displayedByGroup.get(group.id) || [];
        if (!items.length) continue;
        const column = create("section", "group");
        column.dataset.projectionGroup = group.id;
        column.appendChild(create("h2", "", group.label));
        const list = create("div", "node-list");
        for (const node of items) {
          const card = create("button", "node");
          card.type = "button";
          card.dataset.nodeId = node.id;
          card.dataset.status = node.status;
          card.appendChild(create("strong", "", node.label));
          card.appendChild(create("small", "", node.id));
          if (node.id === selectedNodeId) card.classList.add("selected");
          card.addEventListener("click", () => selectNode(node.id));
          list.appendChild(card);
        }
        column.appendChild(list);
        board.appendChild(column);
      }

      more.hidden = displayed.length >= matches.length;
      more.textContent = "Show more (" + displayed.length + "/" + matches.length + ")";
      meta.textContent = "Read-only " + projection.label.toLowerCase() + " view · "
        + displayed.length + "/" + matches.length + " visible · "
        + model.scale.nodeCount + " nodes · " + model.scale.edgeCount + " relations"
        + (model.scale.largeGraph ? " · bounded-batch rendering" : "");
      requestAnimationFrame(drawEdges);
    }

    function selectNode(id) {
      selectedNodeId = id;
      document.querySelectorAll(".node.selected").forEach((element) => element.classList.remove("selected"));
      const selected = document.querySelector('[data-node-id="' + CSS.escape(id) + '"]');
      if (selected) selected.classList.add("selected");
      const node = nodeById.get(id);
      if (!node) return;
      details.replaceChildren();
      details.appendChild(create("h2", "", node.label));
      const list = document.createElement("dl");
      const fields = [
        ["ID", node.id], ["Kind", node.kind], ["Status", node.status], ["Layer", node.group],
        ["Version", node.version], ["Risk", node.riskLevel], ["Purpose", node.purpose],
        ["Entry", node.entry], ["Boundary", node.boundaryKind], ["Confidence", node.boundaryConfidence],
        ["Files", node.fileCount], ["Source files", node.sourceFileCount],
        ["Languages", node.languages ? node.languages.join(", ") : undefined], ["Source", node.sourceUri]
      ];
      for (const field of fields) {
        if (field[1] === undefined || field[1] === "") continue;
        list.appendChild(create("dt", "", field[0]));
        const value = document.createElement("dd");
        value.textContent = text(field[1]);
        list.appendChild(value);
      }
      details.appendChild(list);
      if (node.sourceHref) {
        const link = create("a", "", "Open source");
        link.href = node.sourceHref;
        link.target = "_blank";
        link.rel = "noreferrer";
        details.appendChild(link);
      }
    }

    function drawEdges() {
      svg.querySelectorAll("path.edge").forEach((path) => path.remove());
      const nodeElements = [...document.querySelectorAll(".node")];
      const visibleIds = new Set(nodeElements.map((element) => element.dataset.nodeId));
      const candidateIndexes = new Set();
      for (const id of visibleIds) {
        for (const index of edgeIndexesByNode.get(id) || []) candidateIndexes.add(index);
      }
      const bounds = viewport.getBoundingClientRect();
      svg.setAttribute("width", String(viewport.scrollWidth));
      svg.setAttribute("height", String(viewport.scrollHeight));
      const indexes = [...candidateIndexes].sort((a, b) => a - b).slice(0, model.scale.maxRenderedEdges);
      for (const index of indexes) {
        const edge = model.edges[index];
        if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) continue;
        const from = document.querySelector('[data-node-id="' + CSS.escape(edge.from) + '"]');
        const to = document.querySelector('[data-node-id="' + CSS.escape(edge.to) + '"]');
        if (!from || !to) continue;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const x1 = a.right - bounds.left + viewport.scrollLeft;
        const y1 = a.top + a.height / 2 - bounds.top + viewport.scrollTop;
        const x2 = b.left - bounds.left + viewport.scrollLeft;
        const y2 = b.top + b.height / 2 - bounds.top + viewport.scrollTop;
        const bend = Math.max(36, Math.abs(x2 - x1) * .42);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add("edge");
        path.dataset.kind = edge.kind;
        path.setAttribute("d", "M " + x1 + " " + y1 + " C " + (x1 + bend) + " " + y1 + ", " + (x2 - bend) + " " + y2 + ", " + x2 + " " + y2);
        path.setAttribute("marker-end", "url(#arrow)");
        svg.appendChild(path);
      }
    }

    search.addEventListener("input", () => {
      visibleLimit = model.scale.largeGraph ? model.scale.initialNodeLimit : Number.POSITIVE_INFINITY;
      render();
    });
    more.addEventListener("click", () => {
      visibleLimit += model.scale.batchSize;
      render();
    });
    window.addEventListener("resize", () => requestAnimationFrame(drawEdges));
    viewport.addEventListener("scroll", () => requestAnimationFrame(drawEdges));
    resetProjectionState();
    render();
  </script>
</body>
</html>
`;
}
