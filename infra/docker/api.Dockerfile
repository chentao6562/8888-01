# MindLink API · 多阶段构建
# 目标：镜像 < 300MB · 仅含 dist/ + 运行时依赖

# ========== Stage 1: deps ==========
FROM node:20.11-alpine AS deps
WORKDIR /app
# Alpine + pnpm 换国内镜像（CN build 加速）
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apk/repositories \
 && apk add --no-cache python3 make g++ \
 && corepack enable \
 && corepack prepare pnpm@9.15.0 --activate \
 && pnpm config set registry https://registry.npmmirror.com
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile --filter @mindlink/api... --prod=false

# ========== Stage 2: build ==========
FROM deps AS builder
WORKDIR /app
COPY . .
RUN pnpm --filter @mindlink/shared build || true \
 && pnpm --filter @mindlink/api build

# ========== Stage 3: runner ==========
FROM node:20.11-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=3000

RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apk/repositories \
 && apk add --no-cache tini curl \
 && corepack enable \
 && corepack prepare pnpm@9.15.0 --activate \
 && pnpm config set registry https://registry.npmmirror.com \
 && addgroup -g 1001 -S nodejs \
 && adduser -S mindlink -u 1001 -G nodejs

# 仅拷生产依赖
COPY --from=builder --chown=mindlink:nodejs /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
COPY --from=builder --chown=mindlink:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=mindlink:nodejs /app/packages ./packages
# HUSKY=0 跳过 root package.json 的 prepare 脚本（husky 是 devDep · prod 不装）
ENV HUSKY=0
RUN pnpm install --frozen-lockfile --filter @mindlink/api... --prod \
 && pnpm store prune

COPY --from=builder --chown=mindlink:nodejs /app/apps/api/dist ./apps/api/dist

USER mindlink
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main.js"]
