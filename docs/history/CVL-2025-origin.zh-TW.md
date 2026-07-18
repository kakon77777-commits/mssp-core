# CVL 2025 歷史設計起源

> 狀態：非規範性歷史摘要。
>
> 原始文件：〈CVL（約束驗證層）：MSSP 架構的獨立安全前置模組〉，2025-09。
>
> 原始 DOCX SHA-256：`80d553894bc679f70d57151a8c828a51a61171c8c7ca26e99792f8b689f78c4a`

## 原始問題意識

CVL（Constraint Validation Layer）源自一個明確約束：

```text
FMS 必須保持被動
SMS 不應因輸入驗證而擴大責任面
TMS 失效不得拖垮核心
```

原稿因此提出在 MSSP 外部建立可替換的前置驗證模組，先處理外部輸入、資源邊界、數值範圍與拒絕／飽和策略，再將驗證結果交給核心能力。

## 原始資料流

```text
Untrusted RawInput
  → CVL validation
  → TrustedInput<T>
  → SMS capability
```

原稿使用私有建構子的 `TrustedInput<T>` 與簽名欄位表達「未驗證值不能直接傳入核心」。這個想法的重點是建立信任邊界，而不是要求所有語言都採用相同 C++ 類型。

## CVL 在現行 MSSP 中的定位

CVL **不是第八個 MSSP 核心層**。

現行核心模型仍是：

```text
MSSP = (FMS, SCL, SMS, TMS, DMS, Router, Runtime)
```

CVL 比較適合被建模為下列其中之一：

- MSSP 外部 Gateway 或 validation service。
- 受 SCL 管理、可替換且可 island-test 的 TMS。
- 語言或生態系 Adapter 前的輸入驗證器。
- Runtime 接受資料之前的 policy enforcement point。

其部署為同進程模組、獨立進程、sidecar 或遠端服務，屬威脅模型與部署拓撲決策，而不是 MSSP Core 的固定層級。

## 已被現行設計吸收的部分

### FMS 被動性

現行 lint 與 drift 分析會拒絕 FMS 中的 executable source。CVL 規則與驗證邏輯不得放進 FMS；FMS 最多只能記錄外部驗證機制的存在與政策引用。

### 驗證、批准與執行分離

現行流程將不同權限拆開：

```text
evidence
  → classification suggestion
  → explicit review
  → contract completion
  → independent approval
  → manifest emission
  → separate registration
  → Runtime execution
```

因此「驗證通過」不等於「取得架構授權」，也不等於「允許 Runtime 執行」。

### 可替換與隔離

若 CVL 以 TMS 形式存在，它必須符合：

- 明確 activation condition。
- 僅依賴允許的 SMS contract。
- 可單獨測試。
- 失效行為明確。
- 不讓 SMS 反向依賴可選 CVL。

### 證據與可觀測性

驗證結果可透過 Intermediate Model source/evidence 與未來 DMS event 表達，但證據本身不會自動變成 Module、relation、approval 或 Runtime trust。

## 尚未被實作的部分

MSSP Core 目前沒有通用 CVL Runtime，也沒有定義可跨語言互通的 `TrustedInput<T>` 或簽名協定。以下仍需要正式威脅模型與規格：

- issuer、subject、audience 與 scope。
- expiry、nonce、replay 防護與 revocation。
- key rotation 與簽章演算法 agility。
- 規則版本與驗證器版本綁定。
- envelope schema 與 canonical serialization。
- FailClose、Degraded、retry 與 timeout 語義。
- DMS audit event 與 SCL authority。
- Runtime acceptance policy。
- 遠端驗證服務的身分驗證與通道安全。

因此不能把「有 signature 欄位」直接視為密碼學安全，也不能把「CVL 被攻破只影響輸入層」視為已證明結論。

## 對原稿絕對敘述的修正

原稿曾使用「攻擊面零變化」「核心邏輯不受影響」「CVL 可移除」等強敘述。現行文件採較保守表達：

- 外部驗證可減少某些輸入風險，但也會新增驗證器、金鑰、配置、IPC 與供應鏈攻擊面。
- CVL 被繞過或被攻破時，實際影響取決於 Runtime 是否重新驗證 envelope、權限邊界與業務不變量。
- SMS 仍需保護自身不可妥協的不變量，不能把全部安全責任外包。
- 移除 CVL 是否安全，取決於 SCL policy 與部署需求，不能一般化。

## 未來正式化方向

CVL 若進入正式路線，較適合命名為：

```text
MSSP External Validation Profile
```

它應是獨立 Profile，不修改核心七元組。最低交付應包含：

1. Machine-readable validation envelope schema。
2. Rule set identity、version 與 digest。
3. Issuer authority 與 Runtime acceptance policy。
4. Fail-closed conformance tests。
5. Replay、expiry、revocation 與 key-rotation tests。
6. DMS audit event schema。
7. 同進程與跨進程 reference adapter。
8. 明確否認「驗證通過即自動批准」。

## 歷史證據限制

原稿包含性能延遲、內部專案效果與安全事件數字。這些資料沒有隨 MSSP Core 提供可重現測試資料，因此不構成現行性能或安全證明。

本文件保存的是 CVL 的問題意識與架構方向；現行權威仍以 `schemas/`、`spec/`、通過 CI 的核心行為與 Validation Report 為準。
