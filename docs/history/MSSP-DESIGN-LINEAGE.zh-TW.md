# MSSP 歷史設計來源與現行映射

> 狀態：歷史設計資料，非規範性文件（non-normative）。
>
> 本目錄保存 MSSP 早期設計脈絡，並記錄其概念如何被現行 MSSP Core 規格與參考實作吸收、修正或延後。現行 `spec/`、`schemas/`、CLI 行為與通過 CI 的實作具有較高權威；歷史稿不得覆蓋現行規範。

## 保存來源

| 歷史文件 | 原始日期 | 原始檔案 SHA-256 | 歷史說明 |
|---|---:|---|---|
| MSSP-VT：基於多維向量的智能版本追蹤與程式碼關聯分析系統 | 2025-07-26 | `d3b8028bf4be278cfbf2775a97f005a95418fa2e17fb880c2b4a594b7bc99a73` | [MSSP-VT 起源說明](MSSP-VT-2025-origin.zh-TW.md) |
| CVL（約束驗證層）：MSSP 架構的獨立安全前置模組 | 2025-09 | `80d553894bc679f70d57151a8c828a51a61171c8c7ca26e99792f8b689f78c4a` | [CVL 起源說明](CVL-2025-origin.zh-TW.md) |

SHA-256 用來識別本次收到的原始 DOCX。此目錄提供可搜尋、可審查的歷史摘要；它不把原稿中的推測、案例或效能數字升格為現行事實。

## MSSP-VT 的現行位置

早期 MSSP-VT 提出版本標註、關聯追蹤、修改漣漪分析、多維向量與可視化。現行 MSSP Core 已將可規範、可驗證的部分拆入正式契約與工具，而沒有把推測性功能當成已完成能力。

| 早期概念 | 現行承接位置 | 現行狀態 |
|---|---|---|
| 模組版本 | Module Manifest `version` | 已實作 |
| 模組相容範圍 | `compatibility.mssp`、`compatibility.modules` | 已實作 |
| 直接與反向影響關係 | `changeImpact.affects`、`changeImpact.affectedBy` | 已實作 |
| 修改影響分析 | `mssp impact` 與 Git Diff Impact Report | 已實作，採靜態保守模式 |
| 關聯圖與影響路徑可視化 | Intermediate Model、Visualization Model、`mssp viz` | 已實作基礎 |
| 靜態依賴證據 | Repository Scanner `discovery.dependencies` | 已實作，但不自動升格為正式關係 |
| 函數右側人工版本註解 | 無規範性採用 | 保留為可選研究策略 |
| AI 語義向量與影響預測 | 無現行能力宣稱 | 未來研究 |
| 自動版本升級判定 | 明確禁止自動決定 | 未實作 |
| 量子計算、區塊鏈追蹤 | 無現行能力宣稱 | 歷史展望 |

現行原則：

```text
Git 變更證據
  → 模組邊界
  → 已聲明的 MSSP-VT 關係
  → 審查義務

impact-detected ≠ 不相容
分析結果 ≠ 自動版本升級
關聯證據 ≠ 架構授權
```

## CVL 的現行位置

CVL 的核心思想是：不可信輸入先經獨立約束驗證，再進入 MSSP；FMS 保持被動，SMS 不因邊界驗證而擴大責任面。

CVL **不是 MSSP 的新增核心層**。它應被理解為可部署於 MSSP 外部的前置驗證模式、Gateway、Adapter 或受治理 TMS。其是否為同進程模組、獨立進程或外部服務，屬部署與威脅模型決策。

| 早期 CVL 概念 | 現行承接位置 | 現行解讀 |
|---|---|---|
| FMS 無可執行驗證邏輯 | FMS purity lint 與 drift 檢查 | 已實作 |
| 不可信輸入不得直入核心 | SCL 政策、Module permissions、Runtime 拒絕未聲明模組 | 契約基礎已存在 |
| 驗證、批准、執行分離 | classification、review、promotion、Runtime 邊界 | 已實作治理分離 |
| 驗證輸出帶來源證據 | Intermediate Model source/evidence、DMS 可觀測性 | 部分已實作 |
| CVL 可替換、可隔離 | TMS 可替換性與 island test | 可作為建模方式 |
| `TrustedInput<T>` 類型封裝 | 語言／Adapter 特定契約 | 非語言中立核心規格 |
| 加密簽名與防偽 | 尚無通用威脅模型與協定 | 未實作 |
| FailClose／Degraded 策略 | failure modes、SCL policy、Runtime policy | 可聲明，未提供通用 CVL Runtime |
| 獨立進程 IPC | 部署拓撲 | 不屬 MSSP Core v0.x 規範 |

建議的現行表示：

```text
Untrusted input
  → external validator / gateway / governed TMS
  → explicit validation evidence or typed envelope
  → Router / Runtime policy check
  → declared SMS capability
  → DMS event

CVL pattern ≠ eighth MSSP layer
validation evidence ≠ automatic trust
signature presence ≠ verified identity
```

## 歷史稿的證據等級

兩份文件包含方法論、偽代碼、案例、效能數字、部署建議、未來展望與參考文獻。除非另有可重現資料與獨立驗證，以下內容不得作為現行專案的已證實宣稱：

- 案例研究與公司內部採用結果。
- 效能百分比、延遲、錯誤降低率與可用性數值。
- AI 預測準確率與大規模基準結果。
- 量子、區塊鏈、自適應學習等未來能力。
- 未經重新核對的外部參考文獻。
- 「攻擊面零變化」「核心完全不受影響」等絕對安全敘述。

現行 MSSP Core 採取更保守的語義：

```text
static-conservative
semanticCompatibility: false
semanticEquivalence: false
autoVersionBump: false
autoPromotion: false
autoMutation: false
```

## 後續演化邊界

### MSSP-VT

未來可擴充 AST、symbol-level diff、runtime trace、語義向量與學習式影響排序，但所有推斷都必須保留證據來源、信心、不確定性、反證、未解析項目與受治理審批，且不得自動修改版本或架構。

### CVL

未來若正式化，較適合成為獨立的 `MSSP External Validation Profile`，而不是改寫核心七元組。該 Profile 至少需要驗證規則版本、輸入／輸出 envelope schema、issuer／subject／audience／expiry／nonce、replay 與 revocation 防護、key rotation、failure policy、DMS audit event、SCL authority、Runtime acceptance policy 與可重現 conformance tests。

## 權威順序

發生衝突時，依下列順序判定：

1. 通過 CI 的現行實作行為。
2. `schemas/` 中的機器可驗證契約。
3. `spec/` 中的規範性文件。
4. 現行 README、指南與驗證報告。
5. 本目錄的歷史設計資料。

歷史稿的價值在於保存起源、問題意識與長期方向，而不是直接取代今日的工程邊界。
