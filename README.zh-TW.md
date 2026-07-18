# MSSP Core MVP

[English](README.md)

**MSSP（Mother-Set and Subset Paradigm，母集與子集範式）**是一套語言無關的架構方法，用來讓複雜系統可以被理解、導航、驗證、治理與演化。

MSSP 不是另一個應用框架，也不是資料夾命名規則。它要求系統把本體聲明、穩定能力、可選子集、變更權限、診斷、路由、執行、相容性與變更影響寫成機器可讀的架構契約。

## 核心模型

```text
MSSP = (FMS, SCL, SMS, TMS, DMS, Router, Runtime)
```

| 層級 | 回答的問題 | 核心不變條件 |
|---|---|---|
| FMS | 這個系統是什麼？ | 保存本體與架構聲明，禁止可執行原始碼。 |
| SCL | 系統允許如何改變？ | 以機器可讀契約描述權限、批准與禁止事項。 |
| SMS | 哪些能力必須保持穩定？ | 不得依賴可選 TMS。 |
| TMS | 哪些能力可以載入、替換或移除？ | 僅依賴已聲明 SMS，並可接受孤島測試。 |
| DMS | 系統如何被觀測與解釋？ | 產生證據，但不擁有業務狀態。 |
| Router | 何時選擇哪個可選子集？ | 依契約選擇，不把 TMS 偷渡為核心依賴。 |
| Runtime | 已批准的計畫如何執行？ | 只執行正式聲明的模組並輸出可觀測證據。 |

MSSP-VT 透過每個模組的 `version`、`compatibility` 與 `changeImpact` 進入架構契約。

## 已實作命令

- `mssp init`：建立可直接採用的專案骨架。
- `mssp lint`：檢查 Schema、層級位置、依賴方向、FMS 純度、循環、入口與 MSSP-VT 關聯。
- `mssp island`：檢查 TMS 孤島測試義務。
- `mssp model`：輸出可重現、語言無關的 Intermediate Model。
- `mssp scan`：發現倉庫結構與靜態依賴證據，不分配 MSSP 層級。
- `mssp classify`：輸出有證據、必須審查的層級假說，不自動升格。
- `mssp review-candidate`：記錄核准、拒絕或延後決策。
- `mssp promote-candidate`：在契約補完及獨立批准後輸出 module manifest。
- `mssp drift`：比較 Canonical FMS、manifest 與有界原始碼所有權。
- `mssp impact`：把明確 Git 比較映射為直接與 MSSP-VT 傳播影響。
- `mssp graph`：從 Intermediate Model 產生 Mermaid 或 JSON 架構圖。
- `mssp explain`：輸出簡潔架構清單。

Scanner 不宣告架構。Classifier 不批准候選。審查核准不等於契約完成。Manifest 輸出不等於模組註冊。Drift 與 Impact 報告都不能修改或批准自己所描述的架構。

## 五分鐘開始

```bash
npm install
npm run build

node dist/cli.js init /tmp/my-mssp-project
node dist/cli.js lint /tmp/my-mssp-project
node dist/cli.js model /tmp/my-mssp-project --out /tmp/mssp-model.json
node dist/cli.js scan . --revision HEAD --out /tmp/repository-scan.json
node dist/cli.js classify . --revision HEAD --out /tmp/classification-suggestions.json
node dist/cli.js review-candidate . \
  --candidate candidate.repository \
  --decision defer \
  --reviewer architecture-reviewer \
  --rationale "聚合邊界仍需要系統層級判斷。" \
  --out /tmp/promotion-review.json
node dist/cli.js drift /tmp/my-mssp-project \
  --revision HEAD \
  --out /tmp/architecture-drift.json
node dist/cli.js impact /tmp/my-mssp-project \
  --base origin/main \
  --head HEAD \
  --revision HEAD \
  --out /tmp/git-diff-impact.json
node dist/cli.js island /tmp/my-mssp-project
node dist/cli.js graph /tmp/my-mssp-project \
  --format mermaid \
  --out /tmp/architecture.mmd
```

倉庫開發期間：

```bash
npm run mssp -- lint examples/hello-mssp
npm run mssp -- model examples/hello-mssp --revision HEAD
npm run mssp -- scan . --revision HEAD --max-files 10000
npm run mssp -- classify . --revision HEAD --max-files 10000
npm run mssp -- drift examples/hello-mssp --revision HEAD --max-files 10000
npm run mssp -- impact examples/hello-mssp --base HEAD^1 --head HEAD --revision HEAD
npm run mssp -- island examples/hello-mssp
npm run mssp -- graph examples/hello-mssp --format mermaid
```

## 交換與治理規格

- [MSSP Diagnostic Protocol v0.2](spec/MSSP-DIAGNOSTIC-PROTOCOL-v0.2.md)
- [MSSP Intermediate Model v0.2](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md)
- [MSSP Repository Scanner v0.2](spec/MSSP-REPOSITORY-SCANNER-v0.2.md)
- [MSSP Classification Suggestions v0.2](spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md)
- [MSSP Candidate Review and Promotion Protocol v0.2](spec/MSSP-CANDIDATE-PROMOTION-v0.2.md)
- [MSSP Architecture Drift Report v0.2](spec/MSSP-ARCHITECTURE-DRIFT-v0.2.md)
- [MSSP Git Diff Impact Analysis v0.2](spec/MSSP-GIT-DIFF-IMPACT-v0.2.md)

診斷 JSON 消費者應讀取 `diagnostics[].code`；v0.1 內部代碼保留在 `diagnostics[].legacyCode`。

## 倉庫智慧流程

```text
既有倉庫
  → 可重現 Scanner 證據
  → 尚未分類的 candidates
  → Advisory classification suggestions
  → 明確審查決策
  → 受阻塞契約草稿
  → 契約補完
  → 獨立最終批准
  → Manifest 輸出
  → 另外完成專案註冊
```

目前 Scanner 可辨識常見 Node.js、Python、Rust、Go、Godot、JVM 與 .NET 標記；npm、pnpm 與 Cargo Workspace；根目錄及巢狀 `.gitignore`；生成檔慣例；以及 JavaScript／TypeScript、Python、Go、Rust、GDScript 靜態引用。

靜態依賴只保存在 `discovery.dependencies`，不會自行升格為正式 runtime `relations`。

Classifier 可建議 `FMS`、`SCL`、`SMS`、`TMS`、`DMS`、`ROUTER`、`RUNTIME` 或 `UNDETERMINED`，但永遠保留：

```json
{
  "mode": "advisory",
  "autoPromotion": false,
  "status": "review-required"
}
```

## Candidate 審查與升格

```text
Suggestion ≠ Review Decision
Review Approval ≠ Completed Contract
Completed Contract ≠ Final Approval
Manifest Emission ≠ Project Registration
```

已核准候選會先產生刻意不完整的契約草稿。只要仍有 TODO、未解除條件、被截斷的掃描、缺少入口、TMS activation、failure behavior、validation 或 tests，升格就會被阻擋。

最終批准者必須不同於分類審查者。輸出的 manifest 會在 `metadata.promotion` 保存審查與批准來源。升格不會修改 `mssp.yaml`，也不會建立 runtime relations。

中文指南：[Candidate 審查與升格](docs/candidate-promotion.zh-TW.md)。

## 架構漂移報告

```text
Canonical FMS records
        ↕
Module manifests
        ↕
Configured layer source ownership
```

執行：

```bash
node dist/cli.js drift examples/hello-mssp \
  --revision HEAD \
  --max-files 10000 \
  --out architecture-drift.json
```

報告檢查 Canonical FMS 文件是否存在、保守解析 `FMS/01_MODULE_INDEX.md` 的明確 `ID` 與 `Layer` 表格、比較索引與 module manifests，並驗證設定層級下的可執行原始碼是否具有唯一 owner。

每份報告固定保留：

```json
{
  "analysis": {
    "mode": "static-conservative",
    "semanticEquivalence": false,
    "autoMutation": false
  }
}
```

`consistent` 只代表結構一致。自然語言語義、執行行為、部署拓撲與歷史等價性都沒有被證明。

中文指南：[架構漂移](docs/architecture-drift.zh-TW.md)。

## Git Diff Impact 分析

```text
Git changed paths
      ↓
直接 Module ownership
      ↓
已聲明 MSSP-VT 傳播
      ↓
Review obligations
```

執行：

```bash
node dist/cli.js impact examples/hello-mssp \
  --base origin/main \
  --head HEAD \
  --revision HEAD \
  --out git-diff-impact.json
```

分析器使用直接的 Git name-status 證據與 rename detection，並區分 module manifest、已聲明 entry 與其他 module-owned paths。新增、刪除與跨 MSSP 專案邊界的重新命名，會保留明確的 `into-project` 或 `out-of-project` transition。

影響依目前正式聲明傳播：

```text
A.changeImpact.affects contains B
B.changeImpact.affectedBy contains A
B.requires.modules contains A
B.compatibility.modules contains A
```

報告可以要求 `fms`、`scl`、`module-contract`、`version`、`compatibility`、`tests` 與 `island` 審查。

每份報告固定保留：

```json
{
  "analysis": {
    "mode": "static-conservative",
    "semanticCompatibility": false,
    "autoVersionBump": false,
    "autoMutation": false
  }
}
```

`impact-detected` 表示審查範圍已知，不代表變更不相容。`indeterminate` 表示 ownership、關係目標、路徑轉移或生成來源仍不完整。分析器不會自行選擇 patch、minor 或 major 版本。

中文指南：[Git Diff Impact](docs/git-diff-impact.zh-TW.md)。

## Module contract 範例

```yaml
schemaVersion: "0.1"
id: plugin.export-pdf
name: PDF Export
version: "0.1.0"
layer: TMS
purpose: 將已驗證文件輸出為 PDF。
entry: index.ts
activateWhen:
  - request.output == pdf
inputs: [validated-document]
outputs: [pdf-file]
requires:
  modules: [core.document-model]
  tools: []
  data: []
permissions:
  may: [read-document, write-output]
  mayNot: [network, overwrite-source]
riskLevel: L1
failureModes: [invalid-document, output-write-failure]
validation:
  - output file exists
  - source document is unchanged
tests:
  - exports a minimal document
  - rejects malformed input safely
compatibility:
  mssp: ">=0.1 <0.2"
  modules:
    core.document-model: ">=1 <2"
changeImpact:
  affects: []
  affectedBy: [core.document-model]
maintainer: example-team
```

## Intermediate Model 邊界

```text
MSSP YAML / Repository Scanner / EML / Python / Rust / Godot
                              ↓
                  MSSP Intermediate Model
                              ↓
Validator / Graph / IDE / Agent / Drift / Impact Analysis
```

中介模型區分已批准的 `modules`、尚未分類的 `candidates`，以及正式 `relations` 與 Scanner 的 `discovery.dependencies`。

## 與 EML 的關係

```text
MSSP = 架構組織、能力定位、子集治理
EML  = 語義表達、壓縮、可執行語言工具鏈
```

未來 `@eml/mssp-adapter` 可以把 EML AST 與 trace 轉換為 Intermediate Model 與 Diagnostic Protocol。MSSP Core 仍必須獨立於 EML parser、runtime、editor 與 emitters。

## 倉庫結構

```text
schemas/                 正式 Schema
src/                     TypeScript Core 與 CLI
examples/hello-mssp/     完整參考案例
spec/                    規範與互通協議
docs/                    採用、協議、Roadmap 與研究指南
.github/                  CI 與架構審查流程
```

## 目前狀態

`v0.1.0` 是架構契約 MVP。v0.2 Repository Intelligence 的主要垂直切片已實作：Diagnostic Protocol、Intermediate Model、Scanner、靜態依賴證據、Advisory Classification、受治理升格、結構漂移，以及 Git Diff Impact Analysis。

編譯器等級 AST 依賴抽取、完整語言 alias 解析、完全等價的 Git ignore 行為、生成來源追蹤、patch hunk／symbol-level impact，以及自動 Semantic Version 選擇，仍不屬於目前 Reference Implementation。

## 授權

Apache-2.0。Copyright 2026 Neo.K / EVEMISSLAB。
