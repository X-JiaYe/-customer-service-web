# 智能客服 · 用户侧前端（customer-service-web）

与后端 [customer-service](../customer-service) **前后端分离**的独立仓库。Vue 3 + Vite + TypeScript。

## 鉴权模型（API Key 不暴露）

- 前端**只持有短期访问 token**，长期 API Key 仅在登录那一刻提交，不写入代码、不落 localStorage。
- 流程：登录页输入 API Key → `POST /auth/token` 换取短期 token（存 `sessionStorage`）→ 后续请求带 `Authorization: Bearer <token>`。
- token 过期（后端返回 401）自动退回登录页。
- 后端对应实现：`auth.py` 的 `issue_token` / `resolve_token` + `main.py` 的 `/auth/token`。

## 功能

- 流式渲染（SSE 逐 token）
- 转人工（一键发送）
- 满意度评价（👍/👎 → `POST /feedback`）
- 引用点击（答案末尾「来源/参考」行抽出为可复制块）

## 快速开始

```bash
npm install
npm run dev        # 打开 http://localhost:5173（已代理后端接口到 :8000）
```

> 先启动后端：`cd ../customer-service && .venv/Scripts/python.exe main.py --mode api`

## 构建与部署

```bash
npm run build      # 产物在 dist/，交给 Nginx 托管
```

生产环境由 Nginx 统一入口，前端静态托管 + 反向代理后端接口（与 `vite.config.ts` 的 dev proxy 一致）：

```nginx
server {
  listen 80;
  root /var/www/customer-service-web/dist;

  location /auth/ { proxy_pass http://backend:8000; }
  location /chat { proxy_pass http://backend:8000; }
  location /feedback { proxy_pass http://backend:8000; }
  location /ws {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## 配置

| 变量 | 说明 | 默认 |
|------|------|------|
| `VITE_API_BASE_URL` | 后端 API 基地址（留空 = 同源走代理） | 空 |

复制 `.env.example` 为 `.env` 按需覆盖。
