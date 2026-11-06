# Starry Journey · 个人站

[![CI](https://github.com/Starry-Journey/Starry-Journey.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/Starry-Journey/Starry-Journey.github.io/actions/workflows/ci.yml)

个人博客 + 每日资讯简报 + 太阳系互动地图 + 自建评论区 + 星盘与 AI 解读。

- 站点：<https://starry-journey.github.io/>
- 太阳系地图：<https://starry-journey.github.io/solar/>
- 每日简报：<https://starry-journey.github.io/news/>

## 技术栈

- Hexo 7 + Stellar 主题，GitHub Actions 构建，GitHub Pages 托管
- 太阳系页面：Canvas 2D + Three.js（本地 vendor，无 CDN 依赖）
- 评论区：自建 C++ 聊天室服务 + nginx
- AI 解读：Python + DeepSeek（星盘专属）
- 内容管线：VPS 上的新闻雷达（systemd timer）

## 本地开发

```bash
npm ci
npm run server          # http://localhost:4000
npm run build           # 生成 public/
```

## 质量保障

```bash
npm run lint            # ESLint
npm run format:check    # Prettier
npm run test:e2e        # Playwright 冒烟测试
node scripts/check-internal-links.mjs
```

CI 会依次执行构建、站内链接检查、lint、格式检查与 Playwright 冒烟测试。

## 目录

```
source/_posts/     个人文章
source/news/       每日简报（独立栏目）
source/solar/      太阳系地图
source/js/         星空、评论、AI 助手、太阳系脚本
scripts/           Hexo 过滤器与链接检查
tests/e2e/         Playwright 冒烟测试
docs/LEARNING.md   这次工程化改造的学习手册
```

## 相关仓库

- 聊天室/评论后端：<https://github.com/Starry-Journey/chat-server>
- 运维备份（私有）：`Starry-Journey/starry-backup`
