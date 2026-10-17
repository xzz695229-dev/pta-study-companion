# 参与开发

欢迎改进安装体验、题型兼容、模型参数、用量展示与文档。

## 本地运行与测试

Python 3.10+，Node.js 20+（仅用于测试）。先创建虚拟环境并安装依赖：

```sh
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
python -m unittest discover -s tests -p 'test_*.py' -v
node tests/test_userscript.cjs
```

测试使用模拟响应，不需要真实账号或模型调用；不要把真实凭据加入测试 fixture。

## 修改约定

- 保留第三方版权与 MIT 声明。
- 不添加后台账号共享、自动切换计费来源、读取他人登录文件或静默升级模型。
- 不把 token 数换算成未经服务端验证的额度百分比。
- 费用未知、用量缺失、窗口重置和接口失败应有明确状态。
- UI 文案优先说明当前状态；将详细限制放进可展开说明或文档。
- 涉及请求、取消、费用计算或授权的改动，附上相应验证；纯文案修改无需凑测试数量。

提 Issue 请包含用户脚本/辅助程序版本、浏览器与脚本猫版本、操作步骤、期望与实际结果，并对日志和截图脱敏。PR 请说明问题、最终行为和实际执行的验证。

配图可运行 `python scripts/render_readme_assets.py --font /path/to/NotoSansSC.ttf` 重新生成，需额外安装 Pillow。不要提交字体二进制或渲染缓存。
