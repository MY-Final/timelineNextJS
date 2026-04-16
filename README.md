# timelineNextJS

一个基于 Next.js 16 + React 19 的恋爱时间线项目，数据存储在 Cloudflare D1，图片托管在 Cloudflare R2，部署在 Cloudflare Pages。

## 技术栈

- **Next.js 16** + **React 19** + **TypeScript**（strict 模式）
- **Tailwind CSS v4**
- **Cloudflare D1**（SQLite，存帖子数据）
- **Cloudflare R2**（存图片）
- **Cloudflare Pages**（部署）
- **iron-session**（管理员 session）
- **@uiw/react-md-editor**（Markdown 编辑器）
- Framer Motion、Lucide React

## 功能概览

- 首页恋爱计时展示
- 时间线页面（数据来自 D1 API）
- 标签筛选页面
- 图片灯箱预览
- 彩蛋交互动画
- **管理后台**（`/admin`）：新建 / 编辑 / 隐藏 / 删除帖子，上传图片到 R2

## 页面路由

| 路径 | 说明 |
|---|---|
| `/` | 首页 |
| `/timeline` | 时间线 |
| `/tags` | 标签筛选 |
| `/admin` | 管理后台（需登录） |
| `/admin/login` | 管理员登录 |

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录新建 `.env.local`：

```env
ADMIN_PASSWORD=你的管理密码
SESSION_SECRET=至少32位随机字符串
R2_PUBLIC_DOMAIN=https://pub-xxx.r2.dev
```

> 本地开发时 D1/R2 binding 不可用，API 路由会报错，这是正常现象。
> 纯前端页面用 `npm run dev` 照常开发没有问题。

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`。

## Cloudflare 基础设施配置

### 1. 创建 D1 数据库

```bash
npx wrangler d1 create timeline-db
```

记录返回的 `database_id`，填入 `wrangler.toml`。

### 2. 创建 R2 桶

在 Cloudflare 控制台 → R2 → 创建 bucket，名称填 `timeline`，开启 **Public Access**，记录公开域名填入 `R2_PUBLIC_DOMAIN`。

### 3. 应用数据库 Schema

```bash
npx wrangler d1 execute timeline-db --remote --file=migrations/0001_init.sql
```

### 4. 导入历史数据（可选）

```bash
node scripts/seed.mjs
```

## 部署到 Cloudflare Pages

### 1. 构建

```bash
npx opennextjs-cloudflare build
```

### 2. 整理产物并部署

```bash
npm run deploy
```

> `npm run deploy` 等价于：先运行 `scripts/prepare-deploy.mjs`（生成 `_worker.js`），再执行 `wrangler pages deploy`。

### 3. 配置 Pages 项目（首次部署后在控制台操作）

进入 Cloudflare Dashboard → Workers & Pages → `timeline` → Settings：

**Bindings（绑定）：**
| Type | Variable Name | Value |
|---|---|---|
| D1 database | `DB` | `timeline-db` |
| R2 bucket | `R2` | `timeline` |

**Environment Variables（环境变量）：**
| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | 管理密码 |
| `SESSION_SECRET` | ≥32 位随机字符串 |
| `R2_PUBLIC_DOMAIN` | R2 公开域名 |

**Runtime → Compatibility flags：**
```
nodejs_compat
```

配置完成后重新部署一次即可。

## 项目结构

```text
app/
  api/              API Route Handlers（auth / posts / upload）
  admin/            管理后台页面入口
components/
  pages/            页面级组件（含 AdminPage、LoginPage）
  ui/               通用组件（PostEditor）
  easter-eggs/      彩蛋组件
data/
  events.json       历史静态数据（仅用于 seed 脚本）
lib/
  db.ts             D1 数据库操作
  r2.ts             R2 上传封装
  auth.ts           requireAuth() 中间件
  session.ts        iron-session 配置
migrations/
  0001_init.sql     D1 表结构
scripts/
  seed.mjs          历史数据导入脚本
  prepare-deploy.mjs  部署前处理（生成 _worker.js）
public/images/      本地图片（按日期目录存放）
styles/             页面样式文件
```

## 常用命令速查

```bash
npm run dev                          # 本地开发
npm run build                        # Next.js 构建
npx opennextjs-cloudflare build      # Cloudflare 构建（生成 .open-next）
npm run deploy                       # 部署到 Cloudflare Pages
npx wrangler d1 execute timeline-db --remote --file=migrations/0001_init.sql  # 应用 DB schema
node scripts/seed.mjs                # 导入种子数据
npm run lint                         # ESLint 检查
```

## 仓库地址

```text
https://github.com/MY-Final/timelineNextJS
```

