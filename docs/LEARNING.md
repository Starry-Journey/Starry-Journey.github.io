# 工程化学习手册（Layer 0）

> 这份文档记录这次"仓库与工程卫生"改造做了什么、每一步背后的知识点、以及可以系统学习的资料。
> 目标不是背概念，而是能独立复现、能讲清楚为什么这么做。

## 这次完成了什么

| 步骤             | 结果                                                    | 文件                                                      |
| ---------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| 1. 仓库卫生      | 不再跟踪 `node_modules` / `public` / `db.json`          | `.gitignore`                                              |
| 2. CI            | 构建 + 站内链接检查 + lint + 格式检查 + Playwright 冒烟 | `.github/workflows/ci.yml`                                |
| 3. 链接检查      | 自定义脚本，发现并修复 `/about/` 缺失与 URL 编码问题    | `scripts/check-internal-links.mjs`                        |
| 4. Lint / Format | ESLint（flat config）+ Prettier + ruff                  | `eslint.config.mjs`、`.prettierrc.json`、`pyproject.toml` |
| 5. 测试          | 3 条 Playwright 冒烟 + pytest（radar / chatbot）        | `tests/e2e/`、`news-radar/tests/`、`chatbot/tests/`       |
| 6. 依赖与规范    | Dependabot 分组、PR 模板、Conventional Commits          | `.github/dependabot.yml`、PR 模板、`.commitlintrc.json`   |
| 7. 密钥收敛      | 服务器统一 `/etc/starry/env`，服务与备份同步            | `backup/backup.sh`、systemd 单元                          |
| 8. 3D 本地化     | three.js 放进 `source/js/vendor/`，去掉 CDN 依赖        | `source/js/vendor/`                                       |

---

## 1. Git 仓库卫生

### 要掌握的概念

- **工作区 / 暂存区 / 仓库**：`git status` 看到的三态；`git rm --cached` 只从索引删除、保留磁盘文件
- **tracked vs ignored**：`.gitignore` 只对未跟踪文件生效；已经跟踪的文件要先 `git rm --cached`
- **为什么不能提交 `node_modules`**：体积、平台差异、lockfile 已经能精确还原；提交它会让 review、clone、CI 都变慢
- **lockfile 的作用**：`package-lock.json` 锁定依赖树；`npm ci` 严格按 lock 安装
- **仓库瘦身**：历史里的 blob 不会因为 `git rm` 消失，需要 `git filter-repo` / BFG（本次没做，属于进阶）

### 常用命令

```bash
git check-ignore -v node_modules      # 看某文件被哪条规则忽略
git ls-files node_modules | wc -l     # 还有多少被跟踪
git rm -r --cached node_modules       # 停止跟踪但保留文件
git log --stat --oneline | head       # 看提交体积
```

### 学习资料

- Pro Git（免费书）第 2 章、第 7.6 节：<https://git-scm.com/book/zh/v2>
- GitHub：忽略文件 <https://docs.github.com/zh/get-started/getting-started-with-git/ignoring-files>
- `git-filter-repo`：<https://github.com/newren/git-filter-repo>
- npm 官方：`npm ci` 与 `npm install` 的区别 <https://docs.npmjs.com/cli/v10/commands/npm-ci>

### 自测

- 能解释为什么 CI 里用 `npm ci` 而不是 `npm install`
- 能说出 `git rm --cached` 和 `git rm` 的区别

---

## 2. GitHub Actions（CI）

### 要掌握的概念

- **Workflow / Event / Job / Step / Action** 五层结构
- `on: push / pull_request` 触发；`jobs.<id>.runs-on`
- `actions/checkout`、`actions/setup-node` 的 `cache: npm`
- **Job 之间默认隔离**：构建产物要 `upload-artifact` / `download-artifact` 才能共享
- `permissions` 最小权限；`secrets` 注入方式
- **并发控制**：`concurrency` 取消旧运行，省额度
- 失败排查：看 step 日志、开 `ACTIONS_STEP_DEBUG` secret

### 本次的关键写法

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: npm
- run: npm ci
- run: npm run build
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e
```

### 学习资料

- GitHub Actions 文档：<https://docs.github.com/zh/actions>
- `setup-node`：<https://github.com/actions/setup-node>
- 缓存依赖：<https://docs.github.com/zh/actions/using-workflows/caching-dependencies-to-speed-up-workflows>
- 安全使用 Actions：<https://docs.github.com/zh/actions/security-guides/security-hardening-for-github-actions>

### 自测

- 能画出一个 push 到 main 后，CI 与 Pages 两条 workflow 各自的执行流程
- 能解释为什么 e2e 必须和 build 在同一个 job（或传 artifact）

---

## 3. 站内链接检查

### 要掌握的概念

- 静态站的"链接图"：`href` / `src` 指向的相对/绝对路径
- URL 编码：中文路径在 HTML 里是 `%E6%80%9D...`，比对文件系统前要 `decodeURIComponent`
- 目录式 URL：`/news/` 实际对应 `news/index.html`
- 链接检查工具：`lychee`、`linkinator`、自写脚本的取舍（外链有网络与限流问题）

### 学习资料

- MDN `encodeURIComponent`：<https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent>
- lychee：<https://github.com/lycheeverse/lychee>
- W3C Link Checker：<https://validator.w3.org/checklink>

### 自测

- 能解释为什么 `/categories/%E6%80%9D%E8%80%83/` 会误报
- 能扩展脚本检查 `srcset` 或外链白名单

---

## 4. Lint 与格式化

### 要掌握的概念

- **Lint 管正确性/风格问题，Formatter 管排版**；两者职责不要混
- ESLint **flat config**（`eslint.config.mjs`）：`files`、`languageOptions.globals`、`rules`
- 浏览器脚本与 Node 脚本要分别配置 `globals` / `sourceType`
- Prettier 的"意见化"：减少 review 里的格式争论；`--check` 用于 CI
- Python：`ruff check`（lint）+ `ruff format`（格式化），替代 flake8/isort/black 组合
- 编辑器集成：保存时自动格式化，CI 只做检查

### 学习资料

- ESLint 配置：<https://eslint.org/docs/latest/use/configure/>
- Prettier：<https://prettier.io/docs/en/>
- Ruff：<https://docs.astral.sh/ruff/>
- Airbnb JS 风格指南（读规则背后的理由）：<https://github.com/airbnb/javascript>

### 自测

- 能解释 `no-unused-vars` 为什么对 `catch (e)` 误报、怎么配置
- 能给 `source/js` 与 `scripts` 写不同的 globals

---

## 5. 测试（Playwright + pytest）

### 要掌握的概念

- **测试金字塔**：单元 > 集成 > E2E；E2E 少而关键
- Playwright：`webServer` 自动起服务、locator 自动等待、`expect` 轮询断言、trace 调试
- 冒烟测试选"用户关键路径"：能打开、能切换、能交互
- pytest：fixture、`monkeypatch`、`tmp_path`；测试不依赖真实网络/真实 key
- 测试数据构造：避免近重复标题这类"测试自身触发业务去重"的坑

### 学习资料

- Playwright：<https://playwright.dev/docs/intro>
- pytest：<https://docs.pytest.org/en/stable/>
- 测试金字塔/Testing Trophy：<https://kentcdodds.com/blog/the-testing-trophy-and-testing-classification>
- `monkeypatch`：<https://docs.pytest.org/en/stable/how-to/monkeypatch.html>

### 自测

- 能写一个"3D 切换失败时截图 + trace"的调试流程
- 能解释为什么 radar 测试不需要真的调用 DeepSeek

---

## 6. 依赖与提交规范

### 要掌握的概念

- **SemVer**：major/minor/patch 的语义
- lockfile 必须提交；Dependabot 分组减少 PR 噪音
- **Conventional Commits**：`feat(scope): ...`、`fix:`、`chore:`；用于生成 changelog、触发语义化发布
- PR 标题检查（semantic-pull-request）与 commitlint 的分工
- 依赖升级策略：patch 自动、minor 看 CI、major 人工评估

### 学习资料

- SemVer：<https://semver.org/lang/zh-CN/>
- Conventional Commits：<https://www.conventionalcommits.org/zh-hans/>
- Dependabot：<https://docs.github.com/zh/code-security/dependabot>
- commitlint：<https://commitlint.js.org/>

### 自测

- 能设计一个 monorepo 的 Dependabot 分组策略
- 能解释为什么 PR 标题也要遵守规范

---

## 7. 密钥与配置管理

### 要掌握的概念

- **12-Factor Config**：配置放环境变量，不写进代码
- 文件权限：`600`、目录 `700`；`EnvironmentFile` 由 systemd 注入
- 单一事实来源：服务器只保留 `/etc/starry/env`，服务、DDNS、备份都读它
- 轮换：泄露后先 revoke，再更新所有引用点
- GitHub Secrets 与服务器 env 的边界：CI 用 Secrets，运行时用服务器 env
- 进阶：SOPS + age、Vault、Doppler；至少做到"仓库零密钥 + 备份加密"

### 本次落地

```bash
/etc/starry/env         # 唯一密钥文件（600）
/etc/duckdns/duck.sh    # 只 source env，不再内嵌 token
systemd EnvironmentFile=/etc/starry/env
backup.sh               # 备份 env 到加密包
```

### 学习资料

- 12-Factor：<https://12factor.net/zh_cn/config>
- GitHub 加密 Secrets：<https://docs.github.com/zh/actions/security-guides/encrypted-secrets>
- SOPS：<https://github.com/getsops/sops>
- systemd `EnvironmentFile`：<https://www.freedesktop.org/software/systemd/man/systemd.exec.html#EnvironmentFile=>

### 自测

- 能列出这个项目所有密钥的位置与轮换步骤
- 能解释为什么密钥不能进 Git 历史（即使后来删除）

---

## 8. 作品集表达

### 要掌握的概念

- README 结构：问题 → 方案 → 架构图 → 关键决策 → 指标 → 运行方式
- **ADR**（Architecture Decision Record）：记录"为什么这样选"
- 架构图：Mermaid / C4；一页能讲清数据流
- 指标：构建时间、包体、FPS、API 成本、失败率
- Case study：把"我做了什么"变成"我解决了什么问题、怎么验证"

### 学习资料

- ADR：<https://adr.github.io/>
- C4 model：<https://c4model.com/>
- Google 工程实践：<https://google.github.io/eng-practices/>

### 自测

- 能用 3 分钟讲清这个站点的架构与取舍
- 能给出一个"性能优化前后对比"的数字

---

## 9. 下一阶段（Layer 1–3）学习路线

| 阶段    | 主题             | 建议学习                                                                |
| ------- | ---------------- | ----------------------------------------------------------------------- |
| Layer 1 | Docker / Compose | Docker 官方 get-started；《Docker Deep Dive》                           |
| Layer 1 | Ansible / IaC    | Ansible docs；Terraform 入门（可选）                                    |
| Layer 1 | 可观测性         | OpenTelemetry 概念、Sentry、Uptime Kuma、SLO 基础                       |
| Layer 2 | FastAPI          | FastAPI 官方教程；Pydantic v2；SSE 流式                                 |
| Layer 2 | Postgres         | SQL 基础、索引、事务；Supabase/Neon 文档                                |
| Layer 2 | 占星计算         | `pyswisseph` 文档；天文时间/时区处理（`zoneinfo`）                      |
| Layer 3 | WebGL 性能       | Three.js 文档、`InstancedMesh`、KTX2/Basis、Chrome DevTools Performance |
| Layer 3 | 前端工程         | Vite、ES modules、bundle analyzer                                       |

## 10. 每周练习建议

1. 给一个已有项目补 3 条测试（1 单元 + 1 集成 + 1 E2E）
2. 把一条手写部署命令改成可重复脚本，并写进 README
3. 给一个功能写 ADR（背景/选项/决定/后果）
4. 记录一次故障：现象 → 根因 → 修复 → 预防
5. 用 `git log --oneline` 复盘一周提交是否符合规范
