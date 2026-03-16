# Mocks Usage

This folder contains frontend-only mock APIs for local development.
Important: Next.js reads `.env.local` for local environment variables.

## Switch Between Backend and Mock

The project currently uses one stage switch:

- `NEXT_PUBLIC_STAGE1_API_MODE`

It supports:

- `backend`: use real backend APIs (`src/lib/api.js`)
- `mock`: use mock APIs (`src/mocks/auth.mock.js`, `src/mocks/stage2.mock.js`)

Set it in your env file (recommended):

```bash
# frontend/.env.local
NEXT_PUBLIC_STAGE1_API_MODE=mock
```

After changing the value, restart the frontend dev server.

## Current Scope

Currently mocked:

- `authApi` (register/login/logout/getMe/verifyEmail/resendVerification/changePassword)
- `subjectApi` (getCategories/getAll)
- `tutorApi` (search/getById/getAvailability)

The switch logic is in:

- `src/lib/api-entry.js`

---

# Mock 使用说明（中文）

这个目录用于存放前端本地开发用的 mock API。
注意：Next.js 本地环境变量读取的是 `.env.local`。

## 如何切换 后端 / Mock

项目目前使用一个 stage 开关：

- `NEXT_PUBLIC_STAGE1_API_MODE`

它支持：

- `backend`：使用真实后端接口（`src/lib/api.js`）
- `mock`：使用 mock 接口（`src/mocks/auth.mock.js`、`src/mocks/stage2.mock.js`）

建议在环境变量文件中设置：

```bash
# frontend/.env.local
NEXT_PUBLIC_STAGE1_API_MODE=mock
```

修改后请重启前端开发服务器。

## 当前 mock 覆盖范围

目前已实现：

- `authApi`（register/login/logout/getMe/verifyEmail/resendVerification/changePassword）
- `subjectApi`（getCategories/getAll）
- `tutorApi`（search/getById/getAvailability）

开关逻辑位置：

- `src/lib/api-entry.js`
