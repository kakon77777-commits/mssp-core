# MSSP Core MVP

[English](README.md)

**MSSP（Mother-Set and Subset Paradigm，母集與子集範式）**是一套語言無關的架構方法，用來讓複雜系統可以被理解、導航、測試、治理、觀測與演化。

MSSP 不是應用框架，也不是資料夾命名規則。它把系統本體、穩定能力、可選子集、變更權限、診斷、路由、執行、相容性與變更影響表示為機器可讀契約。

## 核心模型

```text
MSSP = (FMS, SCL, SMS, TMS, DMS, Router, Runtime)
```

| 層級 | 責任 | 核心不變條件 |
|---|---|---|
| FMS | 系統本體與 Canonical 架構紀錄 | 僅允許聲明，不得放置可執行原始碼。 |
| SCL | 變更權限、批准與禁止事項 | 治理誰可以在何種條件下改變什麼。 |
| SMS | 系統閉合所必須維持的穩定能力 | 不得依賴可選 TMS。 |
| TMS | 可選、可替換或可移除能力 | 僅依賴正式聲明的 SMS，並保持可孤島測試。 |
| DMS | 觀測、診斷與解釋 | 產生證據，但不擁有業務狀態。 |
| Router | 依契約選擇可選子集 | 不把 TMS 偷渡成核心依賴。 |
| Runtime | 執行已批准計畫 | 只執行正式聲明模組並輸出可觀測證據。 |

MSSP-VT 透過每個模組的 `version`、`compatibility` 與 `changeImpact` 進入架構契約。

## 已實作命令

```text
mssp init
mssp lint
mssp explain
mssp graph
mssp island
mssp model
mssp scan
mssp classify
mssp review-candidate
mssp promote-candidate
mssp drift
mssp impact
mssp route
mssp viz
mssp adapters
mssp adapt
```

核心邊界：

```text
Scanner 證據          ≠ 架構聲明
Classification        ≠ Promotion
Review Approval       ≠ Completed Contract
Manifest Emission     ≠ Project Registration
Drift Consistency     ≠ Semantic Equivalence
Impact Detected       ≠ Incompatibility
Router Selected       ≠ Activated 或 Executed
Permission Match      ≠ Permission Grant
Compatibility Pass    ≠ Runtime Compatibility Proof
Visualization         ≠ Architecture Authority
Projection Grouping   ≠ Canonical Layer Mutation
Hidden Renderer Data  ≠ Absent Architecture
Adapter Metadata      ≠ Module Declaration 或 Permission Grant
```

## 快速開始

```bash
npm install
npm run build

node dist/cli.js lint examples/hello-mssp
node dist/cli.js model examples/hello-mssp --revision HEAD --out intermediate-model.json
node dist/cli.js scan . --revision HEAD --max-files 10000 --out repository-scan.json
node dist/cli.js classify . --revision HEAD --max-files 10000 --out classification-suggestions.json
node dist/cli.js drift examples/hello-mssp --revision HEAD --out architecture-drift.json
node dist/cli.js impact examples/hello-mssp --base HEAD^1 --head HEAD --revision HEAD --out git-diff-impact.json
node dist/cli.js route examples/hello-mssp --request examples/hello-mssp/router-request.json --revision HEAD --out router-evaluation.json
node dist/cli.js viz examples/hello-mssp --format html --view layer --revision HEAD --out architecture.html
node dist/cli.js graph examples/hello-mssp --format mermaid --out architecture.mmd
```

## Intermediate Model 流程

```text
MSSP YAML / Repository Scanner / External Semantic Export
                          ↓
               MSSP Intermediate Model v0.2
                          ↓
Validator / Graph / Visualization / IDE / Agent / Drift / Impact
```

模型明確區分：

```text
正式 Modules           與尚未分類的 Candidates
Normative Relations   與 Scanner Discovery Evidence
Portable Provenance   與本機環境狀態
Source Representation 與 Architecture Approval
```

## 倉庫智慧

目前 v0.2 流程：

```text
既有倉庫
  → 可重現、有界掃描
  → 尚未分類的 Candidates
  → Advisory Classification Suggestions
  → 明確 Review Decision
  → 刻意不完整的 Contract Draft
  → 契約補完
  → 獨立最終批准
  → Manifest Emission
  → 另外完成 Project Registration
```

Scanner 可辨識常見 Node.js、Python、Rust、Go、Godot、JVM 與 .NET 標記；npm、pnpm 與 Cargo Workspace；巢狀 `.gitignore` 證據；生成檔慣例；以及 JavaScript／TypeScript、Python、Go、Rust、GDScript 的靜態引用。

靜態引用保留在 `discovery.dependencies`，不會自行成為正式 Runtime Relation。

## Router 治理

`mssp route` 根據明確 Router Request 與既有 Module Contract，判斷正式 TMS 是否具備靜態選擇資格。

```bash
node dist/cli.js route examples/hello-mssp \
  --request examples/hello-mssp/router-request.json \
  --revision HEAD \
  --out router-evaluation.json
```

Request 明確提供 Facts、MSSP Version、可用 Inputs／Modules／Tools／Data、所需 Outputs、預期操作、Risk 上限與選配 Target Set。

Evaluator 會檢查：

```text
activateWhen Conditions
Input 與 Output Contracts
Required Module Availability
Required Tools 與 Data
permissions.may 與 permissions.mayNot
Risk Ceiling
MSSP 與 Required Module Version Ranges
```

只有正式聲明為 TMS 的 Module 才是 Candidate。結果分為：

```text
selected       只有一個 Eligible TMS，且沒有不確定項
ambiguous      多個 TMS 同時 Eligible
no-match       沒有 Eligible TMS，且沒有不確定項
indeterminate  仍有無法保守判定的證據
```

Evaluator 不會在多個 Eligible TMS 中透過隱藏排序擅自選擇。無法理解的 Activation 或 Version 語法會保留為 `indeterminate`，而不是猜測。

Router Evaluation 固定保持：

```json
{
  "deterministic": true,
  "readOnly": true,
  "noExecution": true,
  "noNetwork": true,
  "autoActivation": false,
  "autoMutation": false,
  "runtimeCompatibilityProof": false
}
```

`selected` 只代表 Static Contract Eligibility。SCL Approval、Permission Grant、Execution Planning、Module Activation 與 Runtime Compatibility Proof 仍是不同階段。

## 視覺化

`mssp viz` 可以輸出可重現 JSON，或單一自包含互動式 HTML。

```bash
node dist/cli.js viz examples/hello-mssp \
  --format html \
  --view connectivity \
  --large-graph-threshold 500 \
  --initial-node-limit 200 \
  --batch-size 200 \
  --max-rendered-edges 2000 \
  --revision HEAD \
  --source-base https://github.com/OWNER/REPO/blob/BRANCH \
  --out architecture.html
```

HTML 內含自己的 CSS、JavaScript 與 Model Payload，不載入 CDN、外部字型、分析服務或 Runtime Library。

可重現的唯讀 Projection：

```text
layer         Canonical MSSP Layers
status        declared / unclassified / unresolved
risk          L0–L4 / UNSPECIFIED
connectivity  isolated / leaf / connected / hub
```

每一種 Projection 都包含完整且相同的 Node 集合，而且每個 Node 只出現一次。Projection Group 不會改變 Node 的 Canonical Layer、Status、Source、Declaration 或 Relation。

Risk View 不會替未聲明 Node 推測 Risk；Relation Degree 也不會被解讀為重要性、權力、品質或 Runtime 中心性。

大型圖行為明確記錄於 `scale`：

```text
bounded-batch nodes
visible-endpoints-only edges
可調整初始 Node 數與每批增加量
可調整單次最大 SVG Edge 數
完整 Nodes 與 Edges 仍保存在內嵌 Model
```

Renderer 支援 Projection 切換、Projection Group Filter、搜尋、Node Detail、Relation Drawing、漸進式 `Show more` 與選擇性 Source Navigation。

Visualization 固定保持：

```json
{
  "readOnly": true,
  "autoMutation": false
}
```

## Adapter 互通

MSSP Core 消費版本化 Semantic Export，而不是把來源 Runtime、Compiler、Editor、Package Manager 或 Agent Framework 引進 Core。

```text
來源生態的 Exporter
        ↓ versioned JSON
 MSSP Adapter Registry
        ↓ deterministic translation
 Intermediate Model v0.2
```

列出 Descriptor：

```bash
node dist/cli.js adapters
node dist/cli.js adapters --json --out adapter-descriptors.json
```

目前 Reference Adapter：

| Adapter ID | CLI Alias | 輸入 |
|---|---|---|
| `agent-skill-mssp-export` | `agent-skill`, `skill` | Agent／Skill Semantic Export v0.3 |
| `eml-mssp-export` | `eml` | EML Semantic Export v0.3 |
| `godot-mssp-export` | `godot`, `gd` | Godot Semantic Export v0.3 |
| `python-mssp-export` | `python`, `py` | Python Semantic Export v0.3 |
| `rust-mssp-export` | `rust`, `rs` | Rust Semantic Export v0.3 |

執行範例：

```bash
node dist/cli.js adapt agent-skill examples/agent-skill-adapter/semantic-export.json --revision HEAD --out agent-skill-intermediate-model.json
node dist/cli.js adapt eml examples/eml-adapter/semantic-export.json --revision HEAD --out eml-intermediate-model.json
node dist/cli.js adapt godot examples/godot-adapter/semantic-export.json --revision HEAD --out godot-intermediate-model.json
node dist/cli.js adapt python examples/python-adapter/semantic-export.json --revision HEAD --out python-intermediate-model.json
node dist/cli.js adapt rust examples/rust-adapter/semantic-export.json --revision HEAD --out rust-intermediate-model.json
```

所有 Reference Adapter 固定維持：

```json
{
  "deterministic": true,
  "readOnly": true,
  "noExecution": true,
  "noNetwork": true,
  "autoPromotion": false,
  "autoMutation": false
}
```

只有完整且明確的 `declaration` 能映射成 Intermediate Module。沒有 Declaration 的來源實體，即使來源生態稱他為 Module、Package、Crate、Scene、Autoload、Plugin、Agent、Skill、Tool、Workflow 或 Service，也只能保持 `unclassified` Candidate。

正式 Relation 只能來自：

```text
declaration.requirements.modules     → requires
declaration.changeImpact.affects     → affects
declaration.changeImpact.affectedBy  → affected-by
```

Import、Cargo Dependency、Entry Point、Scene Inheritance、Signal、Tool Name、Prompt、Trigger、Permission、Handoff、Resource Access 與名稱相似度，都只能保留為 Metadata 或非規範性證據。

Agent Skill 特別遵守：

```text
Required Permission ≠ Permission Grant
Tool Name           ≠ Runtime Dependency
Trigger             ≠ Activation Approval
Handoff             ≠ Normative Relation
Memory Policy       ≠ SCL Approval
```

## 規範文件

### v0.2 倉庫智慧

- [Diagnostic Protocol v0.2](spec/MSSP-DIAGNOSTIC-PROTOCOL-v0.2.md)
- [Intermediate Model v0.2](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md)
- [Repository Scanner v0.2](spec/MSSP-REPOSITORY-SCANNER-v0.2.md)
- [Classification Suggestions v0.2](spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md)
- [Candidate Review and Promotion v0.2](spec/MSSP-CANDIDATE-PROMOTION-v0.2.md)
- [Architecture Drift v0.2](spec/MSSP-ARCHITECTURE-DRIFT-v0.2.md)
- [Git Diff Impact v0.2](spec/MSSP-GIT-DIFF-IMPACT-v0.2.md)

### v0.3 視覺化與 Adapter

- [Visualization Model v0.3](spec/MSSP-VISUALIZATION-MODEL-v0.3.md)
- [Adapter Contract v0.3](spec/MSSP-ADAPTER-CONTRACT-v0.3.md)
- [EML Adapter v0.3](spec/MSSP-EML-ADAPTER-v0.3.md)
- [Python Adapter v0.3](spec/MSSP-PYTHON-ADAPTER-v0.3.md)
- [Rust Adapter v0.3](spec/MSSP-RUST-ADAPTER-v0.3.md)
- [Godot Adapter v0.3](spec/MSSP-GODOT-ADAPTER-v0.3.md)
- [Agent Skill Adapter v0.3](spec/MSSP-AGENT-SKILL-ADAPTER-v0.3.md)

### v0.4 Runtime Governance

- [Router Contract Evaluator v0.4](spec/MSSP-ROUTER-CONTRACT-EVALUATOR-v0.4.md)

更多繁中說明位於 [`docs/`](docs/)，包括 [Router 指南](docs/router-contract-evaluator.zh-TW.md)、[Visualization 指南](docs/visualization.zh-TW.md)、[綜合 Adapter 指南](docs/adapters.zh-TW.md)、[Godot Adapter 指南](docs/godot-adapter.zh-TW.md)與 [Agent Skill Adapter 指南](docs/agent-skill-adapter.zh-TW.md)。

## 倉庫地圖

```text
schemas/                         規範 JSON Schema
src/                             TypeScript Reference Implementation 與 CLI
examples/hello-mssp/             完整 MSSP Adoption Fixture 與 Router Request
examples/agent-skill-adapter/    Agent Skill Semantic Export Fixture
examples/eml-adapter/            EML Semantic Export Fixture
examples/godot-adapter/          Godot Semantic Export Fixture
examples/python-adapter/         Python Semantic Export Fixture
examples/rust-adapter/           Rust Semantic Export Fixture
spec/                            Normative Specifications
docs/                            Adoption、Roadmap 與研究指南
.github/                         CI 與 Architecture Review Workflow
```

## 目前狀態

- v0.1 Architecture Contract MVP：完成。
- v0.2 主要 Repository Intelligence Vertical Slices：完成。
- v0.3 Visualization、Multi-view／Large-graph Foundation 與五個 Reference Adapter Vertical Slices：完成。
- v0.4 Router Contract Evaluator Foundation：完成。
- Runtime Execution Planning、DMS Trace Transport、SCL Enforcement Hooks 與 Risk-aware Execution Policy 尚未完成。
- Canvas／WebGL Virtualization、Worker-based Layout、Clustering 與實測 Browser Performance Guarantee 仍在目前 Visualization Renderer 範圍之外。
- Compiler-grade AST、完整 Alias／Build Graph、完整 Git-ignore 等價、Generated-source Provenance 與 Automatic Semantic-version Selection 仍在目前實作範圍之外。

參閱 [Roadmap](docs/roadmap.md) 與 [Validation Report](VALIDATION-REPORT.md)。

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
