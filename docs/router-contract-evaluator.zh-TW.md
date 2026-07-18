# MSSP Router Contract Evaluator v0.4 使用指南

`mssp route` 用來根據明確的 Request Facts 與既有 Module Contract，判斷哪些正式 TMS 具備靜態選擇資格。

它不會執行、載入或啟動模組，也不會修改架構。

## 基本流程

```text
Router Request
      +
正式 MSSP Module Contracts
      ↓
Router Evaluation Report
      ↓ 另一個受治理階段
Execution Planning 或人工處理
```

## CLI

```bash
node dist/cli.js route examples/hello-mssp \
  --request examples/hello-mssp/router-request.json \
  --revision HEAD \
  --out router-evaluation.json
```

只有結果為 `selected` 時，CLI 回傳成功狀態碼。`ambiguous`、`no-match` 與 `indeterminate` 都會回傳非零狀態，提醒後續流程不能直接繼續。

## Request 範例

```json
{
  "schemaVersion": "0.4",
  "kind": "mssp-router-request",
  "requestId": "uppercase-demo",
  "intent": "Transform text to uppercase.",
  "facts": {
    "request.transform": "uppercase"
  },
  "msspVersion": "0.1.0",
  "availableInputs": ["text"],
  "requiredOutputs": ["text"],
  "availableModules": ["core.echo"],
  "availableTools": [],
  "availableData": [],
  "requestedPermissions": ["read-input"],
  "maxRiskLevel": "L0",
  "targetModules": ["plugin.uppercase"]
}
```

`intent` 只供人類與 Agent 理解。Reference Evaluator 不會用自然語言相似度、Embedding 或隱藏評分替模組排序。

## 只評估正式 TMS

Router 只會考慮已在 Module Manifest 中聲明為：

```yaml
layer: TMS
```

以下內容都不能自行成為 Router Candidate：

- Repository Scanner Candidate；
- 尚未完成 Promotion 的模組；
- SMS、DMS、Router 或 Runtime Module；
- 因為名字或 Metadata 看起來像 Plugin 的來源實體。

`targetModules` 只能縮小候選範圍，不能把非 TMS 變成 TMS。

## Activation Condition

v0.4 Reference Evaluator 只支援：

```text
<fact> == <literal>
<fact> != <literal>
```

例如：

```text
request.transform == uppercase
request.preview != true
request.count == 3
```

Fact 必須明確出現在 `facts`。

```text
條件符合        → 記錄 matchedConditions
條件不符合      → rejected
語法無法安全理解 → indeterminate
```

不會把未知條件猜成符合，也不會執行任意表達式。

## Compatibility Range

支援簡單的數字比較：

```text
>=0.1 <0.2
<=1.2.3
>0.1
=0.1.0
0.1.0
*
```

目前不處理：

```text
^0.1.0
~1.2.0
0.1 || 0.2
prerelease 或 build metadata
```

無法解析的 Range 會成為 `indeterminate`，不會被當成通過或失敗。

## 評估項目

每一個正式 TMS 都會獨立檢查：

- 是否在明確 Target Set 中；
- 所有 `activateWhen` 是否成立；
- Module 所需 Inputs 是否可用；
- Request 所需 Outputs 是否由 Module 聲明；
- 所需 Modules 是否存在且可用；
- 所需 Tools 與 Data 是否可用；
- Request 所需操作是否被 `permissions.may` 允許；
- 操作是否被 `permissions.mayNot` 明確禁止；
- Risk 是否低於或等於 Request 上限；
- MSSP Version 與 Required Module Version 是否符合聲明的 Range。

## Permission 邊界

`requestedPermissions` 是「這次若選擇該 Module，預期他需要執行哪些操作」。

通過 Router 檢查只代表操作沒有違反 Module Manifest：

```text
Permission Match ≠ Permission Grant
```

真正的授權仍然屬於 SCL 與 Runtime Governance。

## 四種總結狀態

### selected

只有一個 Eligible TMS，而且不存在不確定項或 Report Finding。

```text
selected ≠ activated
selected ≠ executed
selected ≠ approved by SCL
```

### ambiguous

兩個以上的 TMS 同時 Eligible。

Evaluator 會保留所有 `eligibleModuleIds`，但不會透過檔案順序、隱藏分數或隨機方式擅自選擇。

### no-match

沒有 Eligible Candidate，而且也沒有未決的不確定項。

這代表目前 Contract 與 Request 無法形成有效選擇，不代表可以繞過契約。

### indeterminate

存在無法保守判定的條件、版本語法或錯誤 Target。

此時應補充或修正契約，而不是猜測結果。

## Reason Codes

```text
MSSP_ROUTE_001  Candidate 不在 Target Set
MSSP_ROUTE_002  Activation Condition 不符合
MSSP_ROUTE_003  Activation Condition 語法無法判定
MSSP_ROUTE_004  缺少 Input
MSSP_ROUTE_005  缺少所需 Output
MSSP_ROUTE_006  Required Module 不存在或不可用
MSSP_ROUTE_007  Required Tool 不可用
MSSP_ROUTE_008  Required Data 不可用
MSSP_ROUTE_009  Request Operation 未被允許
MSSP_ROUTE_010  Request Operation 被明確禁止
MSSP_ROUTE_011  Risk 超過上限
MSSP_ROUTE_012  MSSP Version 不相容
MSSP_ROUTE_013  Required Module Version 不相容
MSSP_ROUTE_014  Compatibility Range 無法判定
MSSP_ROUTE_015  Target 不是正式 TMS
```

## 固定不變條件

```json
{
  "evaluation": {
    "mode": "static-contract",
    "conditionLanguage": "mssp-exact-condition-v0.4",
    "compatibilityLanguage": "numeric-comparator-range-v0.4",
    "deterministic": true,
    "readOnly": true,
    "noExecution": true,
    "noNetwork": true,
    "autoActivation": false,
    "autoMutation": false,
    "runtimeCompatibilityProof": false
  }
}
```

因此 Router Evaluation Report 是可審查的選擇證據，不是 Runtime Execution Plan。

## 目前邊界

v0.4 第一個切片尚未包含：

- 自然語言 Intent Matching；
- Weighted Ranking 或 Preference Policy；
- SCL Approval Token；
- Runtime Execution Plan；
- Dynamic Health 或 Load Balancing；
- Runtime Trace；
- 複雜 Expression Language；
- 完整 SemVer 生態相容規則；
- 自動啟動、部署或 Project Registration。
