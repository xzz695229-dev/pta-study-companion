# Windows 从零配置 Codex：先装环境，再验证额度查询

[返回首页](../README.md) · [项目使用指南](USAGE.md) · [排错](TROUBLESHOOTING.md)

**只用 DeepSeek？无需阅读这条安装路线，直接按 [使用指南开头的简短配置](USAGE.md) 导入脚本并填写自己的 Key。** Codex / ChatGPT 订阅的模型配置也在使用指南中；本文重点补齐 CLI 安装与额度查询。

这份教程针对实际遇到的两个起点：**没有安装 Node.js 环境，没有安装 Codex CLI**。下载本项目只会得到项目文件，不会自动安装这两个独立工具。以下采用 Windows PowerShell + npm 安装路线；这条路线需要先装 Node.js，Codex 官方的其他安装方式以官方文档为准。

目标是让你完成 CLI 安装、ChatGPT 登录与本项目的额度查询接入。它不是整个 Codex 开发生态的配置教程，不涵盖插件、MCP、IDE 或所有自定义模型服务。账号资格和网络仍需实际验证，不能承诺每台电脑一次成功。

## 先决定需要安装什么

| 目标 | 必需组件 |
| --- | --- |
| 只用 DeepSeek 答题 | 浏览器、脚本猫、用户脚本、自己的 DeepSeek API Key |
| 用 ChatGPT 订阅答题 | 浏览器、脚本猫、用户脚本、Python 3.10+、本地辅助程序及自己的有效 ChatGPT 授权 |
| 在桌宠里查 Codex 额度 | 上面的本地辅助程序，加上已安装且登录同一 ChatGPT 账号的 Codex CLI；本教程用 Node.js/npm 安装 CLI |

**浏览器登录 ChatGPT、辅助程序登录、Codex CLI 登录是不同环节。** 安装桌面应用也不能替代 CLI 的 PATH 检查。本项目通过 CLI 的 app-server 读取账号额度，不读取它的登录文件。

## 1. 安装 Node.js LTS，确认 npm 一起可用

1. 打开 [Node.js 官方下载页](https://nodejs.org/en/download)，选择当前受支持的 **LTS** 与 Windows 安装包；按电脑架构选择，不要下载其他系统版本。
2. 运行安装程序，保留 npm 和加入 PATH 的选项。
3. 安装完成后关闭旧 PowerShell，再开一个新窗口，依次运行：

```powershell
node --version
npm.cmd --version
where.exe node
where.exe npm
```

**成功标志：** 前两条各输出版本号，后两条能找到实际安装路径。未通过就先解决 Node.js 安装或 PATH，不要继续运行 CLI 安装命令。

- `node`、`npm.cmd` 都找不到：通常尚未安装，或当前窗口还没继承新 PATH。先重开终端，再检查安装。
- `node` 可用但 `npm.cmd` 找不到：检查 Node.js 安装时是否包含 npm，以及 `where.exe node` 是否指向另一套旧环境。
- PowerShell 提示无法运行 `npm.ps1`：这里使用 `npm.cmd`，无需为了安装去放宽系统执行策略。

## 2. 用 npm 安装 Codex CLI

按 [Codex 官方 CLI 文档](https://developers.openai.com/codex/cli) 的 npm 安装方式，在新 PowerShell 运行：

```powershell
npm.cmd install -g @openai/codex@latest
```

安装命令成功结束后，再检查：

```powershell
codex.cmd --version
where.exe codex
```

**成功标志：** CLI 输出版本号，并能找到 `codex` 启动文件。Node.js 安装成功不等于 Codex CLI 已安装；`npm --version` 也不能替代这一步。

如果安装报 `EPERM`、默认全局目录不可写，可按 [使用指南](USAGE.md) 的当前用户目录方案安装。若 npm 安装成功但找不到命令，运行 `npm.cmd prefix -g` 查看实际全局目录；Windows 的 npm 启动文件通常放在这个目录。确认目录中的 `codex.cmd` 存在，再检查该目录是否加入用户 PATH，并重开终端。不要猜磁盘路径或给整个磁盘放开权限。

## 3. 登录与辅助程序相同的 ChatGPT 账号

先关闭正在运行的本地辅助程序，避免登录回调端口冲突。运行：

```powershell
codex.cmd login
```

在打开的官方登录页选择与本地辅助程序相同的 ChatGPT 账号，完成授权后回到终端。然后检查：

```powershell
codex.cmd login status
```

**成功标志：** 登录状态表明已使用 ChatGPT 登录，而不是未登录或仅配置了 API Key。不要把登录凭据复制进脚本或公开截图。

需要独立使用 Codex 编程时，可在自己的项目目录运行 `codex.cmd`，做一次最小任务并检查结果；这会使用账号额度。只想接入额度查询时，不必额外生成代码。

## 4. 验证 CLI 支持 app-server

```powershell
codex.cmd app-server --help
```

**成功标志：** 能显示 app-server 帮助。如果是未知子命令，先更新 CLI。这里只检查命令能力，不代表账号额度接口已经成功；无需手动启动并长期保留 app-server，辅助程序会按需启动它。

## 5. 重启辅助程序，完成本项目连接

1. 确认已退出旧辅助程序；安装前启动的进程可能还在使用旧 PATH。
2. 从新终端进入完整解压的项目目录，运行 `start-windows.cmd`（或在资源管理器中双击）。如果双击仍看不到 CLI，优先从已经能执行 `where.exe codex` 的新终端启动。
3. 在管理页用自己的 ChatGPT 账号登录；若此前已登录，先核对账号，无需为更新文档重新登录。
4. 在 PTA 的“解题模型设置”填入本机地址和配对码，点击“读取账号模型并检查连接”，选择模型与推理强度并保存。
5. 右键桌宠 → **消耗体力 → Codex 额度**。

在 PowerShell 中进入项目目录后，启动命令是：

```powershell
.\start-windows.cmd
```

**最终成功标志：** 额度卡片显示接口返回的窗口、剩余百分比和重置时间。仅看到 CLI 版本、登录成功或模型目录，都不能代替这次查询验证。

首次查询没有可比较基线，括号为 `（—）` 是正常状态；15 秒内可能使用标记过的缓存。百分比来自账号整体窗口，不等于本脚本的单题费用。CLI 与辅助程序邮箱不一致时，程序会拒绝展示；工作区仍需自行核对。

## 两个实际遇到的问题

| 问题 | 现象与原因 | 解决后怎样确认 |
| --- | --- | --- |
| Node.js 环境没安装 | npm 安装路线的第一步就无法执行，提示 `node` 或 `npm` 不是可识别命令；项目 ZIP 不包含 Node.js | 安装官方 LTS、重开终端，`node --version` 与 `npm.cmd --version` 都输出版本号 |
| Codex CLI 没安装 | Node.js 已经可用，但 `codex` 找不到，桌宠提示未检测到 CLI；Node.js 不会自动安装 Codex | 执行 npm 安装，确认 `codex.cmd --version`、`where.exe codex`，再登录、重启辅助程序并实际查询额度 |

## 按这一顺序排查

```text
node / npm 都找不到 → 先安装 Node.js LTS，再开新终端
npm 能运行，codex 找不到 → 安装 CLI，检查 npm 全局目录与 PATH
CLI 能运行，尚未登录 → codex.cmd login，再检查 login status
登录成功，项目仍找不到 CLI → 退出旧辅助程序，从新终端重新启动
提示账号不一致 → 核对 CLI 和辅助程序的 ChatGPT 账号
额度卡片仍失败 → 保存脱敏错误，按排错文档检查；不要反复发起推理
```

安装和查询额度不会替你完成 PTA 脚本导入、模型选择或练习题的在线验证。完整答题流程还需按 [使用指南](USAGE.md) 做一题检查。

## 官方资料

- [Node.js 下载](https://nodejs.org/en/download)
- [Codex CLI 安装与首次使用](https://developers.openai.com/codex/cli)
- [Codex 命令参考：login、login status、app-server](https://developers.openai.com/codex/cli/reference)
- [Codex app-server 账号与额度接口](https://developers.openai.com/codex/app-server)

核对日期：2026-10-17。上游命令、账号能力与可用模型变化时，以官方文档和实际响应为准。
