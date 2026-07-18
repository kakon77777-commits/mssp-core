# MSSP Core MVP

[English](README.md)

**MSSP（Mother-Set and Subset Paradigm，母集與子集範式）**是一套語言無關的架構方法，用來讓複雜系統可以被理解、導航、驗證、治理與演化。

MSSP 不是另一個應用框架，也不是把資料夾改名成 FMS／SMS／TMS。它要求系統將本體聲明、穩定核心、可插拔子集、變更邊界、診斷、路由、執行與版本影響寫成機器可讀的架構契約。

## 核心模型

```text
MSSP = (FMS, SCL, SMS, TMS, DMS, Router, Runtime)
```

| 層級 | 回答的問題 | MVP 不變條件 |
|---|---|---|
| FMS | 這個系統是什麼？ | 純元資料，禁止可執行原始碼 |
| SCL | 系統允許如何被改變？ | 以機器可讀契約描述變更與權限邊界 |
| SMS | 哪些能力必須長期穩定？ | 不得依賴可選 TMS |
| TMS | 哪些能力可以按需載入、替換或移除？ | 僅依賴已聲明 SMS，必須可做孤島測試 |
| DMS | 系統如何被觀測、診斷與向人說明？ | 不擁有業務狀態，只輸出可讀證據 |
| Router | 何時選擇哪個子集？ | 根據契約路由，不把 TMS 偷渡成核心依賴 |
| Runtime | 選出的計畫如何被執行？ | 只執行已聲明模組並留下可觀測證據 |

MSSP-VT 透過每個模組的 `version`、`compatibility` 與 `changeImpact` 進入 MVP。

## MVP 與 v0.2 地基

- `mssp init`：建立可直接採用的 MSSP 專案骨架。
- `mssp lint`：檢查 Schema、層級位置、依賴方向、FMS 純元資料、循環依賴、入口檔與 MSSP-VT 關聯。
- `mssp island`：執行 TMS 孤島規則檢查。
- `mssp model`：從 manifest 輸出可重現、語言無關的 Intermediate Model。
- `mssp scan`：掃描既有倉庫，輸出有證據、尚未分類的結構候選。
- `mssp classify`：輸出有證據、必須審查的層級建議，不自動升格候選。
- `mssp review-candidate`：記錄明確的核准、拒絕或延後決策；核准時產生受阻塞的契約草稿。
- `mssp promote-candidate`：只有在契約補完並取得獨立最終批准後，才輸出 module manifest。
- `mssp graph`：從 Intermediate Model 產生 Mermaid 或 JSON 架構圖。
- `mssp explain`：向人類與 Agent 輸出簡潔架構清單。
- `lint --json` 與 `island --json` 輸出 MSSP Diagnostic Protocol v0.2。
- 公共診斷採穩定 `MSSP_*_NNN` 代碼，並以 `legacyCode` 保留 v0.1 內部代碼。
- 中介模型具有可攜來源、正式關係、Scanner 證據、分類證據與升格來源鏈。

Scanner 不分配 MSSP 層級。Classifier 只輸出假說、支持證據、反向證據與未決問題，並固定保留 `autoPromotion: false`。即使審查者核准，也不等於契約已完成或已正式升格。

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
node dist/cli.js island /tmp/my-mssp-project
node dist/cli.js graph /tmp/my-mssp-project --format mermaid --out /tmp/architecture.mmd
```

診斷 JSON 遵循 [`MSSP Diagnostic Protocol v0.2`](spec/MSSP-DIAGNOSTIC-PROTOCOL-v0.2.md)。

`model` 與 `scan` 都輸出 [`MSSP Intermediate Model v0.2`](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md)。

`classify` 輸出獨立的 [`MSSP Classification Suggestions v0.2`](spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md)。候選審查與 manifest 輸出遵循 [`MSSP Candidate Review and Promotion Protocol v0.2`](spec/MSSP-CANDIDATE-PROMOTION-v0.2.md)。

## Repository Scanner v0.2

```text
既有倉庫
    ↓ 可重現、有界的盤點
專案標記 / .gitignore / Workspace / 生成檔慣例
    ↓ 靜態依賴證據
尚未分類的 candidates
```

目前 Scanner 已包含：

- Node.js、Python、Rust、Go、Godot、JVM 與 .NET 專案標記；
- 慣例來源目錄與多模組邊界候選；
- 根目錄與巢狀 `.gitignore` 靜態解析；
- npm、pnpm、Cargo Workspace 發現；
- Workspace 成員的結構信心加強；
- JavaScript／TypeScript、Python、Go、Rust、GDScript 靜態引用抽取；
- `internal`、`cross-boundary`、`workspace`、`external`、`unresolved` 五種 scope；
- 保守的生成程式碼辨識。

靜態依賴保存在 `discovery.dependencies`，不會被提升成 `relations`。source import 是證據，不是已批准的 runtime architecture contract。

`boundaryConfidence` 表示「這個路徑像不像獨立結構邊界」，不是「它有多大機率是 TMS」。達到預設 50,000 檔案上限時，`discovery.truncated` 會設為 `true`，不得把結果視為完整盤點。

完整規格見 [`spec/MSSP-REPOSITORY-SCANNER-v0.2.md`](spec/MSSP-REPOSITORY-SCANNER-v0.2.md)。

## Classification Suggestions v0.2

```text
尚未分類的 candidate
    ↓ 可重現的 advisory rules
建議層級 + 支持 + 反向證據 + 未決問題
```

Classifier 可以建議 `FMS`、`SCL`、`SMS`、`TMS`、`DMS`、`ROUTER`、`RUNTIME` 或 `UNDETERMINED`。

它只使用可檢查訊號：名稱、路徑、package／Workspace 邊界與 candidate 靜態依賴拓撲。它不執行倉庫程式碼，也不呼叫 AI 模型。

每一個建議固定保留：

```json
{
  "status": "review-required",
  "confidence": "low | medium | high",
  "supportScore": 0.0,
  "alternativeLayers": [],
  "supportingEvidence": [],
  "counterEvidence": [],
  "unresolvedQuestions": []
}
```

`supportScore` 是規則支持程度，不是正確機率。掃描被截斷時，所有建議一律降為 `low`。Repository root 與 `src` 等聚合邊界固定保持 `UNDETERMINED`。

完整規格見 [`spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md`](spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md)。

## Candidate-to-module 審查與升格 v0.2

```text
Candidate
  → 分類建議
  → 明確審查決策
  → 受阻塞的契約草稿
  → 契約補完
  → 獨立最終批准
  → Module manifest 輸出
```

建立審查紀錄：

```bash
node dist/cli.js review-candidate . \
  --candidate packages/exporter \
  --decision approve \
  --layer TMS \
  --reviewer architecture-reviewer \
  --rationale "此能力可按需啟動、替換，且不是系統閉環的必要核心。" \
  --out exporter-review.json
```

核准後產生的 `contractDraft` 會刻意保留 `TODO`。只要仍有 TODO、未解除的審查條件、被截斷的 Scanner、缺少 maintainer、entry、TMS activation、failure modes、validation 或 tests，升格就會失敗。

補完契約後，由不同的批准者輸出 manifest：

```bash
node dist/cli.js promote-candidate exporter-review.json \
  --approver release-approver \
  --approval-rationale "契約、權限、失敗行為、驗證與測試均已完成。" \
  --out TMS/exporter/module.yaml
```

升格命令會重新計算 blockers、驗證 `module.schema.json`、在 `metadata.promotion` 保存來源鏈，並拒絕覆寫既有檔案。它不會修改 `mssp.yaml`、自動註冊模組、建立 runtime relation 或執行 candidate 程式碼。

```text
Suggestion ≠ Review Decision
Review Approval ≠ Completed Contract
Completed Contract ≠ Final Approval
Manifest Emission ≠ Project Registration
```

中文詳細說明見 [`docs/candidate-promotion.zh-TW.md`](docs/candidate-promotion.zh-TW.md)。

## 如何把既有專案改成 MSSP

1. 執行 `mssp scan` 建立結構與依賴證據盤點。
2. 執行 `mssp classify` 產生可審查假說，不是正式宣告。
3. 審查支持、反向證據、替代層級與未決問題。
4. 用 `mssp review-candidate` 記錄候選決策。
5. 補完已核准的契約草稿，取得獨立批准後執行 `mssp promote-candidate`。
6. 透過一般架構變更把輸出的 manifest 註冊進 `mssp.yaml`。
7. 維護 FMS 系統敘事、模組索引與架構說明。
8. 加入 SCL 變更契約與 DMS 診斷契約。
9. 在 CI 執行 `mssp lint` 與 `mssp island`。
10. 相容性改變時更新 MSSP-VT `changeImpact`。

## 模組契約範例

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

## 中立中介模型邊界

```text
MSSP YAML / Repository Scanner / EML / Python / Rust / Godot
                              ↓
                  MSSP Intermediate Model
                              ↓
       Validator / Graph / IDE / Agent / Impact Analysis
```

中介模型區分已批准的 `modules`、尚未分類的 `candidates`，以及正式 `relations` 與 Scanner 的 `discovery.dependencies`。

## 孤島測試

```text
最小 Runtime + 已聲明 SMS + 外部工具 Mock
```

TMS 不得直接依賴另一個 TMS。多個 TMS 的協作應由 Router／Runtime 編排，或把真正穩定且共用的契約提升為 SMS。

## 與 EML 的關係

```text
MSSP = 架構組織、能力定位、子集治理、系統導航
EML  = 語義表達、壓縮、可執行語言工具鏈
```

未來 `@eml/mssp-adapter` 應將 EML AST、CTS 與 trace 轉換為 Intermediate Model 與 Diagnostic Protocol；MSSP Core 本身不得依賴 EML。

## GitHub 實踐規則

- 架構變更 PR 必須審查 FMS。
- 每個 TMS 必須有獨立 manifest、權限、失敗模式、驗證與測試。
- CI 必須執行結構 lint、孤島測試、分類與審查報告生成。
- Classification suggestion 不得直接成為正式 module declaration。
- Review approval 不得取代契約補完與獨立最終批准。
- Agent 不得同時提出、審查並批准自己的高風險變更。
- DMS 不得只回覆「完成」，必須留下可驗證狀態。

## 目前狀態

`v0.1.0` 是架構契約 MVP。v0.2 Repository Intelligence 已完成 Diagnostic Protocol、Intermediate Model、Scanner 基礎層、`.gitignore` 證據、Workspace 發現、靜態依賴 scope、生成檔過濾、有證據的層級分類建議，以及受治理的 candidate 審查／升格流程。尚未完成 Tree-sitter／編譯器等級解析、FMS／程式碼漂移及 Git diff impact inference。

## 授權

Apache-2.0。Copyright 2026 Neo.K / EVEMISSLAB。
