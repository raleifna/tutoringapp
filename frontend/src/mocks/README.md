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
- `messageApi` (getConversations/createConversation/getMessages/sendMessage/markAsRead/getUnreadCount)
- `adminApi` (getDashboard/getAnalytics/getUsers/getUser/updateUserStatus/getPendingTutors/approveTutor/rejectTutor/returnTutor/getBookings/getActions/createSubject/updateSubject/deleteSubject)

The switch logic is in:

- `src/lib/api-entry.js`

## Demo Accounts (Mock)

All demo accounts use the same password:

- `Demo1234!`

Recommended login emails:

- Learner: `ava.learner@example.com`
- Tutor: `emma.tutor@example.com`
- Admin: `admin@mock.local`

Additional seeded users:

- `ethan.learner@example.com`
- `mia.learner@example.com`
- `liam.tutor@example.com`
- `sophie.tutor@example.com`
- `noah.tutor@example.com`
- `sysadmin@mock.local`

## Reset Mock Data (Optional)

If you need a fresh test run, remove mock keys in browser console:

```js
[
  'mock_auth_users_v1',
  'mock_auth_session_v1',
  'mock_auth_verify_tokens_v1',
  'mock_stage3_bookings_v1',
  'mock_stage4_tutor_profiles_v1',
  'mock_stage4_tutor_user_map_v1',
  'mock_stage4_messages_v1',
  'mock_stage5_subjects_v1',
  'mock_stage5_admin_actions_v1',
  'mock_stage5_user_status_v1',
].forEach((key) => localStorage.removeItem(key));
```

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
- `messageApi`（getConversations/createConversation/getMessages/sendMessage/markAsRead/getUnreadCount）
- `adminApi`（getDashboard/getAnalytics/getUsers/getUser/updateUserStatus/getPendingTutors/approveTutor/rejectTutor/returnTutor/getBookings/getActions/createSubject/updateSubject/deleteSubject）

开关逻辑位置：

- `src/lib/api-entry.js`

## Mock 测试账号

所有演示账号统一密码：

- `Demo1234!`

建议优先使用：

- Learner：`ava.learner@example.com`
- Tutor：`emma.tutor@example.com`
- Admin：`admin@mock.local`

其它已内置账号：

- `ethan.learner@example.com`
- `mia.learner@example.com`
- `liam.tutor@example.com`
- `sophie.tutor@example.com`
- `noah.tutor@example.com`
- `sysadmin@mock.local`

## 重置 Mock 数据（可选）

如果你要重新走一轮完整流程，可在浏览器控制台执行：

```js
[
  'mock_auth_users_v1',
  'mock_auth_session_v1',
  'mock_auth_verify_tokens_v1',
  'mock_stage3_bookings_v1',
  'mock_stage4_tutor_profiles_v1',
  'mock_stage4_tutor_user_map_v1',
  'mock_stage4_messages_v1',
  'mock_stage5_subjects_v1',
  'mock_stage5_admin_actions_v1',
  'mock_stage5_user_status_v1',
].forEach((key) => localStorage.removeItem(key));
```
