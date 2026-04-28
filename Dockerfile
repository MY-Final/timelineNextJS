# ─── Stage 1: 安装依赖 ───────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# 使用阿里云 apk 镜像源（国内加速）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

COPY package.json package-lock.json* ./
# 使用淘宝 npm 镜像源加速依赖安装
RUN npm ci --frozen-lockfile --registry=https://registry.npmmirror.com

# ─── Stage 2: 构建 ───────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# 使用阿里云 apk 镜像源（国内加速）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建时注入环境变量（如有需要可在此添加 ARG/ENV）
RUN npm run build

# ─── Stage 3: 运行时镜像 ─────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 仅复制运行时必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
