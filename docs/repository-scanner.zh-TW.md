# MSSP Repository Scanner v0.2

Repository Scanner 是 MSSP v0.2 Repository Architecture Intelligence 的靜態證據掃描器。

它不替人類或 Agent 直接決定「這是 SMS」或「這是 TMS」，而是先把倉庫中可驗證的結構、工作區、忽略規則與原始碼引用整理成可審查證據。

## 基本流程

```text
既有倉庫
    ↓
有界檔案與語言盤點
    ↓
專案標記、.gitignore、Workspace、生成檔慣例
    ↓
候選邊界與靜態依賴證據
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

尚未分類的倉庫會保持：

```text
modules: []
layers: []
relations: []
candidates: [...]
discovery: {...}
```

`relations` 仍然為空。Scanner 找到的 import 只是靜態證據，不能偷渡成正式 runtime dependency。

## 候選邊界

目前支援：

| 類型 | 意義 |
|---|---|
| `repository` | 明確指定的掃描根目錄 |
| `package` | 含專案標記，或被 Workspace 宣告選中的目錄 |
| `source-root` | 含原始碼的慣例來源目錄 |
| `directory` | 多模組容器下含原始碼的直接子目錄 |

`boundaryConfidence` 只代表「這裡像不像獨立結構邊界」。

它不是 SMS／TMS 分類信心。即使 Workspace 證據把結構信心提高到 `0.98`，候選仍然保持：

```json
{
  "status": "unclassified"
}
```

## 專案與 Workspace 標記

目前辨識：

```text
package.json
pnpm-workspace.yaml
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

Workspace 靜態讀取範圍：

- `package.json` 的 `workspaces` 或 `workspaces.packages`；
- `pnpm-workspace.yaml` 的 `packages`；
- `Cargo.toml` 的 `[workspace].members`。

例如：

```json
{
  "kind": "npm",
  "rootPath": ".",
  "patterns": ["packages/*"],
  "members": ["packages/exporter"]
}
```

這只表示目錄被工作區宣告選中，不表示它一定是 TMS、SMS、獨立部署單元或特定團隊所有。

## 靜態依賴證據

目前以不執行程式碼的文字抽取支援：

- JavaScript／TypeScript：`import`、`export ... from`、`require()`、字面量 `import()`；
- Python：`import`、`from ... import`；
- Go：字串型 import path；
- Rust：`use` 根名稱；
- GDScript：字面量 `preload()`、`load()`。

依賴證據分成：

| Scope | 意義 |
|---|---|
| `internal` | 解析後仍在同一候選內 |
| `cross-boundary` | 相對引用跨到另一個候選 |
| `workspace` | 套件名稱對應到已宣告 Workspace 成員 |
| `external` | 非本地套件，且沒有 Workspace 目標 |
| `unresolved` | 看似本地引用，但在盤點中無法解析 |

範例：

```json
{
  "kind": "static-import",
  "scope": "workspace",
  "from": "candidate.src",
  "to": "candidate.packages.exporter",
  "targetKind": "candidate",
  "specifiers": ["@example/exporter"],
  "sourceFiles": ["src/index.ts"],
  "occurrences": 1
}
```

Parser 會在 evidence 中標記為 `static-regex-v0.2`。這不是完整 AST，也不是執行期真實依賴圖。

## `.gitignore` 證據

Scanner 會在進入根目錄與子目錄時讀取 `.gitignore`，目前支援：

- 空行與註解；
- `!` 否定規則；
- 根目錄錨定與非錨定模式；
- `*`、`**`、`?`；
- 以 `/` 結尾的目錄模式。

輸出保存：

- 每一份 `.gitignore` 的位置；
- 所屬基準目錄；
- 正規化後的規則；
- 被忽略的檔案與目錄數量。

這是靜態相容子集，不宣稱完全重現 Git 所有 escaping、attribute 與父目錄重新納入的邊界行為。固定排除的 `.git`、`node_modules`、`dist`、`target` 等目錄仍然獨立生效。

## 生成程式碼

目前以保守慣例辨識：

```text
generated/
gen/
*.generated.*
*.g.cs
*.g.dart
*_pb2.py
*.min.js
*.min.css
```

生成檔仍會出現在 inventory，但不參與靜態 import 抽取，避免把生成器產生的引用誤認成人工架構決策。

目前只辨識「疑似生成檔」，尚未建立生成檔與來源模板／生成器之間的 provenance。

## 安全與確定性

Scanner：

- 只做本地唯讀掃描；
- 不執行原始碼、Git、建置腳本、套件管理器或外掛；
- 不連網；
- 跳過 symbolic link；
- 對 metadata 與原始碼讀取設定大小限制；
- 固定排序檔案、標記、語言、候選、Workspace、依賴與證據；
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

目前仍沒有：

- Tree-sitter 或編譯器等級 AST import 分析；
- 語言別 alias、tsconfig、build graph 完整解析；
- 執行期依賴推斷；
- 自動 SMS／TMS 分類；
- candidate-to-module 正式升格流程；
- FMS 與程式碼漂移檢查；
- Git diff 影響分析；
- 與 Git 完全等價的 ignore engine；
- 生成程式碼 provenance。

下一階段才會在這些靜態證據之上建立「有證據的分類建議」。AI 說明仍然只能是增強層，不得取代可追溯證據。
