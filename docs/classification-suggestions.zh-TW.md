# MSSP 有證據的層級分類建議 v0.2

Classification Suggestions 是 Repository Scanner 之後的第二層分析。

它不直接宣判 candidate 是 SMS、TMS 或其他層級，而是輸出：

```text
建議層級
支持證據
反向證據
替代層級
仍待回答的問題
```

最重要的不變條件是：

```text
Suggestion ≠ Declaration
Confidence ≠ Truth
Static Import ≠ Runtime Necessity
Classification Report ≠ Module Manifest
```

## 使用方法

```bash
mssp classify .
mssp classify . --revision <git-sha>
mssp classify . --max-files 10000
mssp classify . --revision <git-sha> --out classification-suggestions.json
```

這個命令會先執行唯讀 Repository Scanner，再建立獨立的分類建議報告。

它不會修改倉庫，也不會建立 manifest。

## 輸出邊界

每一份報告都固定包含：

```json
{
  "method": {
    "id": "mssp-static-layer-heuristics",
    "version": "0.2",
    "mode": "advisory",
    "autoPromotion": false
  }
}
```

每一個候選都保持：

```json
{
  "status": "review-required"
}
```

原始 Repository Scan Model 仍然是：

```text
modules: []
layers: []
relations: []
candidates: unclassified
```

分類器不能偷偷把 candidate 寫成 module，也不能把靜態 import 提升為正式 `requires`。

## 建議格式

```json
{
  "candidateId": "candidate.packages.export-pdf",
  "candidatePath": "packages/export-pdf",
  "status": "review-required",
  "suggestedLayer": "TMS",
  "confidence": "medium",
  "supportScore": 0.63,
  "alternativeLayers": [
    {
      "layer": "SMS",
      "supportScore": 0.17
    }
  ],
  "supportingEvidence": [],
  "counterEvidence": [],
  "unresolvedQuestions": []
}
```

`suggestedLayer` 可以是：

```text
FMS
SCL
SMS
TMS
DMS
ROUTER
RUNTIME
UNDETERMINED
```

`UNDETERMINED` 不是失敗，而是表示目前證據不足以產生占優勢的層級假說。

## Support Score 不是機率

`supportScore` 是規則權重正規化後的支持程度。

它不是：

- 正確機率；
- 模組品質；
- 模組重要性；
- 可以省略人工審查的門檻；
- 架構真理。

真正需要看的仍然是 evidence 與 unresolved questions。

## Confidence

```text
low     證據弱、互相衝突、邊界過大、掃描不完整
medium  有明顯占優勢的靜態假說，但仍缺語義判斷
high    多種獨立靜態證據共同支持，且掃描沒有已知缺口
```

即使是 `high`，依然不能自動升格。

若 Repository Scanner 的：

```json
{
  "truncated": true
}
```

則所有建議一律降為 `low`。

## 現在使用的證據

### 名稱與路徑角色詞

目前規則會辨識一些弱語義訊號：

| 詞彙方向 | 可能層級 |
|---|---|
| identity、manifest、architecture、constitution | FMS |
| policy、permission、governance、approval | SCL |
| core、kernel、domain、protocol、schema、model | SMS |
| plugin、addon、adapter、integration、exporter、feature | TMS |
| diagnostic、observability、telemetry、trace、logging | DMS |
| router、dispatcher、selector、registry、orchestrator | Router |
| runtime、executor、engine、runner、scheduler、worker | Runtime |

名稱只是證據，不是定義。

一個叫做 `core` 的套件依然可能只是歷史命名；一個叫做 `plugin` 的模組也可能早已變成整個系統無法移除的核心。

### Workspace 與 Package

獨立 package 或 Workspace member 代表它具有結構模組性。

這會弱度支持可替換或可選模組的解讀，但單靠這一點不能判定為 TMS。

### 靜態依賴拓撲

分類器目前會觀察：

```text
有多少 candidate 引用它
它引用多少其他 candidate
是否是被多個模組共用的 dependency leaf
是否只有外部依賴而沒有被其他 candidate 引用
是否存在 unresolved local dependency
```

多個 candidate 共同引用某個邊界，可以弱度支持 SMS。

候選向外依賴另一個 candidate，可以弱度支持 TMS。

但這些仍不能證明：

- 是否必須啟動；
- 是否可以移除；
- 是否可以替換；
- 是否擁有核心狀態；
- 是否只在特定任務中啟用。

## Counterevidence

報告不只保存支持證據，也保存競爭假說。

例如：

```text
名稱像 plugin
但有很多模組依賴它
```

或：

```text
名稱像 core
但它是獨立 Workspace package
而且可能可以被替換
```

這些訊號不應被分類器偷偷刪掉。

## 真正需要回答的 SMS／TMS 問題

靜態分析不能代替以下反事實判斷：

1. 沒有這個 candidate，系統是否還能形成一個連貫版本？
2. 它是否永遠啟用，或只依照請求、情境、政策、環境啟用？
3. 哪些穩定契約被允許依賴它？
4. 它失敗、移除或替換後，系統本體是否仍成立？

這四個問題才是 SMS／TMS 判斷的核心。

## 其他層級的未決問題

### FMS

```text
它是在描述系統本體，還是在執行系統能力？
其中是否含有違反 FMS 純元資料原則的可執行流程？
```

### SCL

```text
它是否真正具有變更、權限、批准或啟動治理權？
還是只是一個被治理系統使用的普通工具函式？
```

### DMS

```text
它是否只觀測、診斷與說明？
它是否擁有業務狀態或做出業務決策？
```

### Router

```text
它是否只依契約選擇能力？
它是否自己執行了被選模組的工作？
```

### Runtime

```text
它是否執行已聲明計畫並拒絕未聲明模組？
它是否留下可觀測證據與安全失敗邊界？
```

## Aggregate Boundary

Repository root 與 `src`、`app`、`lib` 這類 source root 常常同時容納多種角色。

因此 reference classifier 對它們固定輸出：

```json
{
  "suggestedLayer": "UNDETERMINED",
  "confidence": "low"
}
```

並附上：

```text
aggregate-boundary-exclusion
```

這可以避免把整個倉庫或整個 `src` 資料夾錯當成單一 MSSP module。

## 審查流程

```text
讀取 supportingEvidence
    ↓
讀取 counterEvidence
    ↓
回答 unresolvedQuestions
    ↓
接受、修正或拒絕建議
    ↓
另外建立正式 module manifest
    ↓
執行 lint / island / architecture review
```

「接受建議」與「建立正式宣告」必須是兩個不同動作。

## 現在尚未理解的資訊

v0.2 classifier 還不知道：

- 真實 runtime activation；
- feature flag；
- deployment topology；
- state ownership；
- API 穩定歷史；
- rollback 與 failure isolation；
- 測試與 coverage 語義；
- 團隊所有權；
- FMS 敘事真正含義；
- 歷史變更頻率；
- 人類對未決問題的回答。

因此現在的正確定位不是「自動架構師」，而是：

> 把原本隱藏在目錄、名稱與依賴中的弱訊號，整理成可以被反駁與審查的架構假說。

完整英文規格：

```text
spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md
```
