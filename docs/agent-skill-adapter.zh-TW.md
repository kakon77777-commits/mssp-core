# Agent Skill Adapter v0.3 使用指南

Agent Skill Adapter 把外部 Agent／Skill 工具產生的版本化語義匯出，轉換成 MSSP Intermediate Model v0.2。

他不是 Agent Runtime，也不會執行 Skill、Prompt、Tool、Workflow、Handoff、Memory、Guardrail 或模型呼叫。

## 指令

```bash
node dist/cli.js adapt agent-skill \
  examples/agent-skill-adapter/semantic-export.json \
  --revision HEAD \
  --out agent-skill-intermediate-model.json
```

也可以使用簡寫：

```bash
node dist/cli.js adapt skill semantic-export.json
```

輸入必須符合：

```text
kind: agent-skill-mssp-export
schemaVersion: 0.3
```

## 最重要的區分

```text
Skill Manifest ≠ MSSP Module
Tool Name ≠ Runtime Dependency
Trigger ≠ Activation Approval
Required Permission ≠ Permission Grant
Handoff ≠ Normative Relation
Memory Policy ≠ SCL Approval
```

只有完整的 `declaration` 能被翻譯成 Intermediate Module。

沒有 Declaration 的 Agent、Skill、Tool、Prompt、Workflow、Resource、Memory Policy、Guardrail、Handoff、Evaluator 或 Service，都會保持：

```text
candidate.agent-skill.<component-id>
status: unclassified
autoPromotion: false
```

## 可保存的 Agent Skill 資訊

Project 層可以保存：

- Agent Framework 與版本；
- Manifest 格式與版本；
- Protocol Version；
- Execution Environment；
- Model Family；
- Transport。

Component 層可以保存：

- Skill Identity 與 Namespace；
- Manifest、Entrypoint、Prompt、Input Schema、Output Schema 路徑；
- Tool Name、Capability、Trigger；
- Required／Denied Permission；
- Delegation／Handoff 目標；
- Read／Write Resource；
- Model Constraint。

這些欄位都是來源證據，不會授予架構權限。

## 權限不會被偷渡

來源匯出中的：

```json
{
  "requiredPermissions": ["network", "write-memory"],
  "deniedPermissions": ["write-source"]
}
```

只會成為 Metadata。

他們不會自動成為 MSSP Module 的：

```text
declaration.permissions.may
declaration.permissions.mayNot
```

正式 MSSP Permission 必須由完整 Declaration 明確提供，之後仍須接受 SCL 與專案治理。

## 關係不會被偷渡

只有下列 Declaration 欄位會產生正式 MSSP Relation：

```text
declaration.requirements.modules     → requires
declaration.changeImpact.affects     → affects
declaration.changeImpact.affectedBy  → affected-by
```

下列資訊不會自動產生關係：

- Tool Name 或 Tool Call；
- Prompt 引用；
- Trigger；
- Skill Dependency；
- Handoff 或 Delegation；
- Resource Read／Write；
- Model Constraint；
- Entrypoint；
- Manifest 中的名稱或目錄接近程度。

## 不執行原則

Adapter 固定維持：

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

執行轉換時不會：

- 呼叫模型或 Agent；
- 執行 Prompt、Skill、Tool、Workflow、Evaluator 或 Guardrail；
- 開啟 Browser、Shell、MCP Server、Plugin Host 或 Tool Transport；
- 安裝套件；
- 讀取 Credential、Environment Variable、Session Memory 或 User Memory；
- 測試或提升 Permission；
- 讀取 `sourceUri` 指向的本機檔案；
- 存取網路；
- 修改 Skill Manifest、Prompt、Tool、Policy、MSSP Manifest 或 `mssp.yaml`。

## 身分與可攜性

每個 Component 必須提供穩定的：

```text
skillIdentity
```

重複的 Component ID 或 Skill Identity 會被拒絕。

`sourceUri` 必須是 Repository-relative Path 或可攜式 Logical URI。下列形式會被拒絕：

```text
/tmp/private/skill.json
C:\private\skill.json
```

## 解讀限制

成功轉換只表示：

> 這份符合 Schema 的 Agent Skill 語義匯出，已被確定性地翻譯為 Intermediate Model。

不表示：

- Skill 可以安裝或執行；
- Prompt 品質合格；
- Tool 真實存在或安全；
- Permission 已被批准或落實；
- Memory 已隔離；
- Handoff、Workflow 或 Guardrail 正確；
- 模型、MCP、Browser、Shell、Plugin 或網路呼叫可成功；
- 已經完成 SCL 審批；
- 已註冊至專案；
- 已符合部署條件。

參考規格：[`MSSP-AGENT-SKILL-ADAPTER-v0.3.md`](../spec/MSSP-AGENT-SKILL-ADAPTER-v0.3.md)。
