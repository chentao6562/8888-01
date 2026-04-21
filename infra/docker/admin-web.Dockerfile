# MindLink Admin Web · 多阶段构建
# 目标：< 50MB · Nginx 托管

# ========== Stage 1: build ==========
FROM node:20.11-alpine AS builder
WORKDIR /app
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apk/repositories \
 && corepack enable && corepack prepare pnpm@9.15.0 --activate \
 && pnpm config set registry https://registry.npmmirror.com
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/admin-web/package.json apps/admin-web/
COPY packages/ui/package.json packages/ui/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile --filter @mindlink/admin-web...

COPY . .
ARG VITE_API_BASE=https://api.mindlink.example.com/api/v1
ENV VITE_API_BASE=${VITE_API_BASE}
RUN pnpm --filter @mindlink/admin-web build

# ========== Stage 2: nginx ==========
FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/apps/admin-web/dist ./
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
