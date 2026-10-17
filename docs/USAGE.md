# 使用指南

[返回首页](../README.md)

## 先选模型来源：DeepSeek 在前，Codex 在后

两条路线共用同一个用户脚本，也都可以选择“快速提交 / 模拟输入”。这里将 ChatGPT 订阅路线称为 **Codex / ChatGPT 订阅**，实际设置页的来源名称是“ChatGPT 订阅”。它通过本地辅助程序调用模型；Codex CLI 单独用于可选额度查询。

## 1. DeepSeek：导入脚本，填 Key 即可开始

1. 浏览器安装脚本猫，从完整解压的项目中导入 `pta-luna.user.js`，停用重复版本。
2. 进入 PTA 题目页，打开“解题模型设置”，模型来源选择 **DeepSeek API**。
3. 填自己的 DeepSeek API Key，选择模型并保存；是否记住 Key 由你决定。
4. 先用一道允许使用辅助工具的练习题核对题面、生成代码与判题结果，再决定是否处理题集。

**只用 DeepSeek 答题无需安装 Python、本地辅助程序、Node.js 或 Codex CLI。** Key、余额和网络需可用；接口按服务商规则计费。要额外显示 Codex 额度时，再配置后面的本地组件。

## 2. Codex / ChatGPT 订阅：配置本地辅助程序

### 2.1 安装 Python 并启动

Windows 需要 Python 3.10+，安装时启用 Add python.exe to PATH。浏览器安装脚本猫，完整解压项目到固定目录，双击 `start-windows.cmd`。首次启动会创建 `.venv` 并安装 `requirements.txt` 中的依赖；保持控制台开启。

辅助程序管理页只在本机访问，默认地址 `http://127.0.0.1:1455`。自动打开的链接包含管理口令，请勿分享。管理页新开标签后无法使用时，关闭并重启辅助程序，让它重新打开页面。

其他系统可在项目目录手动运行（未提供一键启动器，需自行验证兼容性）：

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python bridge.py --port 1455
```

### 2.2 ChatGPT 登录与最小测试

在管理页点击 Continue with ChatGPT，在上游授权页面选择自己的账号和工作区，并确认订阅使用权限。程序不会要求把 ChatGPT 密码填入脚本。

先读取账号模型目录，选择模型和推理强度，再发送一次最小测试。实际成功回执才能确认该次调用可用，目录可见不等于所有请求都有权限。测试也会产生用量。

账号是否开放本地订阅授权、可用模型及相应限额取决于服务端。失败时查看脱敏错误，不要反复登录或连续生成。

### 2.3 用户脚本安装与本机配对

在脚本猫导入项目根目录的 `pta-luna.user.js`。它与原脚本使用同名 namespace，请更新原脚本并停用重复版本。

进入 `https://pintia.cn/problem-sets/…` 页面，打开「解题模型设置」：

1. 选择 ChatGPT 订阅。
2. 填入管理页中的本机地址和配对码。配对码不是 OAuth token，也不是 API Key。
3. 点击「读取账号模型并检查连接」。页面初始可能只显示默认 Luna；这个按钮才会刷新完整目录。
4. 手动选择模型、推理强度和自动修正上限，保存。

任务运行时先停止，再修改模型。设置影响下一次请求。管理页里的测试模型选择与 PTA 脚本设置相互独立。

至此可验证 ChatGPT 订阅答题。若还要在桌宠中查看 Codex 额度，再按 [Node.js 与 Codex CLI 从零配置](CODEX_SETUP.md) 安装、登录 CLI 并实际查询；缺少 CLI 不会阻止本路线生成答案。

## 3. 两种答题模式与日常使用

“快速提交”在取得代码后走 PTA 接口提交并查询回执，适合减少页面操作；“模拟输入”分段写入页面编辑器、逐段读回核对，再点击 PTA 原生提交按钮，适合检查可见的录入过程。后者仍会自动提交。程序填空使用专门的填空处理流程。详细原理与场景对比见 [首页双模式说明](../README.md#两种答题模式怎么选)。

先用一题确认题目、题图、代码和判题结果，再使用题集处理。可选快速提交与模拟输入；函数题、程序填空会保留对应接口和框架。

ChatGPT 路线默认自动修正 3 次（不含首次生成），可选 0～10。达到修正上限会记录结果并可继续下一题；遇到额度、权限、网络或格式错误会停止本轮，并暂停新推理请求。处理问题后在管理页解除暂停，再手动开始。

DeepSeek 路线保留既有重试规则，部分错误没有固定重试上限。主动观察状态，必要时点停止。

停止任务会停止后续页面操作并请求取消本地排队/执行中的推理，但已经开始的服务端计算仍可能产生消耗。不要将停止理解为退款。

## 4. Codex 真实额度（可选）

**还没安装 Node.js 或 Codex CLI？先看 [Windows 从零配置 Codex](CODEX_SETUP.md)。** 它包含安装、版本检查、登录、PATH 刷新和最终额度卡片验证，覆盖实际遇到的这两个环境缺失问题。

电脑上安装支持 app-server 的 Codex CLI，并用与辅助程序相同的 ChatGPT 账号登录。按照 [官方 CLI 文档](https://developers.openai.com/codex/cli) 安装。已有 Node.js/npm 时可使用：

```powershell
npm.cmd install -g @openai/codex@latest
codex.cmd --version
codex.cmd login
codex.cmd login status
codex.cmd app-server --help
```

不要为安装而修改整个磁盘的权限。若默认 npm 全局目录无法写入，可选择当前用户目录：

```powershell
& {
    $codexDir = "$env:LOCALAPPDATA\Programs\Codex"
    npm.cmd install -g @openai/codex@latest --prefix "$codexDir"
    if ($LASTEXITCODE -ne 0) { return }
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (($userPath -split ';') -notcontains $codexDir) {
        [Environment]::SetEnvironmentVariable('Path', "$codexDir;$userPath", 'User')
    }
    $env:Path = "$codexDir;$env:Path"
    & "$codexDir\codex.cmd" --version
    & "$codexDir\codex.cmd" login
}
```

先安装 Node.js LTS 才有 npm。登录成功后完全关闭旧辅助程序，重启使其获得新的 PATH。必要时从新开的 PowerShell 启动 `start-windows.cmd`。

右键桌宠 → 消耗体力 → Codex 额度。查询只调用 app-server 的 initialize、account/read 和 account/rateLimits/read，不生成答案，不读取 Codex auth.json；邮箱不一致时拒绝展示。工作区不能独立核验，需要时自行在官方用量页确认。

- 百分比是剩余额度。
- 括号是相较上次查询的剩余额度变化，单位为百分点。
- 同一窗口、同一重置时间才比较；首次或重置后显示（—）。
- 15 秒内使用带标记的缓存。
- 这是账号整体变化，可能包含其他设备或应用，不是本脚本单独扣减。

## 5. DeepSeek 费用与 token

费用按接口返回的完整 usage、缓存明细和代码中已核实单价计算人民币参考区间。覆盖已知 Flash 别名和 V4 Pro；新模型单价未核实时显示未知。上下界用于涵盖高峰、空闲和缓存明细缺失等情况，不代表最终账单。

统计存放在本标签页 sessionStorage，同一标签页刷新后保留；关闭标签页、开启其他标签页、管理页测试或其他设备不会自动合并。未取得完整用量的失败、断流和取消可能已产生费用，但不能补算成准确金额。

输入/输出 token 与订阅额度百分比是不同指标，不能简单换算。若账号以美元结算，应以服务商实际账单为准。

## 6. 升级与恢复

从 1.2.0 升级本次 1.2.1，只更新用户脚本并刷新页面。更早版本请停止任务、关闭旧辅助程序，再覆盖 `bridge.py`、`manager.html`、启动器、依赖清单与用户脚本。保留 `.venv` 和本机授权凭据，不必为界面升级重新登录。

需恢复旧脚本时，停用新版并导入 `original/pta-original-0.8.10.user.js`。旧版不包含新的订阅授权和用量卡片。不要同时启用两个版本。

## 实现依据

- [本地/开源应用订阅授权](https://developers.openai.com/siwc/token-sharing-open-source)
- [模型与推理](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Codex app-server](https://learn.chatgpt.com/docs/app-server)
- [DeepSeek 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)

上游协议、价格与模型支持会变动，当前实现与这些文档不一致时以实际响应和上游说明为准。
