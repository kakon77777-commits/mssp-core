# MSSP Adapter 與 Reference Adapter 指南

## Adapter 解決什麼問題

MSSP Core 不直接依賴每一種語言、編輯器、遊戲引擎、Build Backend 或 Agent 平台。

Adapter 把外部工具已經產生的版本化 Semantic Export，轉換成 MSSP Intermediate Model：

```text
外部語言／工具的版本化 Export
                ↓
          MSSP Adapter Registry
                ↓
     MSSP Intermediate Model
```

Adapter 是 Boundary Translator，不是 Parser Host、Runtime、Package Installer、Permission Grant、Classifier、Reviewer 或 Promotion Service。

## 目前可用 Adapter

```bash
node dist/cli.js adapters
node dist/cli.js adapters --json --out adapter-descriptors.json
```

Registry 目前依穩定 Adapter ID 排序提供：

```text
agent-skill-mssp-export  aliases: agent-skill, skill
eml-mssp-export          aliases: eml
godot-mssp-export        aliases: godot, gd
python-mssp-export       aliases: python, py
rust-mssp-export         aliases: rust, rs
```

全部輸出：

```text
mssp-intermediate-model v0.2
```

## 執行方式

```bash
node dist/cli.js adapt agent-skill \
  examples/agent-skill-adapter/semantic-export.json \
  --revision HEAD \
  --out agent-skill-intermediate-model.json

node dist/cli.js adapt eml \
  examples/eml-adapter/semantic-export.json \
  --revision HEAD \
  --out eml-intermediate-model.json

node dist/cli.js adapt godot \
  examples/godot-adapter/semantic-export.json \
  --revision HEAD \
  --out godot-intermediate-model.json

node dist/cli.js adapt python \
  examples/python-adapter/semantic-export.json \
  --revision HEAD \
  --out python-intermediate-model.json

node dist/cli.js adapt rust \
  examples/rust-adapter/semantic-export.json \
  --revision HEAD \
  --out rust-intermediate-model.json
```

CLI 只讀取現有 JSON Export，不會啟動來源工具鏈。

## Module 與 Candidate 的分界

最重要的規則：

```text
來源系統中的 module／package／plugin／scene／skill／tool
不等於
正式 MSSP Module
```

只有具備完整 `declaration` 的 Component 才能映射成 Intermediate Module。

沒有完整 Declaration 時，即使來源資訊顯示他是：

- EML Module；
- Python Package、Plugin、Command 或 Service；
- Rust Crate、Binary、Proc Macro 或 Build Script；
- Godot Scene、Autoload、Singleton、Addon 或 Editor Plugin；
- Agent、Skill、Tool、Workflow、Memory Policy、Guardrail 或 Handoff；

仍然只能是：

```json
{
  "status": "unclassified"
}
```

Adapter 不會替來源補上 Layer、Permission、Risk、Compatibility、Failure Mode、Validation、Test 或 Change Impact。

只要存在不完整的 `declaration`，輸入 Schema 就會拒絕它，而不是產生一份看似完整的假契約。

## 各生態 Metadata 的地位

### EML

Symbol Kind、來源位置與其他語義資訊只是來源描述。Raw `.eml` 解析與 EML Runtime 不在 Core 內。

### Python

```text
qualifiedName    → pythonQualifiedName
importPath       → pythonImportPath
entryPoints      → pythonEntryPoints
distributionName → pythonDistributionName
requiresPython   → pythonRequires
buildBackend     → pythonBuildBackend
```

Import Path、Entry Point 或可匯入性不代表 Module 已被批准。

### Rust

Cargo Workspace、Package、Crate、Target、Feature、Edition、Toolchain、Crate Type 與 Target Triple 都只是來源 Metadata。

Cargo Dependency、`use`、Build Script 或 Proc Macro 不會自動變成 MSSP Relation。

### Godot

Engine Version、Renderer、Main Scene、Scene／Script Path、Class、Node、Resource、Autoload、Plugin、Signal 與 Group 都只是來源 Metadata。

Main Scene、Autoload 或已啟用 Plugin 不代表架構授權。

### Agent Skill

Framework、Manifest、Protocol、Execution Environment、Model Family、Transport、Prompt、Schema、Tool、Capability、Trigger、Permission、Delegation、Resource 與 Model Constraint 都只是來源 Metadata。

尤其：

```text
Required Permission ≠ Permission Grant
Tool Name ≠ Runtime Dependency
Handoff ≠ Normative Relation
Trigger ≠ Activation Approval
Memory Policy ≠ SCL Approval
```

來源 Permission 不會自動進入正式 `declaration.permissions`。

## 關係來源

Adapter 只會從完整 Declaration 建立正式關係：

```text
requirements.modules    → requires
changeImpact.affects    → affects
changeImpact.affectedBy → affected-by
```

下列證據不會自行升格為正式 Relation：

- Import、Call、Symbol Reference 或名稱相似；
- Package／Cargo Dependency；
- Scene Inheritance、Script Attachment、Signal、Group 或 Resource Reference；
- Tool Name、Tool Call、Prompt、Trigger、Handoff、Delegation、Resource Read／Write；
- Manifest、Entrypoint 或目錄接近程度。

Unknown Relation Target 仍會保留，不會因為 Export 中沒有該 Target 就被刪除。

## Candidate Hint

沒有 Declaration 的 Component 可以提供結構提示：

```json
{
  "candidate": {
    "path": "src/experimental",
    "boundaryKind": "source-root",
    "boundaryConfidence": 0.64,
    "fileCount": 2,
    "sourceFileCount": 2,
    "languages": ["json"]
  }
}
```

`boundaryConfidence` 只代表結構邊界可信度，不代表 Layer 分類或 Promotion 可信度。

## Source Provenance

所有 Adapter 輸出來源都會標記：

```json
{
  "kind": "adapter",
  "adapter": "<stable-adapter-id>"
}
```

`sourceUri` 必須是 Repository-relative Path 或 Portable Logical URI。

絕對 POSIX Path、Windows Drive Path 與 Backslash Path 會被拒絕，避免洩漏本機環境資訊。

`--revision` 只記錄來源身分，不證明執行可重現、語義等價或版本相容。

## 固定安全條件

每個 Reference Adapter 固定維持：

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

Reference Adapter 不會：

- 執行來源程式、Build Script、Macro、Plugin、Tool、Prompt、Skill 或模型；
- 啟動 Interpreter、Compiler、Cargo、Godot Editor、Agent Runtime、Browser、Shell 或 MCP Server；
- 安裝套件、解析遠端依賴或存取網路；
- 讀取 `sourceUri` 指向的本機檔案；
- 檢查 Credential、Environment Variable、User／Session Memory；
- 授予 Permission；
- 修改來源專案、MSSP Manifest 或 `mssp.yaml`；
- 自動註冊、分類、批准、提升或啟用 Module。

## 共用 Declarative Adapter Builder

`src/declarative-adapter.ts` 統一處理：

- 完整 Declaration → Module；
- 缺少 Declaration → Unclassified Candidate；
- Explicit Declaration Relations；
- Portable Source Provenance；
- Deterministic Sorting；
- Duplicate Identity Rejection；
- Project、Layer、Policy、Module、Candidate 與 Relation 映射。

每個 Ecosystem Adapter 仍保有自己的 Input Schema、Identity 與 Metadata Mapping。共用 Builder 不會替來源分類或推斷架構。

## 規格與指南

- [`MSSP-ADAPTER-CONTRACT-v0.3.md`](../spec/MSSP-ADAPTER-CONTRACT-v0.3.md)
- [`MSSP-EML-ADAPTER-v0.3.md`](../spec/MSSP-EML-ADAPTER-v0.3.md)
- [`MSSP-PYTHON-ADAPTER-v0.3.md`](../spec/MSSP-PYTHON-ADAPTER-v0.3.md)
- [`MSSP-RUST-ADAPTER-v0.3.md`](../spec/MSSP-RUST-ADAPTER-v0.3.md)
- [`MSSP-GODOT-ADAPTER-v0.3.md`](../spec/MSSP-GODOT-ADAPTER-v0.3.md)
- [`MSSP-AGENT-SKILL-ADAPTER-v0.3.md`](../spec/MSSP-AGENT-SKILL-ADAPTER-v0.3.md)
- [`godot-adapter.zh-TW.md`](godot-adapter.zh-TW.md)
- [`agent-skill-adapter.zh-TW.md`](agent-skill-adapter.zh-TW.md)

## Reference Fixtures

- `examples/agent-skill-adapter/semantic-export.json`
- `examples/eml-adapter/semantic-export.json`
- `examples/godot-adapter/semantic-export.json`
- `examples/python-adapter/semantic-export.json`
- `examples/rust-adapter/semantic-export.json`
