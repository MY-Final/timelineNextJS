# timelineNextJS

一个基于 Next.js 16 与 React 19 的恋爱时间线项目。

这个仓库用于承接原先的 Vite React 版本，并迁移到 Next.js `app` 路由结构，方便后续继续接入后端接口、扩展页面和做部署。

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui 基础能力
- Framer Motion
- Lucide React

## 功能概览

- 首页恋爱计时展示
- 时间线页面
- 标签筛选页面
- 图片灯箱预览
- 彩蛋交互与动画效果

## 页面路由

- `/`：首页
- `/timeline`：时间线页面
- `/tags`：标签筛选页

## 本地运行

先安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

如果 `3000` 端口被占用，Next.js 会自动切换到其他可用端口。

## 构建与发布

生产构建：

```bash
npm run build
```

本地启动生产环境：

```bash
npm run start
```

## 项目结构

```text
app/                  Next.js app 路由入口
components/           页面组件、通用组件、彩蛋组件
data/                 时间线事件数据
lib/                  工具函数与交互逻辑
public/images/        时间线图片资源
styles/               全局样式与页面样式
```

## 数据与图片维护

时间线数据在：

```text
data/events.json
```

图片路径映射在：

```text
lib/images.ts
```

如果你新增一组事件，一般需要同时做两件事：

1. 在 `data/events.json` 里新增事件内容
2. 在 `public/images/对应日期/` 中放入图片，并在 `lib/images.ts` 中补上映射

## 迁移说明

这个项目已经完成了从旧 React/Vite 项目到 Next.js 的第一轮迁移，主要包括：

- React Router 路由迁移为 Next.js 文件路由
- 页面组件迁移到 `components/pages`
- 静态图片资源迁移到 `public/images`
- 原有样式与交互逻辑迁移到 Next.js 项目结构

## 后续建议

- 接入后端接口后，把 `events.json` 替换为服务端或接口数据源
- 将图片映射逻辑改造成接口返回或 CMS 配置
- 逐步把页面中的公共 UI 抽成更标准的 shadcn/ui 组件

## 仓库地址

```text
https://github.com/MY-Final/timelineNextJS
```
