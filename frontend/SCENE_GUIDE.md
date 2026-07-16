# 寻仙 - Cocos Creator 场景搭建指南

> 本指南详细描述如何在 Cocos Creator 3.8.8 编辑器中搭建 3 个游戏场景。
> 每个步骤都可以在 Qoder 中执行，按顺序逐步操作即可。

---

## 前置准备

### 确认脚本已识别

1. 在左侧 **资源管理器** 中找到 `assets > scripts` 目录
2. 确认能看到以下脚本文件（带蓝色 TS 图标）：
   - `GameManager.ts`
   - `scene > LoginPanel.ts`
   - `scene > CharacterCreatePanel.ts`
   - `scene > Hall > HallScene.ts`
   - `scene > Hall > HallUI.ts`
   - `scene > Hall > PlayerEntity.ts`
   - `scene > Hall > NPCEntity.ts`

---

## 场景一：Login 登录场景

### 步骤 1.1：创建场景文件

1. 在 **资源管理器** 中右键 `assets` 文件夹 → **新建** → **文件夹** → 命名 `scenes`
2. 右键 `scenes` 文件夹 → **新建** → **Scene** → 命名 `Login`
3. 双击 `Login.scene` 打开该场景

### 步骤 1.2：设置 Canvas 适配

1. 在 **层级管理器** 中点击 `Canvas` 节点
2. 在右侧 **属性检查器** 中确认 Canvas 组件的 Design Resolution 为 `1280 x 720`
3. 设置 Fit Height = true, Fit Width = true

### 步骤 1.3：添加深色背景

1. 右键 `Canvas` → **创建** → **空节点** → 命名 `Background`
2. 给 `Background` 添加 **Sprite** 组件（添加组件 → 搜索 Sprite）
3. 在 Sprite 组件中：
   - Size Mode 选 `CUSTOM`
   - 设置 Size: Width=1280, Height=720
   - Color: 深色 `#1A1A2E`（暗色仙侠风底色）

### 步骤 1.4：添加标题 Label

1. 右键 `Canvas` → **创建** → **UI** → **Label** → 命名 `TitleLabel`
2. 属性设置：
   - String: `寻仙`
   - Font Size: `80`
   - Color: 金色 `#D4A843`
   - Position: X=0, Y=180
3. 脚本中 `titleLabel` 将自动设置这些值，但初始值保持一致

### 步骤 1.5：添加标语 Label

1. 右键 `Canvas` → **创建** → **UI** → **Label** → 命名 `SloganLabel`
2. 属性设置：
   - String: `一念成仙，万界诡谲`
   - Font Size: `24`
   - Color: 灰色 `#888888`
   - Position: X=0, Y=100

### 步骤 1.6：添加版本号 Label

1. 右键 `Canvas` → **创建** → **UI** → **Label** → 命名 `VersionLabel`
2. 属性设置：
   - String: `v0.1.0-alpha`
   - Font Size: `16`
   - Color: 灰色 `#666666`
   - Position: X=0, Y=-300（底部）

### 步骤 1.7：添加服务器状态 Label

1. 右键 `Canvas` → **创建** → **UI** → **Label** → 命名 `ServerStatusLabel`
2. 属性设置：
   - String: `检测中...`
   - Font Size: `18`
   - Color: 灰色 `#888888`
   - Position: X=0, Y=-260

### 步骤 1.8：添加微信登录按钮

1. 右键 `Canvas` → **创建** → **UI** → **Button** → 命名 `WxLoginBtn`
2. 给按钮内的 Label 子节点设置：
   - String: `微信一键登录`
   - Color: 白色
3. 按钮背景色：翠绿色 `#2ECC71`
4. Position: X=0, Y=0
5. Size: Width=280, Height=60

### 步骤 1.9：添加手机号登录按钮

1. 右键 `Canvas` → **创建** → **UI** → **Button** → 命名 `PhoneLoginBtn`
2. 按钮内 Label 设置：
   - String: `手机号登录`
3. 按钮背景色：金色 `#D4A843`
4. Position: X=0, Y=-80
5. Size: Width=280, Height=60

### 步骤 1.10：添加绑定手机号弹窗面板

1. 右键 `Canvas` → **创建** → **空节点** → 命名 `BindPhonePanel`
2. 给 `BindPhonePanel` 添加 Sprite 组件作为半透明遮罩背景：
   - Color: `#00000099`（半透明黑）
   - Size: 1280 x 720
3. 在 `BindPhonePanel` 下创建子节点：
   - **PhoneInput**：创建 → UI → EditBox，命名 `PhoneInput`
     - Placeholder: `请输入手机号`
     - Max Length: `11`
     - Position: X=0, Y=40
   - **CodeInput**：创建 → UI → EditBox，命名 `CodeInput`
     - Placeholder: `请输入验证码`
     - Max Length: `6`
     - Position: X=-60, Y=-20
   - **SendCodeBtn**：创建 → UI → Button → 命名 `SendCodeBtn`
     - Label 文字: `获取验证码`
     - Position: X=100, Y=-20
     - ⚠️ 注意：`sendCodeBtnLabel` 绑定的是这个按钮内的 Label 组件
4. **重要**：在属性检查器中将 `BindPhonePanel` 的 Active 取消勾选（默认隐藏）

### 步骤 1.11：添加跨平台确认弹窗

1. 右键 `Canvas` → **创建** → **空节点** → 命名 `ConfirmBindPanel`
2. 同样添加半透明遮罩背景
3. 在内部创建一个 Label 子节点用于显示确认文字
4. 将 `ConfirmBindPanel` 的 Active 取消勾选（默认隐藏）

### 步骤 1.12：添加 Toast 提示

1. 右键 `Canvas` → **创建** → **UI** → **Label** → 命名 `ToastLabel`
2. 属性设置：
   - String: 空
   - Font Size: `20`
   - Color: 白色
   - Position: X=0, Y=280（顶部）
3. 取消勾选 Active（默认隐藏，代码中会显示）

### 步骤 1.13：挂载 LoginPanel 脚本并绑定属性

1. 选中 `Canvas` 节点
2. 在 **属性检查器** 底部点击 **添加组件** → 搜索 `LoginPanel` → 添加
3. 在 LoginPanel 组件面板中，逐一拖拽绑定：

| 属性名 | 类型 | 拖入的节点 |
|--------|------|-----------|
| `titleLabel` | Label | `TitleLabel` 节点 |
| `sloganLabel` | Label | `SloganLabel` 节点 |
| `versionLabel` | Label | `VersionLabel` 节点 |
| `serverStatusLabel` | Label | `ServerStatusLabel` 节点 |
| `wxLoginBtn` | Node | `WxLoginBtn` 节点 |
| `phoneLoginBtn` | Node | `PhoneLoginBtn` 节点 |
| `bindPhonePanel` | Node | `BindPhonePanel` 节点 |
| `phoneInput` | EditBox | `BindPhonePanel > PhoneInput` 节点 |
| `codeInput` | EditBox | `BindPhonePanel > CodeInput` 节点 |
| `sendCodeBtnLabel` | Label | `BindPhonePanel > SendCodeBtn` 内的 Label 子节点 |
| `bindConfirmLabel` | Label | `BindPhonePanel` 内的提示 Label |
| `confirmBindPanel` | Node | `ConfirmBindPanel` 节点 |
| `toastLabel` | Label | `ToastLabel` 节点 |

4. 按 **Ctrl+S** 保存场景

### 步骤 1.14：设置为启动场景

1. 在资源管理器中找到 `scenes > Login`
2. 右键 → **设为启动场景**（这样点播放按钮时先进入登录页）

### 步骤 1.15：测试运行

1. 点击顶部 **▶ 播放按钮**
2. 浏览器应打开登录页面，显示"寻仙"标题和两个按钮
3. 如果控制台有红色报错，截图给我排查

---

## 场景二：CharacterCreate 角色创建场景

### 步骤 2.1：创建场景

1. 右键 `scenes` 文件夹 → **新建** → **Scene** → 命名 `CharacterCreate`
2. 双击打开

### 步骤 2.2：设置背景

同 Login 场景的步骤 1.2 和 1.3，添加 Canvas + 深色 Background

### 步骤 2.3：添加步骤标题和描述

1. 创建 Label `StepTitleLabel`：
   - String: `选择性别`，Font Size: 40，Color: 金色 `#D4A843`，Position: Y=250
2. 创建 Label `StepDescLabel`：
   - String: `选择你的修仙之路`，Font Size: 22，Color: 灰色，Position: Y=200

### 步骤 2.4：添加性别选择面板

1. 创建空节点 `GenderPanel`（Position: Y=0）
2. 在其下创建：
   - **MaleBtn**：Button 节点，Label="选择男性"，Position: X=-150
   - **FemaleBtn**：Button 节点，Label="选择女性"，Position: X=150
   - **MaleSelectedLabel**：Label 节点，初始文字为空，Position: X=-150, Y=-60
   - **FemaleSelectedLabel**：Label 节点，初始文字为空，Position: X=150, Y=-60

### 步骤 2.5：添加属性面板（默认隐藏）

1. 创建空节点 `AttrsPanel`，取消勾选 Active
2. 在其下创建 5 个 Label 子节点：
   - **AttrsJingLabel**：String=`精: 1`，Position: Y=60
   - **AttrsQiLabel**：String=`气: 0`，Position: Y=20
   - **AttrsShenLabel**：String=`神: 1`，Position: Y=-20
   - **AttrsLuckLabel**：String=`气运: 0`，Position: Y=-60
   - **AttrsSavvyLabel**：String=`悟性: 0`，Position: Y=-100
   - **AttrsHintLabel**：String=`初始属性由性别决定`，Color: 灰色，Position: Y=-150

### 步骤 2.6：添加命名输入

1. 创建 EditBox `NameInput`：
   - Placeholder: `输入角色名（2-8汉字）`
   - Max Length: 8
   - Position: Y=-180
2. 创建 Button `RandomNameBtn`：
   - Label: `随机取名`
   - Position: X=180, Y=-180

### 步骤 2.7：添加下一步按钮

1. 创建 Button `NextBtn`：
   - Label: `下一步`
   - 背景色: 金色 `#D4A843`
   - Position: Y=-250

### 步骤 2.8：添加创建动画面板（默认隐藏）

1. 创建空节点 `CreatingPanel`，取消勾选 Active
2. 在其下创建 Label `CreatingLabel`：
   - String: `踏入仙途...`
   - Font Size: 36
   - Color: 金色

### 步骤 2.9：添加 Toast

1. 创建 Label `ToastLabel`，同 Login 场景，取消勾选 Active

### 步骤 2.10：挂载脚本并绑定属性

1. 选中 Canvas → 添加组件 `CharacterCreatePanel`
2. 拖拽绑定：

| 属性名 | 类型 | 拖入的节点 |
|--------|------|-----------|
| `stepTitleLabel` | Label | `StepTitleLabel` |
| `stepDescLabel` | Label | `StepDescLabel` |
| `maleBtn` | Node | `GenderPanel > MaleBtn` |
| `femaleBtn` | Node | `GenderPanel > FemaleBtn` |
| `genderPanel` | Node | `GenderPanel` |
| `maleSelectedLabel` | Label | `GenderPanel > MaleSelectedLabel` |
| `femaleSelectedLabel` | Label | `GenderPanel > FemaleSelectedLabel` |
| `attrsPanel` | Node | `AttrsPanel` |
| `attrsJingLabel` | Label | `AttrsPanel > AttrsJingLabel` |
| `attrsQiLabel` | Label | `AttrsPanel > AttrsQiLabel` |
| `attrsShenLabel` | Label | `AttrsPanel > AttrsShenLabel` |
| `attrsLuckLabel` | Label | `AttrsPanel > AttrsLuckLabel` |
| `attrsSavvyLabel` | Label | `AttrsPanel > AttrsSavvyLabel` |
| `attrsHintLabel` | Label | `AttrsPanel > AttrsHintLabel` |
| `nameInput` | EditBox | `NameInput` |
| `randomNameBtn` | Node | `RandomNameBtn` |
| `nextBtn` | Node | `NextBtn` |
| `creatingPanel` | Node | `CreatingPanel` |
| `creatingLabel` | Label | `CreatingPanel > CreatingLabel` |
| `toastLabel` | Label | `ToastLabel` |

3. 按 **Ctrl+S** 保存场景

---

## 场景三：Hall 大厅场景

### 步骤 3.1：创建场景

1. 右键 `scenes` 文件夹 → **新建** → **Scene** → 命名 `Hall`
2. 双击打开

### 步骤 3.2：创建世界容器节点

1. 右键 `Canvas` → **创建** → **空节点** → 命名 `WorldNode`
   - 这是整个游戏世界的容器，会随角色移动而移动（相机跟随）
2. 在 `WorldNode` 下创建：
   - **GroundLayer**：空节点，添加 Graphics 组件（用于绘制地面网格）
     - 这是点击移动的事件接收层
   - **EntityContainer**：空节点
     - 所有玩家和 NPC 的实体节点都动态添加到这里面

### 步骤 3.3：创建相机节点

1. 选中场景自带的 `Main Camera`
2. 重命名为 `CameraNode`
3. 确保相机类型为 **ORTHO**（正交相机，2D 游戏用）

### 步骤 3.4：创建 HallUI 面板

1. 右键 `Canvas` → **创建** → **空节点** → 命名 `HallUINode`
2. 给 `HallUINode` 添加组件 `HallUI`
3. 在 `HallUINode` 下创建以下子节点：

**角色信息栏（左上角）：**
- **PlayerNameLabel**：Label，Position: X=-500, Y=300，Font Size: 22，Color: 金色
- **PlayerLevelLabel**：Label，Position: X=-500, Y=270，Font Size: 16，Color: 灰色
- **AttrsLabel**：Label，Position: X=-500, Y=240，Font Size: 14，Color: 灰色

**提示消息（顶部居中）：**
- **ToastLabel**：Label，Position: Y=300，取消 Active

**重连提示（顶部居中）：**
- **ReconnectLabel**：Label，Position: Y=260，String=`重连中...`，取消 Active

**聊天栏（左下角）：**
- **ChatLabel**：Label，Position: X=-400, Y=-300，Font Size: 14，Color: 白色，取消 Active

**功能入口容器（右下角）：**
- **FuncEntryContainer**：空节点，Position: X=500, Y=-200
  - 代码会自动在这里创建功能按钮（副本/阵营/背包等）

**快捷操作容器（底部居中）：**
- **QuickActionContainer**：空节点，Position: X=0, Y=-320
  - 代码会自动在这里创建快捷按钮（修炼/传送/好友等）

### 步骤 3.5：挂载 HallScene 脚本

1. 选中 `Canvas` → 添加组件 `HallScene`
2. 拖拽绑定：

| 属性名 | 类型 | 拖入的节点 |
|--------|------|-----------|
| `worldNode` | Node | `WorldNode` |
| `cameraNode` | Node | `CameraNode`（即 Main Camera） |
| `entityContainer` | Node | `WorldNode > EntityContainer` |
| `groundLayer` | Node | `WorldNode > GroundLayer` |
| `hallUI` | HallUI | `HallUINode`（HallUI 组件所在节点） |

3. 按 **Ctrl+S** 保存场景

---

## 场景切换配置

### 确认 SceneManager 中的场景名

打开 `assets/scripts/manager/SceneManager.ts`，确认场景名映射：
- `SceneName.Login` = `'Login'`
- `SceneName.CharacterCreate` = `'CharacterCreate'`
- `SceneName.Hall` = `'Hall'`

### 构建场景列表

1. 菜单 **项目** → **项目设置** → **项目数据** → **参与构建场景**
2. 确保 3 个场景都添加进去了：
   - `assets/scenes/Login`
   - `assets/scenes/CharacterCreate`
   - `assets/scenes/Hall`
3. 设置 `Login` 为 **启动场景**

---

## 快速验证清单

| 检查项 | 预期结果 |
|--------|---------|
| Login 场景点播放 | 显示"寻仙"标题 + 两个按钮 |
| 点"微信一键登录" | Toast 显示"正在登录..."（非微信环境会用模拟 code） |
| 点"手机号登录"（不填） | Toast 提示"请输入正确的手机号" |
| CharacterCreate 性别选择 | 点男/女后 0.5 秒自动切换到属性面板 |
| CharacterCreate 随机取名 | 点"随机取名"生成一个 2-4 字中文名 |
| Hall 场景进入 | 显示深色背景 + 角色 + NPC + 功能按钮 |
| Hall 点击地面 | 角色向点击位置移动 |

---

## 常见问题

**Q: 属性检查器中看不到脚本组件？**
A: 确认脚本文件在 `assets/scripts/` 下，且文件头有 `@ccclass` 装饰器。

**Q: 拖拽绑定时属性栏不出现？**
A: 先给 Canvas 添加组件，再在组件面板中找到对应属性槽位进行拖拽。

**Q: 播放后白屏？**
A: 检查控制台（底部 Console 标签），截图红色报错信息。

**Q: EditBox 不显示？**
A: EditBox 需要 Cocos Creator 内置的 UI 资源支持，确认项目已正确导入。
