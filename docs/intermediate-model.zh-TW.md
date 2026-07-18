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

## 核心原則

中介模型必須：

- 語言無關；
- 不輸出本機絕對路徑；
- 同一輸入得到穩定輸出；
- 明確記錄由哪個 Adapter 產生；
- 每個模組與關係都可追溯到來源或證據；
- 可用 JSON 傳遞；
- 通過正式 JSON Schema。

模型刻意不放生成時間戳。時間戳會讓同一份架構每次輸出都不同，破壞 Git diff、快取、簽章與 Agent 審查。需要版本追蹤時，使用明確的 `revision`。

## CLI

```bash
mssp model .
mssp model . --revision <git-sha>
mssp model . --revision <git-sha> --out mssp-model.json
```

輸出會包含：

- 模型版本與類型；
- 產生器與 Adapter；
- 專案身分；
- MSSP 層級；
- 正規化模組；
- dependency 與 MSSP-VT 關係；
- 專案政策；
- 來源與證據。

## 來源追蹤

例如：

```json
{
  "kind": "manifest",
  "uri": "TMS/uppercase/module.mssp.yaml",
  "format": "yaml",
  "revision": "abc123"
}
```

`uri` 是專案相對路徑，不是某台電腦上的絕對路徑。

未來 Repository Scanner 的來源可標記為 `scanner`，EML／Python／Rust 轉換器可標記為 `adapter`。

## 關係種類

目前包含：

```text
requires     執行期模組依賴
affects      MSSP-VT：此模組影響目標模組
affected-by  MSSP-VT：此模組受目標模組影響
```

`affects` 與 `affected-by` 不是 runtime dependency，工具不得混為一談。

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

目前架構圖已改為：

```text
LoadedProject
    ↓
Intermediate Model
    ↓
Graph / Mermaid
```

因此中介模型不是孤立文件，而是已經進入正式執行路徑。

完整規格與 Schema：

```text
spec/MSSP-INTERMEDIATE-MODEL-v0.2.md
schemas/intermediate-model.schema.json
```
