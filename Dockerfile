# 贷后案件管理系统 Dockerfile
FROM node:18-alpine

# 安装依赖
RUN apk add --no-cache postgresql-client

WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 全局安装 pnpm 并安装依赖
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建
RUN pnpm build

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

ENV NODE_ENV=production

CMD ["pnpm", "start"]
