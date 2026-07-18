# MSSP 中立中介模型 v0.2

MSSP Intermediate Model 是來源格式與分析工具之間的共同資料層。

它解決的問題不是「再做一份 manifest」，而是避免每個工具都重新理解 YAML、EML AST、Python package、Rust crate、Godot scene 或其他專案格式。

```text
來源專案
  ├─ MSSP YAML
  ├─ Repository Scanner
  ├─ EML Adapter
  ├─ Python Adapter
  └─ Rust Adapter
        ↓
MSSP Intermediate Model
        ↓
Validator / Graph / IDE / Agent / Impact Analysis
```

## 兩種架構狀態

中介模型現在明確區分：

```text
modules     已分類、已有 MSSP 層級與契約的正式模組
candidates  只有結構證據、尚未分類的候選邊界
```

這個區分很重要。

Repository Scanner 找到 `packages/export-pdf`，只代表它可能是一個獨立結構邊界，不代表它已經被證明是 TMS，也不代表它不能是 SMS。

候選物件沒有 `layer`，只能先保持：

```json
{
  "status": "unclassified"
}
```

直到人工或受治理 Agent 完成分類與契約補全後，才可以進入 `modules`。

## 核心原則

中介模型必須：

- 語言無關；
- 不輸出本機絕對路徑；
- 同一輸入得到穩定輸出；
- 明確記錄由哪個 Adapter 產生；
- 每個模組、候選與關係都可追溯到來源或證據；
- 可用 JSON 傳遞；
- 通過正式 JSON Schema。

模型刻意不放生成時間戳。時間戳會讓同一份架構每次輸出都不同，破壞 Git diff、快取、簽章與 Agent 審查。需要版本追蹤時，使用明確的 `revision`。

## CLI

Manifest 轉換：

```bash
mssp model .
mssp model . --revision <git-sha>
mssp model . --revision <git-sha> --out mssp-model.json
```

Repository 掃描：

```bash
mssp scan .
mssp scan . --revision <git-sha>
mssp scan . --max-files 10000 --out repository-scan.json
```

兩種輸出都使用同一份 Intermediate Model Schema。

## 頂層內容

模型可包含：

- 模型版本與類型；
- 產生器與 Adapter；
- 專案身分；
- MSSP 層級；
- 正規化正式模組；
- 尚未分類的候選；
- dependency 與 MSSP-VT 關係；
- 專案政策；
- Repository discovery 資訊；
- 來源與證據。

Manifest Adapter 通常輸出正式 `modules`，`candidates` 為空。

Repository Scanner 基礎層通常輸出 `candidates` 與 `discovery`，而 `modules`、`layers`、`relations` 暫時為空。

## 候選物件

候選包含：

- 候選 ID；
- 相對路徑；
- 邊界種類；
- 邊界信心；
- 檔案與原始碼數量；
- 語言；
- 來源；
- 證據。

目前邊界種類：

```text
repository   明確掃描根目錄
package      有套件／專案標記的目錄
source-root  慣例來源目錄
 directory   多模組容器下的來源子目錄
```

`boundaryConfidence` 只代表「這裡像不像一個獨立結構邊界」，不是 SMS／TMS 分類信心。

## Discovery

Scanner 可加入：

- `root`；
- `revision`；
- 是否因檔案上限而截斷；
- 忽略目錄規則；
- 總檔案數與原始碼數；
- 語言與副檔名統計；
- ecosystem markers。

若 `discovery.truncated` 為 `true`，工具不得假設盤點完整。

## 來源追蹤

Manifest 來源：

```json
{
  "kind": "manifest",
  "uri": "TMS/uppercase/module.mssp.yaml",
  "format": "yaml",
  "revision": "abc123"
}
```

Scanner 來源：

```json
{
  "kind": "scanner",
  "uri": "packages/export-pdf",
  "format": "directory",
  "adapter": "repository-scanner"
}
```

`uri` 是專案相對路徑，不是某台電腦上的絕對路徑。

## 關係種類

目前包含：

```text
requires     執行期模組依賴
affects      MSSP-VT：此模組影響目標模組
affected-by  MSSP-VT：此模組受目標模組影響
```

`affects` 與 `affected-by` 不是 runtime dependency，工具不得混為一談。

Scanner 也不得因為兩個目錄相鄰，就自動生成 `requires`。

## 證據

中介模型不只保存結論，也保存結論如何得出。

```json
{
  "kind": "dependency",
  "message": "plugin.uppercase declares a runtime dependency on core.echo.",
  "data": {
    "field": "requires.modules"
  }
}
```

未來 AI 或 Scanner 推斷出的分類，必須使用 `inference` 證據並附上觀測內容。只有信心分數，不算證據。

## 現在已接入的功能

正式架構圖：

```text
LoadedProject
    ↓ Manifest Adapter
Intermediate Model with modules
    ↓
Graph / Mermaid
```

Repository 掃描：

```text
Repository
    ↓ Repository Scanner
Intermediate Model with candidates
    ↓ 分類／宣告
Intermediate Model with modules
```

因此中介模型不是孤立文件，而是 Manifest、Scanner、未來 Adapter 與分析工具的共同邊界。

完整規格與 Schema：

```text
spec/MSSP-INTERMEDIATE-MODEL-v0.2.md
schemas/intermediate-model.schema.json
```
