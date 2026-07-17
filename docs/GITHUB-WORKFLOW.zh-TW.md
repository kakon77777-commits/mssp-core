# MSSP 的 GitHub 使用流程

這份文件不是介紹理論，而是告訴維護者與貢獻者在 GitHub 上怎麼做。

## 1. 第一次導入

```bash
npm install
npm run build
node dist/cli.js init ./my-project
```

把生成的 `mssp.yaml`、FMS、SCL、SMS、TMS、DMS、Router 與 Runtime 骨架移入既有專案，或直接以新骨架開始。

## 2. 每次開發前

先讀：

1. `FMS/00_SYSTEM_NARRATIVE.md`
2. `FMS/01_MODULE_INDEX.md`
3. `FMS/02_ARCHITECTURE_NOTES.md`
4. 目標模組的 `module.mssp.yaml`

這個順序讓人類與 Agent 先理解系統，再改程式碼。

## 3. 新增穩定能力

只有任何有效系統閉環都不可缺少的能力，才能加入 SMS。

新增時：

1. 建立 `SMS/<module>/module.mssp.yaml`。
2. 宣告輸入、輸出、權限、依賴、失敗模式、驗證、測試與版本影響。
3. SMS 只可依賴其他 SMS。
4. 更新 FMS 模組索引。
5. 執行 `mssp lint`。

## 4. 新增可選能力

可按需載入、替換或移除的能力放入 TMS。

新增時：

1. 建立 `TMS/<module>/module.mssp.yaml`。
2. 明確寫出 `activateWhen`。
3. 只依賴已聲明 SMS，不直接依賴其他 TMS。
4. 寫出權限允許與禁止事項。
5. 寫出安全失敗方式與代表測試。
6. 執行 `mssp island --module <id>`。
7. 更新 FMS 索引與 MSSP-VT 關聯。

## 5. Pull Request 規則

PR 至少回答：

- 改了哪個模組？
- 是否改變系統本體、模組邊界或依賴方向？
- 若改變，FMS 是否同步更新？
- 哪些模組會被影響？
- 相容版本範圍是否改變？
- 執行了哪些 lint、孤島測試與功能測試？
- 還有哪些限制或研究項目未完成？

禁止讓同一個高風險 Agent 同時提出、執行、驗證並自行批准變更。

## 6. CI 閘門

建議固定執行：

```bash
npm ci
npm run typecheck
npm test
npm run build
node dist/cli.js lint examples/hello-mssp
node dist/cli.js island examples/hello-mssp
node dist/cli.js graph examples/hello-mssp --format mermaid --out architecture.mmd
```

架構圖可作為 CI artifact，讓審查者直接查看依賴變化。

## 7. 何時必須更新 FMS

以下任一事件發生時必須更新或明確審查 FMS：

- 系統目的或邊界改變；
- SMS／TMS 分類改變；
- 新增、刪除或合併模組；
- 依賴方向改變；
- Router／Runtime 的責任改變；
- 權限或風險邊界改變；
- DMS 的證據輸出不再足以驗證結果。

純內部重構且不改變上述架構語義時，可在 PR 中明確勾選「不需要更新 FMS」。

## 8. 與 EML 倉庫協作

MSSP Core 保持獨立。EML 倉庫只加入 adapter：

```text
@mssp/core
    ↑
@eml/mssp-adapter
    ↑
EML CLI / LSP / Studio / MCP
```

MSSP Core 不 import EML；EML adapter 可以讀取 EML AST、CTS 與 trace，產生 MSSP manifest 與診斷。
