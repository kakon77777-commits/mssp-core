# Candidate-to-module 審查與升格流程

這個流程解決的不是「如何讓分類器更敢下判斷」，而是相反：

> 即使分類建議很強，也不能直接變成正式架構。

MSSP v0.2 將流程拆成：

```text
Scanner candidate
  ↓
Classification suggestion
  ↓
Reviewer decision
  ↓
Contract draft
  ↓
Contract completion
  ↓
Independent approval
  ↓
Module manifest emission
```

## 1. 建立審查紀錄

```bash
node dist/cli.js review-candidate . \
  --candidate packages/exporter \
  --decision approve \
  --layer TMS \
  --reviewer architecture-reviewer \
  --reviewer-kind human \
  --rationale "此能力可按需啟動、可替換，且不構成系統閉環的必要核心。" \
  --out exporter-review.json
```

`--candidate` 可使用 Scanner 產生的 candidate ID 或精確路徑。

決策只有三種：

- `approve`：接受一個明確層級，進入契約補完；
- `reject`：拒絕本次升格提案；
- `defer`：證據不足，延後決定。

`approve` 必須明確提供 `--layer`。工具不會因為分類器建議 TMS，就自動替審查者選擇 TMS。

## 2. 產生的是阻塞草稿，不是正式模組

核准後會產生 `contractDraft`，但其中刻意保留：

```text
TODO: purpose
TODO: entry
TODO: activation
TODO: failure modes
TODO: validation
TODO: tests
```

因此初始狀態通常是：

```json
{
  "promotion": {
    "status": "blocked",
    "requiresIndependentApproval": true
  }
}
```

這不是工具失敗，而是治理設計。分類器知道的只是靜態結構與依賴證據，它不知道完整的業務本體、權限、狀態所有權、部署語義與安全失敗條件。

## 3. 必須補完的契約

至少需要處理：

- `purpose`；
- 非 FMS／SCL 層級的 `entry`；
- TMS 的 `activateWhen`；
- `inputs` 與 `outputs`；
- `requires`；
- `permissions`；
- `riskLevel`；
- `failureModes`；
- `validation`；
- `tests`；
- `maintainer`；
- `compatibility`；
- `changeImpact`；
- 所有審查條件。

任何 `TODO` 仍存在，都不得升格。

## 4. 獨立最終批准

完成草稿後：

```bash
node dist/cli.js promote-candidate exporter-review.json \
  --approver release-approver \
  --approver-kind human \
  --approval-rationale "契約、權限、失敗模式、驗證與測試均已完成。" \
  --out TMS/exporter/module.yaml
```

最終批准者不得與分類審查者相同。

工具會重新計算 blockers，而不是相信 JSON 中舊的 `promotion.status`。因此手動把 `blocked` 改成 `eligible` 沒有作用。

## 5. 升格命令會做什麼

成功時：

- 驗證 review Schema；
- 重新計算 blockers；
- 驗證 module Schema；
- 加入 `metadata.promotion` 來源鏈；
- 將 YAML manifest 寫入明確的 `--out` 路徑；
- 拒絕覆寫已存在檔案。

它不會：

- 自動修改 `mssp.yaml`；
- 自動把 manifest 加入 SMS／TMS 目錄；
- 自動產生 runtime relation；
- 執行候選原始碼；
- 自己批准自己；
- 跳過後續 `mssp lint` 與 `mssp island`。

## 6. 主要阻塞條件

升格會在以下情況失敗：

- 決策不是 `approve`；
- 沒有明確 selected layer；
- 沒有 contract draft；
- module Schema 不合法；
- 草稿層級與審查層級不同；
- 仍有 `TODO`；
- 原始 Scanner 結果被截斷；
- review conditions 尚未清空；
- 沒有 maintainer；
- executable layer 沒有 entry；
- TMS 沒有 activation condition；
- 沒有 failure modes、validation 或 tests；
- source-bearing candidate 被升為 FMS／SCL；
- reviewer 與 final approver 是同一個存在。

## 7. 不變式

```text
Suggestion ≠ Review Decision
Review Approval ≠ Completed Contract
Completed Contract ≠ Final Approval
Manifest Emission ≠ Project Registration
```

換句話說，MSSP 不把「AI 看起來判斷得很準」轉化成「AI 因此擁有架構主權」。

完整規格見 [`spec/MSSP-CANDIDATE-PROMOTION-v0.2.md`](../spec/MSSP-CANDIDATE-PROMOTION-v0.2.md)。
