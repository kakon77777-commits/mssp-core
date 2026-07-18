# MSSP 架構漂移檢查 v0.2

`mssp drift` 檢查的是：

> FMS 所記錄的系統、正式 Module Manifest，以及程式碼實際佔據的層級與模組邊界，是否仍然一致。

它是保守的靜態檢查，不是語義真理判定器。

## 執行

```bash
mssp drift examples/hello-mssp \
  --revision HEAD \
  --max-files 10000 \
  --out architecture-drift.json
```

輸出遵循：

```text
schemas/architecture-drift.schema.json
spec/MSSP-ARCHITECTURE-DRIFT-v0.2.md
```

## 目前比較的三個平面

```text
FMS Module Index
        ↕
Module Manifests
        ↕
Configured Layer Source Ownership
```

目前會檢查：

- 三份 canonical FMS 文件是否存在；
- `01_MODULE_INDEX.md` 是否具有可機器解析的 `ID`／`Layer` 表格；
- Manifest 已宣告模組是否遺漏於 FMS；
- FMS 是否仍保留已不存在的模組；
- FMS 與 Manifest 的層級是否衝突；
- FMS 是否重複列出同一模組；
- SMS／TMS／DMS／Router／Runtime 原始碼是否落在唯一已宣告模組邊界內；
- FMS／SCL 是否意外出現可執行原始碼；
- 有界掃描是否被截斷。

## 不做語義偷渡

固定輸出：

```json
{
  "analysis": {
    "mode": "static-conservative",
    "semanticEquivalence": false,
    "autoMutation": false
  }
}
```

因此 `consistent` 只表示目前可觀測的結構契約沒有衝突，不表示：

- 文件完整描述全部程式行為；
- 程式碼真正實現文件中的目的；
- 部署與 Runtime 狀態一致；
- 歷史變更沒有遺漏；
- 系統沒有未知架構問題。

## 狀態

Finding 有兩種狀態：

```text
drift         已觀測到明確結構不一致
indeterminate 現有證據不足，不能宣稱一致
```

報告狀態：

```text
consistent
architecture drift detected
indeterminate
```

實際 JSON 使用：

```text
consistent
drift-detected
indeterminate
```

`summary.ok` 只在沒有 error finding 時為 `true`。只有 warning 的漂移仍會保留在報告中，但預設不強制讓 CI 失敗。

## 原始碼所有權

對可執行層而言，每個原始碼檔應該落在一個、且只有一個 Module Manifest 所在的邊界內。

```text
零個 owner  → 未宣告能力或遺漏註冊
一個 owner  → 結構上可接受
多個 owner  → 巢狀或重疊邊界
```

未宣告原始碼不會被工具自動變成 Module。正確流程仍是：

```text
Scanner Candidate
→ Classification Suggestion
→ Review
→ Contract Completion
→ Independent Approval
→ Manifest Emission
→ Project Registration
```

## 邊界

v0.2 尚未處理：

- FMS 自然語言與程式行為的語義一致性；
- Compiler／Tree-sitter 等級依賴分析；
- Runtime Trace 與宣告架構比較；
- 部署拓撲與 Rollback 狀態；
- 歷史基線比較；
- Git Diff Impact；
- 自動修復或自動修改 FMS／Manifest。

所以這一層的定位是：

> 將「文件可能早已過時」從模糊感覺，轉換成可審查、可保存、可進 CI 的結構證據。
