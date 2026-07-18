# MSSP Adapter、EML Adapter 與 Python Adapter 指南

## Adapter 解決什麼問題

MSSP Core 不應直接依賴每一種語言、編輯器、遊戲引擎、Build Backend 或 Agent 平台。

Adapter 的工作是把外部系統已經輸出的版本化結構資料，轉成 MSSP Intermediate Model：

```text
外部語言／工具的版本化 Export
               ↓
         MSSP Adapter
               ↓
    MSSP Intermediate Model
```

Adapter 不是 Parser，也不是 Runtime。它不能執行外部專案、下載依賴、修改原始碼或自行批准架構。

## 目前可用 Adapter

```bash
node dist/cli.js adapters
```

輸出 JSON descriptor：

```bash
node dist/cli.js adapters --json --out adapter-descriptors.json
```

目前 reference adapters：

```text
ID: eml-mssp-export
CLI aliases: eml
Input: eml-mssp-export v0.3 JSON
Output: mssp-intermediate-model v0.2

ID: python-mssp-export
CLI aliases: python, py
Input: python-mssp-export v0.3 JSON
Output: mssp-intermediate-model v0.2
```

Adapter Registry 會依穩定 ID 排序輸出 descriptor。新增 Adapter 不需要再次改寫 CLI 的判斷鏈。

## 執行 EML Adapter

```bash
node dist/cli.js adapt eml \
  examples/eml-adapter/semantic-export.json \
  --revision HEAD \
  --out eml-intermediate-model.json
```

EML Adapter 只讀取既有 JSON export。它不直接解析 `.eml`、啟動 EML Parser／Editor、執行 EML 或解析 import。

## 執行 Python Adapter

```bash
node dist/cli.js adapt python \
  examples/python-adapter/semantic-export.json \
  --revision HEAD \
  --out python-intermediate-model.json
```

Python Adapter 只讀取既有 JSON export。它不會：

- import 或執行 Python module；
- 啟動 CPython、PyPy 或其他 interpreter；
- 評估 decorator、annotation、descriptor 或 module-level code；
- 掃描 virtual environment；
- 呼叫 `pip`、`uv`、Poetry、Hatch、PDM、setuptools 或 PEP 517 Build Backend；
- 解析 import 或 distribution dependency；
- 讀取 `sourceUri` 指向的檔案；
- 呼叫 Git 或網路；
- 修改 Python 專案；
- 把輸出自動註冊進 `mssp.yaml`。

## 為什麼 Adapter 不直接解析原始專案

若 MSSP Core 直接綁定 EML Parser、CPython AST、Python Packaging、Rust Compiler 或 Godot Editor，Core 就會失去語言中立性，也會把版本、執行安全與套件依賴混在一起。

因此邊界固定為：

```text
來源工具鏈負責理解自己的語言與生態
MSSP Adapter 負責理解版本化 Semantic Export
```

未來 EML Parser、Python IDE、Packaging Tool 或 Agent 可以直接產生對應 export，而 MSSP Core 不必知道來源工具內部如何實作。

## Module 與 Candidate 的分界

最重要的規則是：

```text
來源系統中的 module/package/plugin/service
不等於
正式 MSSP module
```

只有具有完整 `declaration` 的來源 component 才會映射為 module。

沒有完整 declaration 時，即使：

- EML `symbolKind` 是 `module`；
- Python `pythonKind` 是 `package`、`plugin` 或 `service`；
- Python component 可以 import；
- Python component 暴露 console script 或 entry point；

仍然只能成為：

```json
{
  "status": "unclassified"
}
```

Adapter 不會幫忙補上缺少的：

- layer；
- purpose；
- permissions；
- risk level；
- failure modes；
- validation；
- tests；
- compatibility；
- change impact。

只要 `declaration` 不完整，整份輸入就會被 Schema 拒絕，而不是產生一份看似完整的假契約。

## Python-specific metadata

Python Adapter 保留來源語義，但不把它提升為架構授權：

```text
qualifiedName -> metadata.pythonQualifiedName
importPath    -> metadata.pythonImportPath
entryPoints   -> metadata.pythonEntryPoints
pythonKind    -> metadata.pythonComponentKind
```

Project-level metadata：

```text
distributionName -> pythonDistributionName
requiresPython   -> pythonRequires
buildBackend     -> pythonBuildBackend
```

這些欄位只是來源描述。Adapter 不會因此證明該 distribution 已安裝、Interpreter 相容、Build Backend 可執行，或 entry point 已獲批准載入。

## Candidate Hint

沒有 declaration 的 component 可以提供結構提示：

```json
{
  "candidate": {
    "path": "src/example/experimental",
    "boundaryKind": "source-root",
    "boundaryConfidence": 0.64,
    "fileCount": 2,
    "sourceFileCount": 2,
    "languages": ["python"]
  }
}
```

`boundaryConfidence` 只代表結構邊界可信度，不代表 SMS、TMS 或其他層級分類可信度。

Python Adapter 沒有 hint 時使用保守預設：

- distribution、package、namespace-package、plugin → `package`；
- module、command、service、other → `source-root`；
- confidence → `0.5`；
- language → `python`。

## 關係來源

Adapter 只會從完整 declaration 建立正式關係：

```text
requirements.modules   → requires
changeImpact.affects   → affects
changeImpact.affectedBy → affected-by
```

普通 symbol reference、Python import、`pyproject.toml` dependency、entry point、call、decorator 或名稱相似度，不會自行升格成正式 MSSP relation。

## Source Provenance

所有輸出來源都會標記：

```json
{
  "kind": "adapter",
  "adapter": "<stable-adapter-id>"
}
```

若指定 `--revision`，同一 revision 會進入所有 project、layer、policy、module、candidate、relation 與 evidence source。

絕對路徑會被拒絕，避免把本機環境資訊寫進可交換模型。

這代表來源身分，不代表已經證明語義等價、執行可重現或版本相容。

## Adapter Contract 的固定不變條件

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

這些不是可調整選項。

## 共用 Declarative Adapter Builder

`src/declarative-adapter.ts` 封裝各語言 Adapter 共通的：

- 完整 declaration → module；
- 缺少 declaration → unclassified candidate；
- explicit declaration relations；
- portable source provenance；
- deterministic sorting；
- duplicate identity rejection；
- project、layer、policy、module、candidate 與 relation 映射。

來源 Adapter 仍必須提供自己的輸入 Schema、來源種類與 metadata mapping。共用 Builder 不會替來源系統分類或推斷架構。

## 給其他 Adapter 實作者

新的 Rust、Godot 或 Agent Skill Adapter 應提供：

1. Adapter Descriptor；
2. 版本化輸入 Schema；
3. `MsspAdapter<Input>` 實作；
4. Registry aliases；
5. portable adapter source provenance；
6. Intermediate Model Schema 驗證；
7. Adapter Conformance Report；
8. determinism 與 no-mutation tests；
9. 清楚區分 explicit declaration 與 unclassified candidate；
10. CLI fixture 與 CI Artifact。

正式規格：

- `spec/MSSP-ADAPTER-CONTRACT-v0.3.md`
- `spec/MSSP-EML-ADAPTER-v0.3.md`
- `spec/MSSP-PYTHON-ADAPTER-v0.3.md`

Reference fixtures：

- `examples/eml-adapter/semantic-export.json`
- `examples/python-adapter/semantic-export.json`
