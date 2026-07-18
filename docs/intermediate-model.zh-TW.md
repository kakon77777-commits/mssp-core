# MSSP 中立中介模型 v0.2

MSSP Intermediate Model 是來源格式與分析工具之間的共同資料層。

它避免每個工具都重新理解 YAML、EML AST、Python package、Rust crate、Godot scene 或特定倉庫結構。

```text
MSSP YAML / Repository Scanner / EML / Python / Rust / Godot
                              ↓
                  MSSP Intermediate Model
                              ↓
       Validator / Graph / IDE / Agent / Impact Analysis
```

## 三種必須分開的狀態

```text
modules      已分類、已有 MSSP 層級與契約的正式模組
candidates   只有結構證據、尚未分類的候選邊界
discovery    Scanner 觀測到的檔案、Workspace、忽略與依賴證據
```

Repository Scanner 找到 `packages/export-pdf`，只代表它可能是一個結構邊界，不代表它已經被證明是 TMS，也不代表它不能是 SMS。

候選物件沒有 `layer`，只能先保持：

```json
{
  "status": "unclassified"
}
```

## 核心原則

中介模型必須：

- 語言無關；
- 不輸出本機絕對路徑；
- 同一輸入得到穩定輸出；
- 明確記錄 Producer 與 Adapter；
- 每個模組、候選、關係與掃描證據都可追溯；
- 可用 JSON 傳遞；
- 通過正式 JSON Schema。

模型不放生成時間戳。需要版本追蹤時使用明確的 `revision`。

## CLI

Manifest 轉換：

```bash
mssp model .
mssp model . --revision <git-sha> --out mssp-model.json
```

Repository 掃描：

```bash
mssp scan .
mssp scan . --revision <git-sha>
mssp scan . --max-files 10000 --out repository-scan.json
```

兩種輸出使用同一份 `schemas/intermediate-model.schema.json`。

## 頂層內容

```json
{
  "schemaVersion": "0.2",
  "kind": "mssp-intermediate-model",
  "generatedBy": {},
  "project": {},
  "layers": [],
  "modules": [],
  "candidates": [],
  "relations": [],
  "policies": []
}
```

Manifest Adapter 通常輸出正式 `modules`，不加入 `discovery`。

Repository Scanner 輸出：

```text
modules: []
layers: []
relations: []
candidates: [...]
discovery: {...}
```

## 候選邊界

目前邊界種類：

```text
repository   明確掃描根目錄
package      套件／專案標記或 Workspace 支持的目錄
source-root  慣例來源目錄
directory    多模組容器下的來源子目錄
```

`boundaryConfidence` 只代表「這裡像不像一個獨立結構邊界」，不是 SMS／TMS 分類信心。

Workspace 成員可以提高結構信心，但不能新增 `layer`。

## Discovery 結構

Repository Scanner 的 `discovery` 包含：

```text
root                  掃描根目錄
revision              可選來源版本
truncated             是否因檔案上限截斷
ignoredDirectories    固定排除的依賴／建置／快取目錄
inventory             檔案、原始碼、語言與副檔名統計
markers               ecosystem 標記
ignore                .gitignore 來源與套用結果
generated             疑似生成檔案
workspaces             npm／pnpm／Cargo 工作區
dependencies           靜態原始碼引用證據
```

若 `discovery.truncated` 為 `true`，工具不得假設盤點或依賴圖完整。

## `.gitignore` 與生成檔

`discovery.ignore` 保存每一份 `.gitignore` 的位置、基準目錄、規則與被忽略數量。

`discovery.generated` 保存保守辨識出的生成檔路徑。生成檔仍計入 inventory，但不參與靜態 import 證據。

這兩者都是觀測，不是完整 Git 等價實作，也不是生成來源 provenance。

## Workspace

```json
{
  "kind": "npm",
  "rootPath": ".",
  "patterns": ["packages/*"],
  "members": ["packages/exporter"],
  "source": {
    "kind": "scanner",
    "uri": "package.json"
  }
}
```

Workspace 成員表示它被專案結構正式選中，但不代表部署、擁有權、SMS 或 TMS。

## 靜態依賴證據

```json
{
  "kind": "static-import",
  "scope": "workspace",
  "from": "candidate.src",
  "to": "candidate.packages.exporter",
  "targetKind": "candidate",
  "specifiers": ["@example/exporter"],
  "sourceFiles": ["src/index.ts"],
  "occurrences": 1,
  "evidence": []
}
```

Scope：

```text
internal        解析後仍在同一候選
cross-boundary  相對引用跨到另一候選
workspace       套件名稱對應 Workspace 成員
external        外部套件或模組
unresolved      看似本地引用但無法解析
```

這些資料放在 `discovery.dependencies`，不放進正式 `relations`。

原因很直接：source import 是證據，不等於 MSSP 宣告的 runtime dependency。

## 正式關係

目前正式 `relations` 只有：

```text
requires     已宣告的執行期模組依賴
affects      MSSP-VT：此模組影響目標模組
affected-by  MSSP-VT：此模組受目標模組影響
```

Scanner 不得把目錄相鄰、Workspace 成員或文字 import 自動提升為 `requires`。

## 來源與證據

```json
{
  "kind": "dependency",
  "message": "Static source references connect candidate.src to candidate.packages.exporter.",
  "source": {
    "kind": "scanner",
    "uri": "src/index.ts",
    "format": "source"
  },
  "data": {
    "parser": "static-regex-v0.2",
    "scope": "workspace"
  }
}
```

只有信心分數不算證據。AI 或 Scanner 的推論必須附帶可檢查觀測，且不可冒充正式宣告。

## 現在的資料流

```text
Repository
    ↓ Repository Scanner
Intermediate Model with candidates + discovery evidence
    ↓ 受治理分類／契約補全
Intermediate Model with modules + normative relations
    ↓
Graph / Validation / Governance / IDE / Agent
```

完整規格與 Schema：

```text
spec/MSSP-INTERMEDIATE-MODEL-v0.2.md
schemas/intermediate-model.schema.json
```
