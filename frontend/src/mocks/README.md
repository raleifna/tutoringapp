# Mocks Usage

This folder contains frontend-only mock APIs for local development.
Important: Next.js reads `.env.local` for local environment variables.

## Switch Between Backend and Mock

The project currently uses five stage switches:

- `NEXT_PUBLIC_STAGE1_API_MODE` (auth)
- `NEXT_PUBLIC_STAGE2_API_MODE` (subject + tutor)
- `NEXT_PUBLIC_STAGE3_API_MODE` (booking)
- `NEXT_PUBLIC_STAGE4_API_MODE` (tutor private + user profile)
- `NEXT_PUBLIC_STAGE5_API_MODE` (admin)

Each switch supports:

- `backend`: use real backend APIs (`src/lib/api.js`)
- `mock`: use mock APIs (`src/mocks/stage1.mock.js`, `src/mocks/stage2.mock.js`, `src/mocks/stage3.mock.js`, `src/mocks/stage4.mock.js`, `src/mocks/stage5.mock.js`)

Set them in your env file (recommended):

```bash
# frontend/.env.local
NEXT_PUBLIC_STAGE1_API_MODE=mock
NEXT_PUBLIC_STAGE2_API_MODE=mock
NEXT_PUBLIC_STAGE3_API_MODE=mock
NEXT_PUBLIC_STAGE4_API_MODE=mock
NEXT_PUBLIC_STAGE5_API_MODE=mock
```

Compatibility note:
- If `STAGE2/3/4/5` are not set, they will fallback to `STAGE1`.

After changing the value, restart the frontend dev server.

## Current Scope

Currently mocked:

- `authApi` (register/login/logout/getMe/verifyEmail/resendVerification/changePassword)
- `subjectApi` (getCategories/getAll)
- `tutorApi` (search/getById/getAvailability)
- `bookingApi` (create/getMyBookings/getById/cancel)
- `stage4 tutorApi` (getMyProfile/updateProfile/updateAvailability/addSubject/removeSubject/updateApplication)
- `stage4 bookingApi` (getTutorBookings/getById/accept/decline/reschedule/complete)
- `userApi` (updateProfile/uploadAvatar)
- `adminApi` (getDashboard/getAnalytics/getUsers/getUser/updateUserStatus/getPendingTutors/approveTutor/rejectTutor/returnTutor/getBookings/getActions/createSubject/updateSubject/deleteSubject)

The switch logic is in:

- `src/lib/api-entry.js`

---

# Mock 使用说明（中文）

这个目录用于存放前端本地开发用的 mock API。
注意：Next.js 本地环境变量读取的是 `.env.local`。

## 如何切换 后端 / Mock

项目目前使用五个 stage 开关：

- `NEXT_PUBLIC_STAGE1_API_MODE`（auth）
- `NEXT_PUBLIC_STAGE2_API_MODE`（subject + tutor）
- `NEXT_PUBLIC_STAGE3_API_MODE`（booking）
- `NEXT_PUBLIC_STAGE4_API_MODE`（tutor 私有能力 + user profile）
- `NEXT_PUBLIC_STAGE5_API_MODE`（admin）

每个开关支持：

- `backend`：使用真实后端接口（`src/lib/api.js`）
- `mock`：使用 mock 接口（`src/mocks/stage1.mock.js`、`src/mocks/stage2.mock.js`、`src/mocks/stage3.mock.js`、`src/mocks/stage4.mock.js`、`src/mocks/stage5.mock.js`）

建议在环境变量文件中设置：

```bash
# frontend/.env.local
NEXT_PUBLIC_STAGE1_API_MODE=mock
NEXT_PUBLIC_STAGE2_API_MODE=mock
NEXT_PUBLIC_STAGE3_API_MODE=mock
NEXT_PUBLIC_STAGE4_API_MODE=mock
NEXT_PUBLIC_STAGE5_API_MODE=mock
```

兼容说明：
- 如果不设置 `STAGE2/3/4/5`，会默认跟随 `STAGE1`。

修改后请重启前端开发服务器。

## 当前 mock 覆盖范围

目前已实现：

- `authApi`（register/login/logout/getMe/verifyEmail/resendVerification/changePassword）
- `subjectApi`（getCategories/getAll）
- `tutorApi`（search/getById/getAvailability）
- `bookingApi`（create/getMyBookings/getById/cancel）
- `stage4 tutorApi`（getMyProfile/updateProfile/updateAvailability/addSubject/removeSubject/updateApplication）
- `stage4 bookingApi`（getTutorBookings/getById/accept/decline/reschedule/complete）
- `userApi`（updateProfile/uploadAvatar）
- `adminApi`（getDashboard/getAnalytics/getUsers/getUser/updateUserStatus/getPendingTutors/approveTutor/rejectTutor/returnTutor/getBookings/getActions/createSubject/updateSubject/deleteSubject）

开关逻辑位置：

- `src/lib/api-entry.js`
