# Rust Adapter v0.3 使用與權限邊界

Rust Adapter 將外部 Rust 工具鏈產生的版本化 Semantic Export，轉換成 MSSP Intermediate Model。

```text
Rust-aware exporter
      ↓ rust-mssp-export v0.3
MSSP Rust Adapter
      ↓
Intermediate Model v0.2
```

## 命令

```bash
mssp adapt rust examples/rust-adapter/semantic-export.json \
  --revision HEAD \
  --out rust-intermediate-model.json
```

也可以使用簡寫：

```bash
mssp adapt rs semantic-export.json --out rust-model.json
```

穩定 Adapter ID：

```text
rust-mssp-export
```

## 這不是 Cargo 或 Rust Compiler

Reference Adapter 不會：

- 執行 `cargo metadata`、`cargo build`、`cargo test` 或 `cargo run`；
- 執行 `rustc`、`rustup`、Linker 或 Package Manager；
- 執行 build script 或 procedural macro；
- 載入、連結或執行 crate；
- 讀取本機 Cargo registry、target directory、Git checkout 或環境變數；
- 下載或解析 dependency；
- 修改 Cargo.toml、Rust 原始碼或 MSSP manifest；
- 自動分類、批准、註冊或啟動 Module。

Adapter 只驗證並轉換已提供的 JSON Export。

## Cargo 資訊不等於架構授權

下列資訊可以被保存，但只屬於來源證據：

```text
workspace
package
crate
library / binary target
crate root
crate type
feature
edition
rust-version
toolchain channel
target triple
```

它們都不等於 MSSP Module declaration。

即使 Cargo 可以建置或執行某個 binary，也不能因此推導：

```text
MSSP layer
permissions
risk level
compatibility
change impact
activation policy
runtime approval
```

## Module 與 Candidate

只有完整、明確的 `declaration` 才會映射為正式 Intermediate Module。

缺少 declaration 時，component 固定成為：

```text
candidate.rust.<component-id>
status: unclassified
autoPromotion: false
```

即使來源宣稱它是 service、plugin、library、binary 或 proc-macro，結果也不會改變。

不完整 declaration 會被 Schema 拒絕；Adapter 不會自行補完契約。

## Rust metadata 映射

專案層級可保存：

| Rust Export | Intermediate metadata |
|---|---|
| `workspaceName` | `rustWorkspaceName` |
| `cargoResolver` | `rustCargoResolver` |
| `rustVersion` | `rustVersion` |
| `edition` | `rustEdition` |
| `toolchainChannel` | `rustToolchainChannel` |

Component 層級可保存：

| Rust Export | Intermediate metadata |
|---|---|
| `cargoIdentity` | `rustCargoIdentity` |
| `packageName` | `rustPackageName` |
| `crateName` | `rustCrateName` |
| `targetName` | `rustTargetName` |
| `crateRoot` | `rustCrateRoot` |
| `edition` | `rustEdition` |
| `crateTypes` | `rustCrateTypes` |
| `features` | `rustFeatures` |
| `targetTriples` | `rustTargetTriples` |
| `rustKind` | `rustComponentKind` |

Array 會去重並依字典順序排序，確保輸出可重現。

## Cargo Identity

每個 component 必須提供由 Exporter 產生的穩定 `cargoIdentity`，例如：

```text
workspace:editor/package:renderer/target:lib
workspace:editor/package:server/target:bin:editor-server
```

Adapter 會拒絕：

- 重複 component ID；
- 重複 Cargo identity；
- 絕對本機 source path；
- 不符合 Schema 的不完整 declaration。

`cargoIdentity` 是來源身分，不是 MSSP Module ID，也不是執行授權。

## 關係來源

只有完整 declaration 能建立：

```text
requirements.modules    → requires
changeImpact.affects    → affects
changeImpact.affectedBy → affected-by
```

下列資訊不會自動成為正式 MSSP relation：

```text
Cargo dependencies
feature activation
use statement
crate import
workspace membership
build dependency
proc-macro usage
目錄位置或名稱相似度
```

這些資料可由 Scanner 或後續 compiler-grade adapter 作為 evidence，但 evidence 不等於 declaration。

## 安全語義

Adapter 固定聲明：

```json
{
  "deterministic": true,
  "readOnly": true,
  "noExecution": true,
  "noNetwork": true,
  "autoPromotion": false,
  "autoMutation": false
}
```

有效輸出只代表：

```text
輸入符合 Rust Export Schema
＋
轉換結果符合 Intermediate Model Schema
＋
Adapter Conformance 通過
```

它不代表：

- 專案能成功編譯或連結；
- Export 與當前 Cargo graph 完全一致；
- feature 組合完整；
- build script／proc macro 安全；
- crate 沒有 unsafe 行為；
- 模組已獲 SCL 批准；
- Runtime 可以載入或部署。

## 與 Rust Kernel 的區別

Rust Adapter 屬於 v0.3 的跨語言表示層。

未來的 Rust State Store、Event Bus、Scheduler、Transaction 或 Networking，屬於 v0.4 之後的 Runtime／Kernel 實作，不能與本 Adapter 混為一談。
