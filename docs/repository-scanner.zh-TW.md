# MSSP Repository Scanner v0.2

Repository Scanner 是 MSSP v0.2 Repository Architecture Intelligence 的第一個實際掃描器。

它的工作不是替人類或 Agent 直接決定「這是 SMS」或「這是 TMS」，而是先把倉庫中可驗證的結構證據整理出來。

## 基本流程

```text
既有倉庫
    ↓
檔案與語言盤點
    ↓
專案／套件標記辨識
    ↓
候選邊界與證據
    ↓
人工或受治理 Agent 分類
    ↓
正式 MSSP Module
```

## 使用方法

```bash
mssp scan .
mssp scan . --revision <git-sha>
mssp scan . --max-files 10000
mssp scan . --revision <git-sha> --out repository-scan.json
```

輸出直接使用 MSSP Intermediate Model v0.2。

掃描尚未分類的倉庫時：

- `modules` 為空；
- `layers` 為空；
- `candidates` 保存候選模組邊界；
- `discovery` 保存檔案、語言、標記、忽略規則與是否截斷；
- 所有候選的 `status` 都是 `unclassified`。

這代表 Scanner 只聲明「這裡可能是一個結構邊界」，不聲明「它一定是哪一個 MSSP 層級」。

## 候選邊界

目前支援四種邊界：

| 類型 | 意義 |
|---|---|
| `repository` | 明確指定的掃描根目錄 |
| `package` | 含有專案或套件標記的目錄 |
| `source-root` | 含原始碼的慣例來源目錄 |
| `directory` | 多模組容器下含原始碼的直接子目錄 |

`boundaryConfidence` 只代表「它像不像一個獨立結構邊界」。

它不是 SMS／TMS 分類信心，也不能被當成架構結論。

## 目前辨識的標記

```text
package.json
pyproject.toml
setup.py
Cargo.toml
go.mod
project.godot
pom.xml
build.gradle
build.gradle.kts
*.csproj
*.sln
```

Scanner 會在不執行程式碼的前提下，嘗試讀取名稱與版本。

## 慣例來源目錄

```text
app/
lib/
src/
```

多模組容器：

```text
addons/
apps/
crates/
modules/
packages/
plugins/
services/
```

這些慣例只會產生帶有 `inference` 證據的候選，不會自動建立正式 MSSP Module。

## 安全與確定性

Scanner：

- 只做本地唯讀掃描；
- 不執行原始碼、建置腳本或套件管理器；
- 不連網；
- 跳過 symbolic link；
- 跳過常見依賴、產物與快取目錄；
- 固定排序檔案、標記、語言、候選與證據；
- 不加入生成時間戳；
- 只有明確提供時才加入 revision。

預設最多掃描 50,000 個檔案。達到上限時：

```json
{
  "discovery": {
    "truncated": true
  }
}
```

這份輸出仍然有效，但不能被視為完整倉庫盤點。

## 尚未完成

目前還沒有：

- AST import 分析；
- 依賴關係推斷；
- 自動 SMS／TMS 分類；
- FMS 與程式碼漂移檢查；
- Git diff 影響分析；
- `.gitignore` 完整語義；
- 生成程式碼來源追蹤。

這些會沿用同一個 Intermediate Model 與 Evidence 規則繼續增加，而不是另建互不相容的掃描格式。
