# MSSP Visualization v0.3 使用指南

`mssp viz` 把正式的 MSSP Intermediate Model 投影成可搜尋、可切換視角、可查看來源的唯讀架構圖。

它不是架構編輯器，也不會替候選模組分類、批准或升格。切換 View 只改變排列方式，不會修改任何 Node 的正式 Layer、Status、Relation 或 Source。

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

## 四種唯讀視角

### Layer

```bash
--view layer
```

按照正式 MSSP Layer 排列：

```text
FMS
SCL
SMS
TMS
DMS
ROUTER
RUNTIME
UNCLASSIFIED
UNRESOLVED
```

這是預設視角。

### Status

```bash
--view status
```

按照現有 Node Status 排列：

```text
declared
unclassified
unresolved
```

`status` 只顯示既有狀態，不代表完成審查。

### Risk

```bash
--view risk
```

按照正式聲明的 Risk Metadata 排列：

```text
L0
L1
L2
L3
L4
UNSPECIFIED
```

`UNSPECIFIED` 表示沒有正式 Risk 聲明。Visualization 不會根據名稱、程式語言、路徑、關係數量或來源生態自行推測 Risk。

### Connectivity

```bash
--view connectivity
```

按照 Visualization Model 中的 Relation Degree 排列：

```text
isolated   0
leaf       1
connected  2–3
hub        4+
```

這只是結構觀察，不表示重要性、權力、品質、風險、Runtime 中心性或商業關鍵程度。

## 圖中的三種節點

### 正式模組

```text
kind: module
status: declared
group: FMS | SCL | SMS | TMS | DMS | ROUTER | RUNTIME
```

Layer 來自 Manifest 的正式聲明，不是視覺化工具推測的結果。

### 未分類候選

```text
kind: candidate
status: unclassified
group: UNCLASSIFIED
```

Scanner 產生的候選會保留檔案數、語言、邊界類型與信心值，但不會被 `viz` 放進任何正式 MSSP Layer。

### 未解析引用

```text
kind: reference
status: unresolved
group: UNRESOLVED
```

當關係指向不存在的 Module 或 Candidate 時，視覺化不會靜默刪除該關係，而是建立明確的 Unresolved Node。

## Projection 不改變架構

每一種 Projection 都必須包含同一批 Node，而且每個 Node 在每個 Projection 中只出現一次。

```text
Projection Group ≠ Canonical MSSP Layer
Risk View         ≠ Risk Inference
Connectivity View ≠ Architecture Authority
Status View       ≠ Review Decision
```

Node 本身的 `group`、`status`、`source` 與 `relations` 始終不變。

## 關係

目前顯示：

- `requires`
- `affects`
- `affected-by`

這些線代表 Intermediate Model 中的正式關係投影，不代表 Runtime Trace，也不證明相容性。

## 大型圖控制

可調整大型圖判定與瀏覽器渲染批次：

```bash
node dist/cli.js viz examples/hello-mssp \
  --view connectivity \
  --large-graph-threshold 500 \
  --initial-node-limit 200 \
  --batch-size 200 \
  --max-rendered-edges 2000 \
  --out architecture.html
```

所有數值都必須是正整數。

### Bounded-batch Node Rendering

當 Node 數量達到 `largeGraphThreshold` 時，HTML 初次只建立 `initialNodeLimit` 個符合目前搜尋與篩選條件的 Node Card。

按下 `Show more` 後，每次增加 `batchSize` 個。

完整 Node 仍保存在 HTML 內嵌的 Visualization Model 中。尚未建立 DOM 不代表資料被刪除，也不代表架構被截斷。

### Visible-endpoints-only Edge Rendering

Renderer 只繪製兩個端點都已顯示的 Relation，並將單次 SVG Path 數量限制在 `maxRenderedEdges`。

未畫出的 Edge 仍然存在於 `model.edges`。畫面限制不能被解讀為 Relation 不存在。

## Scale Profile

Visualization JSON 會明確記錄：

```json
{
  "scale": {
    "nodeCount": 1000,
    "edgeCount": 2500,
    "largeGraph": true,
    "threshold": 500,
    "initialNodeLimit": 200,
    "batchSize": 200,
    "maxRenderedEdges": 2000,
    "nodeRendering": "bounded-batch",
    "edgeRendering": "visible-endpoints-only"
  }
}
```

這是 Renderer 設定與模型規模紀錄，不是跨瀏覽器或跨硬體的效能保證。

## HTML 功能

產生的 HTML 是單一檔案，包含：

- Layer／Status／Risk／Connectivity View 切換；
- Projection Group 篩選；
- 關鍵字搜尋；
- 有界批次 Node Rendering；
- 可見端點 Relation Drawing；
- Node 詳細資料；
- 選配的原始碼連結；
- 響應式版面。

它不載入外部 JavaScript、CSS、字型、分析服務或 CDN，因此可以離線保存，也適合放進 CI Artifact。

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
看見 Candidate         ≠ 已批准
看見 Relation          ≠ 已執行
切換 Projection        ≠ 修改 Layer
看見 Hub               ≠ 擁有權力或高風險
看見 Source Link       ≠ 已驗證來源內容
Node 尚未載入 DOM      ≠ Node 不存在
Edge 尚未畫出          ≠ Relation 不存在
產生 HTML              ≠ 修改架構
```

## 與舊 graph 命令的差異

`mssp graph` 適合產生簡單 Mermaid 或 JSON Dependency Graph。

`mssp viz` 則建立較完整的交換模型，保留：

- Node Kind 與 Status；
- Canonical MSSP Layer Group；
- 多種唯讀 Projection；
- Scale Profile；
- Source Reference；
- Risk、Version、Entry；
- Candidate 邊界資料；
- Unresolved Reference；
- 可互動自包含 HTML。

兩者都由 Intermediate Model 驅動，但用途不同；`graph` 不會被移除。
