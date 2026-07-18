# MSSP Adapter 與 EML Adapter 指南

## Adapter 解決什麼問題

MSSP Core 不應直接依賴每一種語言、編輯器、遊戲引擎或 Agent 平台。

Adapter 的工作是把外部系統已經輸出的結構化資料，轉成 MSSP Intermediate Model：

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

目前第一個 reference adapter 是：

```text
ID: eml-mssp-export
CLI alias: eml
Input: eml-mssp-export v0.3 JSON
Output: mssp-intermediate-model v0.2
```

## 執行 EML Adapter

```bash
node dist/cli.js adapt eml \
  examples/eml-adapter/semantic-export.json \
  --revision HEAD \
  --out eml-intermediate-model.json
```

這個命令只讀取既有 JSON export。

它不會：

- 直接解析 `.eml` 原始碼；
- 啟動 EML Parser 或 Editor；
- 執行 EML；
- 讀取 `sourceUri` 指向的檔案；
- 呼叫 Git、Package Manager 或網路；
- 修改 EML 專案；
- 把輸出自動註冊進 `mssp.yaml`。

## 為什麼不是直接吃 `.eml`

EML 還會持續演化。若 MSSP Core 直接綁定 EML Parser，Core 就會失去語言中立性，也會讓版本、執行安全與套件依賴混在一起。

因此目前邊界固定為：

```text
EML 工具鏈負責理解 EML
MSSP Adapter 負責理解版本化 Export
```

未來 EML Parser、Editor 或 Agent 可以直接輸出 `eml-mssp-export`，而 MSSP Core 不必知道 Parser 內部如何實作。

## Module 與 Candidate 的分界

最重要的規則是：

```text
EML symbolKind: module
不等於
正式 MSSP module
```

只有具有完整 `declaration` 的 symbol 才會映射為 module。

沒有完整 declaration 的 symbol，即使 `symbolKind` 寫成 `module`，仍然只能成為：

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

## Candidate Hint

沒有 declaration 的 symbol 可以提供結構提示：

```json
{
  "candidate": {
    "path": "experiments/preview.eml",
    "boundaryKind": "package",
    "boundaryConfidence": 0.8,
    "fileCount": 1,
    "sourceFileCount": 1,
    "languages": ["eml"]
  }
}
```

`boundaryConfidence` 只代表結構邊界可信度，不代表 SMS、TMS 或其他層級分類可信度。

## 關係來源

Adapter 只會從完整 declaration 建立正式關係：

```text
requirements.modules  → requires
changeImpact.affects   → affects
changeImpact.affectedBy → affected-by
```

普通 symbol reference、import、call 或名稱相似度不會自行升格成正式 MSSP relation。

## Source Provenance

所有輸出來源都會標記：

```json
{
  "kind": "adapter",
  "adapter": "eml-mssp-export"
}
```

若指定 `--revision`，同一 revision 會進入所有 project、layer、policy、module、candidate、relation 與 evidence source。

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

## 給其他 Adapter 實作者

新的 Python、Rust、Godot 或 Agent Skill Adapter 應該提供：

1. Adapter Descriptor；
2. 版本化輸入 Schema；
3. `MsspAdapter<Input>` 實作；
4. portable adapter source provenance；
5. Intermediate Model Schema 驗證；
6. Adapter Conformance Report；
7. determinism 與 no-mutation tests；
8. 清楚區分 explicit declaration 與 unclassified candidate。

正式規格：

- `spec/MSSP-ADAPTER-CONTRACT-v0.3.md`
- `spec/MSSP-EML-ADAPTER-v0.3.md`

Reference fixture：

- `examples/eml-adapter/semantic-export.json`
