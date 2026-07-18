# MSSP-VT 2025 歷史設計起源

> 狀態：非規範性歷史摘要。
>
> 原始文件：〈MSSP-VT：基於多維向量的智能版本追蹤與程式碼關聯分析系統〉，2025-07-26。
>
> 原始 DOCX SHA-256：`d3b8028bf4be278cfbf2775a97f005a95418fa2e17fb880c2b4a594b7bc99a73`

## 原始問題意識

早期 MSSP-VT 針對大型分層程式庫中的四個問題提出解法：

- 修改後的版本標記不同步。
- 直接與間接關聯容易遺漏。
- 修改漣漪範圍難以評估。
- 人工維護關聯與版本資訊的成本持續上升。

原稿採兩階段構想：先用人工版本標註與一致性檢查建立資料基礎，再逐步加入 AI 語義分析、多維向量、影響預測與可視化。

## 早期標註構想

原稿曾提出在函數或模組旁加入版本、修改次數與關聯列表，例如：

```text
v1.2.3-修改次數:15-關聯:[SMS.validator,TMS.storage,FMS.userIndex]
```

此格式具有歷史價值，但沒有被現行 MSSP Core 採為規範性語法。原因包括：

- 函數註解容易與 Git 歷史、Module Manifest 和實際依賴漂移。
- `FMS` 不應被當成一般可執行依賴目標。
- 關聯列表若沒有方向、證據與授權語義，會混合靜態依賴、影響關係與架構聲明。
- 自動更新原始碼註解會增加非必要 mutation。

## 被現行 MSSP Core 吸收的部分

### 版本與相容性

現行 Module Manifest 使用：

```text
version
compatibility.mssp
compatibility.modules
```

這些欄位承接早期版本一致性需求，但將版本資訊放在機器可驗證契約中，而不是散落於函數註解。

### 影響關係

現行契約使用：

```text
changeImpact.affects
changeImpact.affectedBy
requires.modules
```

這些關係有明確方向，並能與 Module ID、Schema 驗證和 review obligation 結合。

### Git Diff Impact Analysis

`mssp impact` 承接早期「修改漣漪分析」的核心問題。現行實作：

- 讀取明確的 Git base/head 比較。
- 將 changed paths 映射至 Module ownership。
- 經由已聲明的 MSSP-VT 關係傳播影響。
- 產生版本、相容性、測試、FMS、SCL 與 island review 義務。
- 保留 `indeterminate`，不把未知項目偽裝成確定結論。

它明確拒絕：

```text
impact-detected ≠ incompatibility
impact report ≠ semantic proof
impact report ≠ automatic version bump
```

### 可視化

Visualization Model 與 `mssp viz` 承接早期關聯圖構想，但目前只顯示已聲明 Module、未分類 candidate、未解析 reference 與規範性 relation，不聲稱已完成 AI 語義向量或 runtime trace 分析。

## 尚未被實作的歷史構想

以下仍屬研究方向：

- 函數／symbol 級版本追蹤。
- Compiler-grade AST 與資料流分析。
- Runtime trace 與部署拓撲的動態影響傳播。
- 多維程式碼向量與學習式相似度。
- AI 修改漣漪排序與專案特定模型。
- 自動關聯標註。
- 量子加速、區塊鏈不可篡改紀錄。

任何未來實作都必須保留來源證據、信心、反證、未解析項目與治理審批，且不得直接修改版本或架構。

## 歷史證據限制

原稿包含案例、基準數字、效能推估、公司內部採用描述與外部參考文獻。這些內容目前沒有隨 MSSP Core 儲存可重現原始資料，因此不得作為現行實作已驗證性能或部署成果的證據。

現行權威文件為：

- `spec/MSSP-GIT-DIFF-IMPACT-v0.2.md`
- `schemas/git-diff-impact.schema.json`
- Module Manifest Schema
- `src/git-diff-impact.ts`
- 通過 CI 的測試與 Validation Report

本文件只保存 MSSP-VT 的起源、演化與被現行系統吸收的範圍。
