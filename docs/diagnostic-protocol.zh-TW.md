# MSSP 診斷協定 v0.2

MSSP Diagnostic Protocol v0.2 是 `lint`、`island`、未來 Repository Scanner、IDE、Agent、Adapter 與 Runtime Governance 的共同輸出格式。

## 為什麼要有協定

v0.1 的 `--json` 直接輸出 TypeScript 內部物件，並使用 `E_*`／`W_*` 代碼。這可以除錯，但不適合作為跨語言公共介面。

v0.2 改為：

```text
內部舊代碼
    ↓ 映射
穩定 MSSP 公共代碼
    ↓
Diagnostic Envelope
    ↓
CLI / CI / IDE / Agent / Adapter
```

例如：

```text
E_FMS_EXECUTABLE
→ MSSP_FMS_001
```

JSON 仍保留：

```json
{
  "code": "MSSP_FMS_001",
  "legacyCode": "E_FMS_EXECUTABLE"
}
```

因此既有內部測試不必立刻全部重寫，外部使用者則可以開始依賴穩定公共代碼。

## CLI

```bash
mssp lint . --json
mssp island . --json
```

輸出包含：

- `schemaVersion`；
- 實作名稱與版本；
- command；
- `ok`；
- error／warning／info 統計；
- diagnostics；
- command-specific metadata。

## 診斷內容

每個診斷至少包含：

- 穩定 `code`；
- `severity`；
- `message`。

並可包含：

- `legacyCode`；
- 檔案、行、列與資料路徑；
- `moduleId`；
- 關聯模組；
- 證據；
- 建議動作。

完整規範與代碼表見：

```text
spec/MSSP-DIAGNOSTIC-PROTOCOL-v0.2.md
schemas/diagnostic.schema.json
```

## 後續用途

v0.2 後續功能應共用同一協定：

- Repository Scanner 的候選模組發現；
- FMS／程式碼漂移；
- Git diff impact；
- EML Adapter；
- Python／Rust Adapter；
- LSP diagnostics；
- Agent architecture review。

工具不得要求使用者解析自然語言訊息來辨認錯誤類型。
