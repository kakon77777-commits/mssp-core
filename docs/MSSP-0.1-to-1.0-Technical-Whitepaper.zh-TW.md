# MSSP 0.1 → 1.0 技術白皮書
## 母集—子集範式的穩定化、通用化與標準化路線

**文件狀態：** Draft v0.1  
**對應實作：** MSSP Core v0.1.0  
**建議倉庫路徑：** `docs/MSSP-0.1-to-1.0-Technical-Whitepaper.zh-TW.md`  
**核心定位：** 通用方法論、軟體架構方法、機器可驗證規格  
**授權建議：** 與 MSSP Core 倉庫一致，採 Apache-2.0  

---

## 摘要

MSSP（Mother-Set and Subset Paradigm，母集—子集範式）是一套用於辨認、描述、分割、驗證、治理與演化複雜系統的通用方法論與架構方法。

它不是一種新的程式語言，也不是某個特定框架的外掛系統。MSSP 試圖解決的核心問題是：

> 當一個系統逐漸擴張、功能增殖、依賴交纏、多人或多 Agent 共同修改時，如何持續辨認「系統本體」、「不可缺少的穩定能力」、「可替換的任務能力」、「設定權限」、「診斷證據」、「路由決策」與「執行環境」之間的界線？

MSSP Core v0.1.0 已建立最小可執行架構契約，包括：

- FMS、SCL、SMS、TMS、DMS、Router 與 Runtime 的層級定義；
- 專案與模組 manifest；
- 依賴方向規則；
- FMS 純元資料規則；
- TMS 孤島測試；
- MSSP-VT 相容性與影響欄位；
- CLI、Schema、診斷、架構圖與參考專案；
- GitHub CI 與架構審查流程。

然而，v0.1 主要證明的是：

> MSSP 可以被形式化、被機器讀取，也可以阻止一部分明確的架構錯誤。

從 v0.1 到 v1.0 的真正任務，不是堆疊所有可能功能，而是完成三個轉變：

1. 從**單一參考實作**轉為**語言無關規格**；
2. 從**可驗證架構格式**轉為**完整通用方法論**；
3. 從**原作者可解釋的系統**轉為**第三方可獨立採用、實作與驗證的標準**。

因此，本白皮書將 MSSP 1.0 定義為：

$$
\text{MSSP 1.0}
=
\text{方法論}
+
\text{規範}
+
\text{參考實作}
+
\text{符合性測試}
+
\text{跨語言介接}
+
\text{治理}
+
\text{可觀測性}
+
\text{演化規則}
$$

MSSP 1.0 並不代表所有研究模組、所有 Adapter、所有 AI 推斷能力與所有視覺工具皆已完成。它代表 MSSP 的核心語義與互通契約已足夠穩定，使第三方不必依賴原作者口頭解釋，也能正確採用、重新實作與擴充。

---

# 1. 問題背景

## 1.1 傳統模組化不足以回答的問題

傳統軟體工程已經具有許多成熟概念：模組、套件、插件、微服務、依賴注入、分層架構、Clean Architecture、Hexagonal Architecture、DDD、Monorepo、事件驅動與 Agent orchestration。

但這些方法通常只處理部分問題，仍不必然回答：

- 哪些模組是系統不可缺少的本體？
- 哪些功能只是當前任務需要，而不應進入穩定核心？
- 哪些設定可以在執行期被誰修改？
- 哪些模組可以單獨驗證？
- 一個模組被替換時，會影響哪些其他模組？
- 系統聲稱「完成」時，證據由哪一層保存？
- 多個 Agent 是否可以自行提案、自行修改、自行驗證並自行批准？
- 系統架構文件與實際程式碼是否已經分離？
- 一個大型系統能否被再分割成多個巢狀 MSSP？

MSSP 的目的不是取代所有既有架構方法，而是提供更高層的判斷框架：

> 系統中的能力，究竟屬於本體、穩定核心、任務子集、設定契約、診斷證據、路由選擇，還是執行環境？

## 1.2 MSSP 的基本命題

### 命題一：重要不等於核心

一個功能即使很大、常用、昂貴或複雜，也不必然屬於 SMS。

SMS 的判定應依賴反事實測試：

> 移除這項能力後，系統是否仍能形成一個有效而連貫的閉合版本？

若答案為「不能」，它才是 SMS 候選；若答案為「可以」，它更可能屬於 TMS、Adapter、外部服務或領域擴充。

### 命題二：可替換能力不應僭位為系統本體

許多系統會把暫時需要的功能逐步寫入核心，最後造成核心膨脹、相依性反轉、替換困難、版本耦合與全域故障。MSSP 要求可替換、可停用、可按需載入的能力，優先被辨認為 TMS。

### 命題三：架構必須同時對人與機器可讀

純自然語言文件容易過時；純程式碼又不能充分表達「為什麼」與「哪些規則不可違反」。因此 MSSP 採雙重表達：

```text
FMS / 規格 / 說明文件
        +
Manifest / Schema / CLI / CI
```

### 命題四：診斷不等於執行，執行不等於批准

MSSP 明確分離執行能力、路由決策、診斷證據、設定權限與審查批准。高風險行動不得由同一主體完成「提出→執行→驗證→批准」的自我閉環。

---

# 2. MSSP 核心模型

MSSP 的核心結構可表示為：

$$
\mathcal{M}=(F,C,S,T,D,R,X)
$$

其中：

- $F$：FMS，Foundational Mother Set；
- $C$：SCL，Setting Contract Layer；
- $S$：SMS，Stable Mother Set；
- $T$：TMS，Task/Temporary Modular Subset；
- $D$：DMS，Diagnostic Mother Set；
- $R$：Router；
- $X$：Runtime。

## 2.1 FMS：Foundational Mother Set

FMS 是系統憲法、架構索引與本體敘述，應描述系統存在理由、邊界、模組身分、層級關係、依賴方向、不變量、張力與架構決策。FMS 不應包含可執行業務程式碼。

核心規則：

> 系統身分、模組邊界或依賴方向改變時，必須觸發 FMS 審查。

## 2.2 SCL：Setting Contract Layer

SCL 定義誰可以修改什麼、何時生效、是否需要審查、是否允許執行期覆寫、如何回復，以及哪些變更必須留下證據。SCL 應區分 build-time、startup-time、runtime、one-shot override、reviewed change 與 forbidden change。

## 2.3 SMS：Stable Mother Set

SMS 是每個有效系統閉合版本都不可缺少的穩定能力集合。候選模組應通過反事實必要性、依賴方向、穩定性、生命週期、替換成本與最小閉合檢查。SMS 不得依賴 TMS。

## 2.4 TMS：Task/Temporary Modular Subset

TMS 是可選、可替換、可停用、可按需啟動的功能子集。每個 TMS 應聲明 activation、輸入輸出、SMS／工具／資料依賴、權限、禁止行為、風險、失敗模式、安全退出、驗證、測試、相容性與影響。

TMS 不是「插件資料夾」，而是具有完整行為契約的可替換能力。

## 2.5 DMS：Diagnostic Mother Set

DMS 負責觀察、記錄、診斷、產生證據、解釋執行與暴露限制。它至少應回答：執行了什麼、哪個模組與版本、由哪條路由選擇、使用哪些權限、驗證結果、警告、限制與 artifact 位置。

## 2.6 Router

Router 根據任務意圖、模組契約、風險、權限、工具、資料、成本、時間與相容性選擇 TMS。Router 不應把所有可選能力硬編碼為核心依賴，其選擇必須可被 DMS 解釋。

## 2.7 Runtime

Runtime 執行已被允許的計畫，應拒絕未宣告模組、驗證相容性與權限、輸出 DMS 事件，並支援失敗隔離、snapshot、rollback 與 migration。

---

# 3. MSSP v0.1 的完成範圍

MSSP Core v0.1.0 已建立最小可互通架構契約：

```text
專案 Manifest
模組 Manifest
JSON Schema
TypeScript Loader
Validator
FMS purity rule
Layer dependency rules
Cycle detection
Unknown dependency detection
TMS island tests
MSSP-VT fields
Mermaid / JSON graph
Project initializer
Reference project
GitHub CI
PR architecture checklist
Stable diagnostics
```

v0.1 證明了 MSSP 不只是哲學敘述，而能轉化為 Schema、CLI、測試與 CI；架構錯誤可以 fail loudly；TMS 可以被要求具有最小閉合能力。

尚未完成的能力包括 repository 反向發現、自動分類、FMS／程式碼一致性、跨語言 Adapter、Runtime 事件、Router 契約、SCL 強制執行、多倉庫、方法論教材、通用性案例、第二實作、完整 conformance suite、AI 多主體治理與 AISMBI／MCL。

---

# 4. 從 v0.1 到 v1.0 的穩定化原則

## 4.1 版本不以功能數量定義

```text
0.1  架構能被描述與驗證
0.2  工具能讀懂既有專案
0.3  規格能跨語言與工具介接
0.4  契約能治理實際執行
0.5  方法論能被教學與重複採用
0.6  通用性能由異質案例驗證
0.7  架構能跨尺度與長期演化
0.8  多主體與 AI 能被治理
0.9  第三方能獨立重新實作
1.0  核心語義與互通承諾穩定
```

## 4.2 研究模組不阻塞 Core

AISMBI、MCL、AI 測試生成、自動架構修復、視覺編輯器與所有 Adapter 都可很重要，但不必阻塞 1.0。Core 只吸收已穩定、可互通、可驗證的能力。

## 4.3 規格必須獨立於 TypeScript

TypeScript 是第一個參考實作，不是 MSSP 本體。Schema、診斷碼與 conformance 不得依賴 TypeScript 專用語義；v0.9 前必須出現至少一個非 TypeScript 實作。

---

# 5. 版本路線

## 5.1 v0.2：Repository Architecture Intelligence

### 目標

讓 MSSP 不只驗證人工編寫的 manifest，也能讀取既有專案，提出有證據的架構判斷。

### 必要交付物

1. **Repository Scanner**：掃描檔案、套件、imports、exports、entry points、build scripts、tests、configs、workflows 與 runtime boundaries，輸出候選模組圖。
2. **Evidence-backed Classification**：提出 candidate SMS／TMS／DMS／Router／Runtime 或 ambiguous，且每項建議都必須附證據、信心與反例。
3. **FMS／Code Consistency Check**：偵測未登記模組、已不存在模組、層級宣告與實際依賴衝突，以及架構改變但 FMS 未更新。
4. **MSSP-VT Git Diff Impact**：推斷受影響模組、版本變更、FMS 更新需求、island test 重跑需求與破壞性變更風險。
5. **Diagnostic Protocol v0.2**：建立穩定 JSON 診斷格式。

範例：

```json
{
  "code": "MSSP_DEP_001",
  "severity": "error",
  "message": "SMS module depends on TMS module.",
  "file": "SMS/core/module.mssp.yaml",
  "moduleId": "core",
  "relatedModules": ["optional-search"],
  "evidence": [],
  "suggestedActions": []
}
```

### 完成門檻

- 能分析至少三種 repository 類型；
- 不要求專案先手工完成所有 manifest；
- 分類結果必須附證據；
- 不允許無證據自動修改層級；
- Git diff impact 可在 PR 中產生穩定報告。

---

## 5.2 v0.3：Visualization and Adapters

### 目標

證明 MSSP 是跨語言、跨工具的方法，而不是 TypeScript 專案專用格式。

### 必要交付物

1. **MSSP Intermediate Model**：Project、Module、Layer、Contract、Dependency、Permission、Risk、Activation、Validation、Compatibility、Impact、Evidence 與 RuntimeEvent。
2. **EML Adapter**：將 EML AST、CTS、semantic information 與 trace 映射為 MSSP module graph、diagnostic 與 DMS event。
3. **其他 Adapter**：至少完成 Python、Rust，以及 Godot 或 Agent Skill 中的一類。
4. **Interactive Architecture Graph**：支援節點導航、來源檔定位、依賴、風險、版本影響、island 狀態與 FMS 一致性。

### 完成門檻

- 至少三種技術棧產生同一中立模型；
- Adapter 不修改 MSSP Core 語義；
- 圖形節點可追溯到原始碼；
- 不同技術棧可輸出可比較診斷。

---

## 5.3 v0.4：Runtime Governance

### 目標

把 MSSP 從靜態架構描述提升為執行期契約。

### 必要交付物

1. **Router Contract Evaluator**：驗證 activation、tools、data、permissions、risk、compatibility、cost、timeout、fallback 與 evidence requirement。
2. **DMS Event Protocol**：記錄 event id、時間、專案、模組、版本、路由、動作、輸入輸出、驗證、警告、限制與 artifacts。
3. **SCL Enforcement Hooks**：allow、deny、require-review、require-confirmation、temporary override、rollback 與 audit trail。
4. **Snapshot and Migration Contract**：狀態保存、回復、遷移、不可逆操作與遷移後驗證。

### 完成門檻

- Router 的能力選擇可被解釋；
- 高風險能力不能繞過 SCL；
- DMS 可產生可驗證證據；
- 至少一個真實專案完成 snapshot／rollback 演示。

---

## 5.4 v0.5：Methodology Formalization

### 目標

讓 MSSP 成為可被教學、重複採用與批判的方法論。

### 必要交付物

1. 系統邊界辨認程序；
2. SMS 反事實必要性、穩定性、依賴、替換與閉合判定；
3. TMS 可選性、替換性、停用性、孤島可測試性與安全失敗判定；
4. TMS→SMS 升格與 SMS→TMS 降格規則；
5. 反模式目錄，包括 Everything-is-SMS、Plugin-folder fallacy、FMS dead documentation、Router god object、DMS owns business state、TMS hidden dependency、Configuration without authority、Self-approving agent、Silent architecture repair 與 Version impact blindness。

### 完成門檻

- 未參與開發者可依文件完成分層；
- 獨立使用者的分類差異可被解釋；
- 方法論列出適用域與不適用域；
- 分類爭議具有處理流程。

---

## 5.5 v0.6：Generality Validation

### 目標

用異質案例驗證 MSSP 的通用性。

| 類型 | 驗證重點 |
|---|---|
| CLI 工具 | 最小閉合、可選命令 |
| Web 應用 | 前後端、資料、部署 |
| AI Agent 系統 | Router、權限、DMS |
| 遊戲／世界系統 | 狀態、事件、模組載入 |
| 資料處理管線 | 任務子集、失敗重跑 |
| 微服務 | 跨服務邊界與多倉庫 |
| 桌面應用 | Runtime、更新、插件 |

每個案例必須回答 FMS、SMS、TMS、Router、DMS、SCL、裁剪規則、不適用規則與是否需要領域 Profile。

### 完成門檻

- 至少五個異質案例；
- 至少兩個案例由第三方完成；
- 公開至少三個不適用或需裁剪場景；
- 建立 Profile 機制，而不是強迫所有系統使用所有層。

---

## 5.6 v0.7：Scale and Evolution

### 目標

支援大型、長期、跨倉庫與巢狀系統。

```text
Organization MSSP
├── Product MSSP
│   ├── Service MSSP
│   └── Tool MSSP
└── Research MSSP
```

### 必要交付物

- Nested MSSP；
- 全域 module id、repository id、namespace、ownership 與 dependency trust；
- lifecycle：experimental、active、stable、deprecated、frozen、replaced、retired；
- migration graph：replacement、split、merge、rename、externalize、internalize、upgrade、downgrade、rollback；
- architecture drift：文件漂移、依賴漂移、權限漂移、核心膨脹、TMS 僭位與 Router 集權。

### 完成門檻

- 支援多倉庫與巢狀 MSSP；
- 支援生命週期與破壞性變更傳播；
- 至少一個大型真實專案完成遷移。

---

## 5.7 v0.8：Multi-subject and AI Governance

### 目標

正式處理多人、多 Agent 與半自主系統中的權限、責任與批准。

至少區分 proposer、planner、executor、validator、reviewer、approver 與 observer。高風險操作不得由同一主體壟斷全部角色。

每個 Agent 應聲明 identity、authority、accessible modules、allowed tools、forbidden actions、memory scope、write scope、review requirement、rollback capability 與 evidence obligation。

AI 可以提出架構分類，但必須提供證據、信心、反例、未知、替代分類與人類覆寫記錄。

### 完成門檻

- 高風險工作流具有角色分離；
- Agent 不能靜默修改 FMS；
- AI 分類不可無證據自動生效；
- 所有覆寫與批准可追溯；
- 至少一個多 Agent 系統通過治理驗證。

---

## 5.8 v0.9：Specification Freeze and Independent Reimplementation

### 目標

停止任意擴張核心概念，進入 1.0 候選階段。

### 必要交付物

- Core terminology freeze；
- Schema release candidate；
- Diagnostic Code Registry；
- implementation-neutral conformance suite；
- 至少一個非 TypeScript 獨立實作；
- Security and Threat Model。

診斷碼建議分區：

```text
MSSP_SCHEMA_*
MSSP_LAYER_*
MSSP_DEP_*
MSSP_FMS_*
MSSP_TMS_*
MSSP_SCL_*
MSSP_DMS_*
MSSP_ROUTER_*
MSSP_RUNTIME_*
MSSP_VT_*
```

### 完成門檻

- 核心語義凍結；
- 第二實作通過 conformance suite；
- 至少三種 Adapter 通過相同 fixture；
- migration guide 與威脅模型完成；
- 1.0 RC 公開測試。

---

## 5.9 v1.0：Stable Universal Method and Architecture Standard

MSSP 1.0 必須同時成為：

1. 可被人類採用的方法論；
2. 可被機器驗證的架構規格；
3. 可被不同語言獨立實作的互通標準；
4. 可治理執行與演化的契約體系。

### 1.0 必要條件

- 第三方可完成系統邊界、FMS、SMS／TMS、SCL、DMS、Router／Runtime 與版本演化設計；
- Schema、診斷碼、核心術語、擴充命名空間與相容性政策穩定；
- TypeScript 參考實作與至少一個獨立實作存在；
- SCL 可執行、DMS 證據可驗證、高風險流程具有角色分離；
- migration、deprecation、nested MSSP、multi-repository 與 impact analysis 成立。

---

# 6. Conformance Model

MSSP 1.0 建議採分級符合性。

## Level 1：MSSP-Documented

FMS、module index、system boundary 與 layer declarations 存在。

## Level 2：MSSP-Validated

Schema、dependency rules、layer path、unique identity 與 diagnostics 通過。

## Level 3：MSSP-Isolated

每個 TMS 通過 island test，外部工具可 mock，failure mode 與 safe failure 可驗證。

## Level 4：MSSP-Governed

具備 SCL、權限、review boundary、architecture-changing PR、MSSP-VT 與 role separation。

## Level 5：MSSP-Observable

具備 DMS events、artifacts、route evidence、validation result 與 limitation disclosure。

## Level 6：MSSP-Evolvable

具備 lifecycle、migration、impact graph、nested／multi-repository 與 compatibility policy。

## Level 7：MSSP-Interoperable

具備中立模型、Adapter、conformance suite、第二實作與等價診斷。

---

# 7. 相容性與版本政策

## 7.1 0.x 階段

允許調整 Schema、CLI、診斷、術語與層級規則，但每次破壞性變更必須附 migration note、changelog、fixture 更新、理由與替代方案。

## 7.2 1.x 階段

- required core field 不得在 1.x 移除；
- 診斷碼不得重新賦予不同意義；
- 新欄位優先為 optional；
- 新能力透過 extension namespace；
- deprecated 欄位至少保留一個 minor cycle；
- 破壞核心語義的修改進入 2.0。

## 7.3 Extension Namespace

```yaml
extensions:
  org.evemisslab.aismbi:
    ...
  org.evemisslab.eml:
    ...
  com.example.godot:
    ...
```

研究模組不應直接污染 Core Schema。

---

# 8. MSSP 與 EML 的關係

依賴方向固定為：

```text
MSSP Core
    ↑
EML MSSP Adapter
    ↑
EML CLI / LSP / Studio / MCP
```

MSSP Core 不得依賴 EML AST、parser、runtime、emitter、Cogni-Editor 或 MCP。EML 是 MSSP 的第一級官方宿主，但不是 MSSP 本體。

---

# 9. AISMBI 與 MCL 的位置

AISMBI 與 MCL 應作為 MSSP Research Modules：

```text
MSSP Research
└── AISMBI
    ├── Memory Contract Language
    ├── ownership inference
    ├── memory-bound inference
    ├── runtime profiling
    ├── contract feedback
    └── test generation
```

它們可與 FMS、CVL、MSSP-D、MSSP-VT 與 Runtime 深度整合，但未採用 AISMBI 的系統仍應能完整符合 MSSP 1.0。

---

# 10. 主要風險與失敗模式

| 風險 | 說明 | 對策 |
|---|---|---|
| Everything-is-SMS | 所有重要功能都進核心 | 反事實必要性與降格機制 |
| FMS 文件死亡 | FMS 成為過時 README | PR 強制 review 與 drift check |
| 自動分類僭越 | AI 無證據修改層級 | suggestion、confidence、evidence、counterexample |
| Router God Object | 所有邏輯集中 Router | Router 只選擇與協調 |
| DMS 擁有業務狀態 | 診斷層成為第二核心 | 優先 append-only evidence |
| TMS 隱藏耦合 | 表面可插拔、實際互相依賴 | island test、dependency closure |
| TypeScript 綁定 | 其他語言無法實作 | 中立模型、第二實作、fixtures |
| 過度普適化 | 所有系統被迫使用全部層 | Profile、裁剪與不適用域 |

---

# 11. 發布與治理

## 11.1 建議倉庫結構

```text
mssp-core/
├── spec/
├── schemas/
├── src/
├── tests/
├── conformance/
├── adapters/
├── examples/
├── docs/
├── profiles/
├── rfcs/
└── research/
```

## 11.2 RFC 流程

新核心層級、依賴方向、FMS 定義、SMS／TMS 判準、conformance level、核心 Schema 或破壞性診斷語義，都必須經 RFC。

RFC 應包含問題、動機、替代方案、相容性、migration、安全風險、反例，以及是否應留在 extension。

## 11.3 Core 新增判準

1. 是否跨領域必要？
2. 是否能被機器驗證？
3. 是否能被第二實作重現？
4. 是否已在至少兩個案例中成立？
5. 是否可以留在 extension？
6. 是否會增加不必要核心複雜度？

---

# 12. 里程碑總表

| 版本 | 核心問題 | 主要完成判準 |
|---|---|---|
| 0.1 | 能否形式化？ | Schema、CLI、驗證、island |
| 0.2 | 能否讀懂既有專案？ | scanner、分類證據、diff impact |
| 0.3 | 能否跨語言？ | 中立模型、Adapter、視覺圖 |
| 0.4 | 能否治理執行？ | Router、SCL、DMS、snapshot |
| 0.5 | 能否教學？ | 方法論、判定程序、反模式 |
| 0.6 | 是否真的通用？ | 異質案例、Profile、不適用域 |
| 0.7 | 能否跨尺度演化？ | nested、multi-repo、migration |
| 0.8 | 能否治理 AI／多主體？ | role separation、Agent contract |
| 0.9 | 能否被獨立重做？ | spec freeze、第二實作、suite |
| 1.0 | 能否成為穩定標準？ | 相容承諾、互通、治理、演化 |

---

# 13. 後續工作接口

為了讓後續對話或 Agent 可直接接續，工作拆成以下獨立 Workstream：

## Workstream A：v0.2 Repository Scanner

輸入 Git repository、package metadata 與 source tree；輸出 candidate module graph、evidence、classification suggestions 與 FMS drift report。

## Workstream B：Diagnostic Protocol

輸出 stable code registry、JSON Schema、IDE format、Agent format 與 severity policy。

## Workstream C：MSSP Intermediate Model

輸出 language-neutral model、adapter interface、serialization 與 conformance fixtures。

## Workstream D：Methodology Handbook

輸出 system boundary questionnaire、SMS／TMS decision procedure、promotion／demotion rules 與 anti-pattern catalogue。

## Workstream E：Conformance Suite

輸出 implementation-neutral fixtures、expected diagnostics 與 versioned compatibility matrix。

## Workstream F：EML Adapter

將 EML AST、CTS、semantic model 與 trace 轉為 MSSP neutral graph、module suggestions、DMS event 與 CLI integration。

---

# 14. 下一階段建議

最合理的正式開發順序是：

```text
1. Diagnostic Protocol v0.2
2. MSSP Intermediate Model
3. Repository Scanner
4. Evidence-backed Classification
5. FMS / Code Drift Detection
6. Git Diff Impact
7. EML Adapter
```

診斷協定是 IDE、Agent、CI 與 Adapter 的共同出口；中立模型是跨語言地基；Scanner 需要穩定模型與診斷；AI 分類只能建立在可追溯證據之上；EML Adapter 應連接中立模型，而不是直接綁死 MSSP Core。

---

# 15. 結論

MSSP v0.1 已證明，一套架構方法可以同時擁有哲學判準、文件結構、Schema、CLI、測試與 CI。

MSSP 1.0 的真正完成，不是把所有構想全部實作，而是：

> 讓 MSSP 從「原作者知道如何使用的架構思想」，變成「任何第三方都能獨立理解、採用、驗證、重新實作與長期演化的通用標準」。

其核心完成線是：

```text
人能理解
機器能驗證
不同語言能實作
不同系統能裁剪
多主體能治理
大型系統能演化
第三方不必詢問原作者
```

最終原則：

> **核心必須穩定，子集必須可替換，設定必須有權限，執行必須有證據，架構必須能被驗證，系統必須保有演化能力。**

---

# 附錄 A：版本一句話定義

```text
v0.1：MSSP 可以被寫出來並被驗證。
v0.2：MSSP 可以讀懂既有 repository。
v0.3：MSSP 可以跨語言與工具互通。
v0.4：MSSP 可以治理執行中的系統。
v0.5：MSSP 可以被教學並重複採用。
v0.6：MSSP 的通用性被異質案例驗證。
v0.7：MSSP 可以治理大型系統的長期演化。
v0.8：MSSP 可以治理 AI 與多主體協作。
v0.9：MSSP 可以被第三方獨立重新實作。
v1.0：MSSP 成為穩定、可互通、可演化的通用方法與架構標準。
```

# 附錄 B：1.0 不必等待的項目

以下項目未完成，不阻止 MSSP 1.0：

- 所有語言 Adapter；
- 所有 IDE；
- 所有視覺化功能；
- 完整 AISMBI；
- 完整 MCL；
- 自動架構修復；
- 自動模組升降格；
- 全自動 AI 架構師；
- 所有領域 Profile；
- 所有 Runtime 平台。

# 附錄 C：文件接續標記

下一輪可直接從以下任一項展開：

```text
[ ] 定義 MSSP Diagnostic Protocol v0.2
[ ] 定義 MSSP Intermediate Model
[ ] 設計 Repository Scanner
[ ] 設計 Evidence-backed Classification
[ ] 設計 FMS / Code Drift Detection
[ ] 設計 MSSP-VT Git Diff Impact
[ ] 設計 EML Adapter
[ ] 編寫 MSSP Methodology Handbook
[ ] 建立 Conformance Suite
[ ] 建立 RFC 流程
```
