# MSSP Visualization v0.3 使用指南

`mssp viz` 把正式的 MSSP Intermediate Model 投影成可搜尋、可篩選、可查看來源的唯讀架構圖。

它不是架構編輯器，也不會替候選模組分類、批准或升格。

## 基本用法

產生自包含 HTML：

```bash
node dist/cli.js viz examples/hello-mssp \
  --revision HEAD \
  --out architecture.html
```

產生機器可讀 JSON：

```bash
node dist/cli.js viz examples/hello-mssp \
  --format json \
  --revision HEAD \
  --out visualization.json
```

加入原始碼導覽基底：

```bash
node dist/cli.js viz examples/hello-mssp \
  --revision HEAD \
  --source-base https://github.com/OWNER/REPO/blob/BRANCH \
  --out architecture.html
```

`sourceBase` 只建立導覽連結，不改變 `source.uri` 的原始身分。

## 圖中的三種節點

### 正式模組

```text
kind: module
status: declared
group: FMS | SCL | SMS | TMS | DMS | ROUTER | RUNTIME
```

層級來自 manifest 的正式聲明，不是視覺化工具推測的結果。

### 未分類候選

```text
kind: candidate
status: unclassified
group: UNCLASSIFIED
```

Scanner 產生的候選會保留檔案數、語言、邊界類型與信心值，但不會被 `viz` 放進任何正式 MSSP 層級。

### 未解析引用

```text
kind: reference
status: unresolved
group: UNRESOLVED
```

當關係指向不存在的 module 或 candidate 時，視覺化不會靜默刪除該關係，而是建立明確的 unresolved 節點。

## 關係

目前顯示：

- `requires`
- `affects`
- `affected-by`

這些線代表 Intermediate Model 中的正式關係投影，不代表 runtime trace，也不證明相容性。

## HTML 功能

產生的 HTML 是單一檔案，包含：

- 層級篩選；
- 關鍵字搜尋；
- 節點詳細資料；
- 關係線；
- 選配的原始碼連結；
- 響應式版面。

它不載入外部 JavaScript、CSS、字型、分析服務或 CDN，因此可以離線保存，也比較適合放進 CI Artifact。

## 安全與治理邊界

每份 Visualization Model 固定包含：

```json
{
  "invariants": {
    "readOnly": true,
    "autoMutation": false
  }
}
```

因此：

```text
看見 candidate ≠ 已批准
看見 relation ≠ 已執行
看見 source link ≠ 已驗證來源內容
產生 HTML ≠ 修改架構
```

## 與舊 graph 命令的差異

`mssp graph` 適合產生簡單 Mermaid 或 JSON dependency graph。

`mssp viz` 則建立較完整的交換模型，保留：

- node kind 與 status；
- MSSP layer group；
- source reference；
- risk、version、entry；
- candidate 邊界資料；
- unresolved reference；
- 可互動 HTML。

兩者都由 Intermediate Model 驅動，但用途不同；`graph` 不會被移除。
