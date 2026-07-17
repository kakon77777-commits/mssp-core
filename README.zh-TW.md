# MSSP Core MVP

[English](README.md)

**MSSP（Mother-Set and Subset Paradigm，母集與子集範式）**是一套語言無關的架構方法，用來讓複雜系統可以被理解、導航、驗證、治理與演化。

MSSP 不是另一個應用框架，也不是把資料夾改名成 FMS／SMS／TMS。它要求系統將「本體聲明、穩定核心、可插拔子集、變更邊界、診斷、路由、執行與版本影響」正式寫成機器可讀的架構契約。

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

MSSP-VT 透過每個模組的 `version`、`compatibility` 與 `changeImpact` 欄位進入 MVP。

## 這個 MVP 已完成什麼

- `mssp init`：建立可直接採用的 MSSP 專案骨架。
- `mssp lint`：檢查 YAML Schema、層級位置、依賴方向、FMS 純元資料、循環依賴、入口檔與 MSSP-VT 關聯。
- `mssp island`：執行 TMS 孤島規則檢查。
- `mssp graph`：輸出 Mermaid 或 JSON 架構圖。
- `mssp explain`：向人類與 Agent 輸出簡潔的架構清單。
- GitHub Actions 與 PR 架構審查模板。
- `examples/hello-mssp` 完整參考專案。

MVP 暫不包含 AI 自動分類、Web 視覺化編輯器、運行時插樁、AISMBI 記憶體邊界推斷及 EML adapter 實作。這些屬於後續模組，而不是讓 v0.1 永遠無法完成的前置條件。

## 五分鐘開始

```bash
npm install
npm run build
node dist/cli.js init /tmp/my-mssp-project
node dist/cli.js lint /tmp/my-mssp-project
node dist/cli.js island /tmp/my-mssp-project
node dist/cli.js graph /tmp/my-mssp-project --format mermaid --out /tmp/architecture.mmd
```

開發本倉庫時：

```bash
npm run mssp -- lint examples/hello-mssp
npm run mssp -- explain examples/hello-mssp
npm run mssp -- island examples/hello-mssp
npm run mssp -- graph examples/hello-mssp --format mermaid
```

## 如何把既有專案改成 MSSP

1. 在專案根目錄加入 `mssp.yaml`。
2. 建立 `FMS/00_SYSTEM_NARRATIVE.md`、`FMS/01_MODULE_INDEX.md`、`FMS/02_ARCHITECTURE_NOTES.md`。
3. 把任何任務閉環都不可缺少的穩定能力宣告成 SMS。
4. 把按需載入、可替換、可獨立測試的能力宣告成 TMS；必須寫明啟動條件、權限、失敗模式、驗證與代表測試。
5. 用 SCL 描述可變性與權限，用 DMS 描述診斷輸出。
6. 在 CI 中執行 `mssp lint` 與 `mssp island`。
7. 任何改變系統本體、模組邊界或依賴方向的 PR，都必須更新或明確審查 FMS。
8. 相容性可能改變時，更新 MSSP-VT 的 `changeImpact`。

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

## 孤島測試

TMS 在以下最小環境仍可被理解、載入與驗證，才算通過：

```text
最小 Runtime + 已聲明 SMS + 外部工具 Mock
```

TMS 不得直接依賴另一個 TMS。多個 TMS 的協作應由 Router／Runtime 編排，或把真正穩定且共用的契約提升為 SMS；不得形成隱藏的外掛單體。

## 與 EML 的關係

```text
MSSP = 架構組織、能力定位、子集治理、系統導航
EML  = 語義表達、壓縮、可執行語言工具鏈
```

未來 `@eml/mssp-adapter` 可將 EML AST、CTS 與 trace 轉換為 MSSP manifest 與診斷；但 `@mssp/core` 不得依賴 EML。

詳細操作見 [`docs/GITHUB-WORKFLOW.zh-TW.md`](docs/GITHUB-WORKFLOW.zh-TW.md)。

## GitHub 實踐規則

- 架構變更 PR 必須審查 FMS。
- 每個 TMS 必須有獨立 manifest、權限、失敗模式、驗證與測試。
- CI 必須執行結構 lint 與孤島測試。
- 不可把所有模組都標為 SMS。
- 不可在 FMS 放入具體可執行流程。
- Agent 不得同時提出、執行、驗證並自行批准高風險變更。
- DMS 不得只回覆「完成」，必須留下可驗證狀態。

## 授權

Apache-2.0。Copyright 2026 Neo.K / EVEMISSLAB。
