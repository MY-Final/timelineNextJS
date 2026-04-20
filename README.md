# timelineNextJS

一个基于 Next.js 16 与 React 19 的恋爱时间线项目，包含完整的后端 API、用户认证、管理后台与云服务集成。

## 技术栈

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui 基础能力
- Framer Motion
- Lucide React
- PostgreSQL（Supabase）
- Redis（Upstash）
- Cloudflare R2（图片存储）

## 功能概览

- 首页恋爱计时展示
- 时间线页面
- 标签筛选页面
- 图片灯箱预览
- 彩蛋交互与动画效果
- 用户注册 / 登录 / 修改密码 / 重置密码（邮箱验证码）
- 管理后台：帖子、评论、用户、邮箱账号管理
- JWT 鉴权（HttpOnly Cookie）
- 图片直传 Cloudflare R2

## 页面路由

- `/`：首页
- `/timeline`：时间线页面
- `/tags`：标签筛选页
- `/login`：登录页
- `/admin`：管理后台（需 admin / superadmin 权限）
- `/api-docs`：API 文档

## 环境变量

在项目根目录创建 `.env.local`，填写以下变量：

```env
# 数据库（Supabase）
DB_TYPE=supabase
SUPABASE_DB_URL=postgresql://postgres:<密码>@db.<project>.supabase.co:5432/postgres

# JWT
JWT_SECRET=<至少32位随机字符串>
JWT_EXPIRES_IN=7d

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Redis（Upstash）
REDIS_TYPE=upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

> 注意：密码中含有 `@` 等特殊字符时，需进行 URL 编码（`@` → `%40`）。

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
app/                  Next.js app 路由入口（页面 + API）
  api/                后端 API 路由
  admin/              管理后台页面
components/           页面组件、通用组件、彩蛋组件
data/                 邮件模板等静态数据
db/                   数据库建表 SQL
lib/                  工具函数（db、redis、jwt、auth、r2、mailer 等）
public/               静态资源（图片等）
styles/               全局样式与页面样式
```

## 数据库初始化

按顺序执行 `db/` 目录下的 SQL 文件：

```text
01_users.sql
02_posts.sql
03_comments.sql
04_likes.sql
05_post_images.sql
06_email_accounts.sql
seed_superadmin.sql   # 初始化超级管理员账号
```

## 仓库地址

```text
https://github.com/MY-Final/timelineNextJS
```
