# Godot Adapter v0.3 使用與權限邊界

Godot Adapter 將外部 Godot-aware 工具產生的版本化 Semantic Export，轉換成 MSSP Intermediate Model。

```text
Godot-aware exporter
      ↓ godot-mssp-export v0.3
MSSP Godot Adapter
      ↓
Intermediate Model v0.2
```

## 命令

```bash
mssp adapt godot examples/godot-adapter/semantic-export.json \
  --revision HEAD \
  --out godot-intermediate-model.json
```

簡寫：

```bash
mssp adapt gd semantic-export.json --out godot-model.json
```

穩定 Adapter ID：

```text
godot-mssp-export
```

## 這不是 Godot Editor 或 Runtime

Reference Adapter 不會：

- 啟動 Godot Editor、Headless Editor、Game Runtime、Debugger、Importer 或 Exporter；
- 載入或實例化 scene、node、script、resource、autoload、singleton、addon 或 plugin；
- 執行 GDScript、C#、GDExtension、tool script、native library 或 plugin callback；
- 讀取本機 `.godot` cache、Editor Settings、環境變數或部署目標；
- 動態解析 scene inheritance、signal、group、resource dependency；
- 修改 `project.godot`、scene、script、resource 或 MSSP manifest；
- 自動分類、批准、註冊、啟動或部署 Module。

Adapter 只驗證並轉換已提供的 JSON Export。

## Godot 資訊不等於架構授權

下列資料可以保存，但只屬來源 Metadata：

```text
engine version
renderer
main scene
project feature
scripting language
scene path
script path
class name
base type
node type
resource type
autoload name
plugin name / enabled state
signal
group
```

它們都不等於 MSSP Module declaration。

因此，即使某個 Script 被設為 Autoload，某個 Addon 已啟用，或某個 Scene 是 Main Scene，也不能推導：

```text
MSSP layer
permissions
risk level
compatibility
change impact
activation approval
runtime authority
```

## Module 與 Candidate

只有完整、明確的 `declaration` 才會映射成正式 Intermediate Module。

缺少 declaration 時，component 固定成為：

```text
candidate.godot.<component-id>
status: unclassified
autoPromotion: false
```

scene、node、script、autoload、singleton、addon、editor plugin、resource、service 與 test 都適用相同規則。

不完整 declaration 會直接被 Schema 拒絕；Adapter 不會自行補完契約。

## Godot Identity

每個 component 必須提供 Exporter 產生的穩定 `godotIdentity`，例如：

```text
res://scenes/world.tscn
res://addons/dialogue/plugin.cfg#Dialogue
autoload:Telemetry=res://scripts/telemetry.gd
```

Adapter 會拒絕：

- 重複 component ID；
- 重複 Godot identity；
- 絕對本機 source path；
- 不完整或不符合 Schema 的 declaration。

`godotIdentity` 是來源身分，不是 Module ID，也不是執行授權。

## Metadata 映射

專案層級可保存：

| Godot Export | Intermediate metadata |
|---|---|
| `engineVersion` | `godotEngineVersion` |
| `renderer` | `godotRenderer` |
| `mainScene` | `godotMainScene` |
| `projectFeatures` | `godotProjectFeatures` |
| `scriptingLanguages` | `godotScriptingLanguages` |

Component 層級可保存：

| Godot Export | Intermediate metadata |
|---|---|
| `godotIdentity` | `godotIdentity` |
| `scenePath` | `godotScenePath` |
| `scriptPath` | `godotScriptPath` |
| `className` | `godotClassName` |
| `baseType` | `godotBaseType` |
| `nodeType` | `godotNodeType` |
| `resourceType` | `godotResourceType` |
| `autoloadName` | `godotAutoloadName` |
| `pluginName` | `godotPluginName` |
| `pluginEnabled` | `godotPluginEnabled` |
| `signals` | `godotSignals` |
| `groups` | `godotGroups` |
| `godotKind` | `godotComponentKind` |

Array 會去重並依字典順序排序，以維持可重現輸出。

## 關係來源

只有完整 declaration 能建立：

```text
requirements.modules    → requires
changeImpact.affects    → affects
changeImpact.affectedBy → affected-by
```

以下 Godot 結構不會自動成為正式 MSSP relation：

```text
scene inheritance
node ownership
script attachment
signal connection
group membership
autoload registration
plugin enabled state
resource reference
preload / load
名稱或目錄接近程度
```

它們可以作為後續 Scanner 或 compiler-grade Adapter 的 Evidence，但 Evidence 不等於 Declaration。

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
輸入符合 Godot Export Schema
＋
轉換結果符合 Intermediate Model Schema
＋
Adapter Conformance 通過
```

它不代表：

- 專案可被 Godot 正確開啟、匯入、執行或匯出；
- Scene 與 Resource 一定可載入；
- Signal、Group、Inheritance、Autoload 或 Plugin 設定正確；
- GDScript、C#、GDExtension 或 Native Code 安全；
- Module 已獲 SCL 批准；
- Runtime 可以載入或部署。

## 與未來 Runtime 的區別

Godot Adapter 屬於 v0.3 跨語言與引擎表示層。

真正的 Godot Runtime bridge、DMS event transport、scene execution、live editor integration 或 deployment governance，屬於後續 Runtime／Governance 階段，不能與本 Adapter 混為一談。
