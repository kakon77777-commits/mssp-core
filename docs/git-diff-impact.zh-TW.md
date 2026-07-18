# MSSP Git Diff Impact v0.2 中文指南

## 它處理的問題

傳統 Git diff 告訴你「哪些檔案改了」，但不會回答：

- 這些檔案屬於哪些正式模組？
- 哪些其他模組會因相依、相容性或 `changeImpact` 而受影響？
- 哪些版本、FMS、SCL、測試與 TMS 孤島證據必須重新審查？
- 現有架構聲明是否不足以完成影響判斷？

`mssp impact` 把 Git 變更轉成一份受治理的影響報告。

```bash
node dist/cli.js impact examples/hello-mssp \
  --base HEAD^1 \
  --head HEAD \
  --revision HEAD \
  --out git-diff-impact.json
```

`--base` 必填；`--head` 預設為 `HEAD`。

## 四層判斷

```text
Git changed paths
      ↓
直接 Module ownership
      ↓
MSSP-VT 關係傳播
      ↓
Review requirements
```

### 第一層：Git 事實

工具只使用 Git 的 name-status 結果：新增、修改、刪除、重新命名、複製與類型變更。

它不會執行被分析的程式碼。

### 第二層：直接擁有者

變更路徑位於哪一個 module manifest 所在目錄，就直接影響該模組。

工具會區分：

- `manifest`：module manifest 本身；
- `entry`：manifest 宣告的入口；
- `source`：模組邊界內的其他檔案。

一個檔案沒有任何 owner，或同時落入多個 owner，都不會被偷偷猜測，而是標記為 `indeterminate`。

### 第三層：MSSP-VT 傳播

目前使用四種已宣告關係：

```text
A.changeImpact.affects contains B
B.changeImpact.affectedBy contains A
B.requires.modules contains A
B.compatibility.modules contains A
```

這些關係只代表「需要把 B 納入影響審查」，不代表 A 的改動一定破壞 B。

### 第四層：審查義務

報告可產生：

- `module-contract`
- `version`
- `compatibility`
- `tests`
- `island`
- `fms`
- `scl`

其中 `version` 只表示必須作出版本決策。工具不會自動判定 patch、minor 或 major。

## 狀態語義

```text
no-impact
沒有專案範圍內的已知影響或審查義務。

impact-detected
已辨識出影響，且沒有結構上的未決缺口。

indeterminate
現有 ownership、MSSP-VT 或生成來源證據不足。
```

`summary.ok: true` 不是「沒有影響」，而是「目前沒有無法完成判斷的結構缺口」。

## 穩定代碼

| 代碼 | 意義 |
|---|---|
| `MSSP_IMPACT_001` | `mssp.yaml` 改變，需要廣泛專案契約審查。 |
| `MSSP_IMPACT_002` | FMS 紀錄改變。 |
| `MSSP_IMPACT_003` | SCL 治理紀錄改變。 |
| `MSSP_IMPACT_004` | 可執行層中的變更檔案沒有 module owner。 |
| `MSSP_IMPACT_005` | 變更檔案具有重疊 owner。 |
| `MSSP_IMPACT_006` | MSSP-VT 關係指向未知模組。 |
| `MSSP_IMPACT_007` | 已宣告 manifest 或 entry 被刪除／移出專案。 |
| `MSSP_IMPACT_008` | 生成檔改變，但沒有 generator provenance。 |
| `MSSP_IMPACT_010` | 模組透過 MSSP-VT 被列為間接受影響。 |

## 明確否定的能力

報告固定保留：

```json
{
  "mode": "static-conservative",
  "semanticCompatibility": false,
  "autoVersionBump": false,
  "autoMutation": false
}
```

因此它不宣稱：

- 已證明新舊行為相容；
- 已知道正確版本號；
- 已完成 migration 或 rollback 驗證；
- 已批准 Pull Request；
- 已更新 FMS、SCL 或 manifest。

## PR 使用方式

建議流程：

```text
Git diff
  → mssp impact
  → 檢查直接與傳播影響
  → 補齊 FMS／SCL／MSSP-VT
  → 執行測試與 TMS island test
  → 由獨立審查者決定相容性與版本
```

影響分析是審查輸入，不是審查批准。
