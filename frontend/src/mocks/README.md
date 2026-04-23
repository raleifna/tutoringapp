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

# Mock Usage Guide

This directory contains mock APIs for local frontend development.
Note: Next.js reads local frontend environment variables from `.env.local`.

## Switching Between Backend And Mock APIs

The project currently uses five stage switches:

- `NEXT_PUBLIC_STAGE1_API_MODE`（auth）
- `NEXT_PUBLIC_STAGE2_API_MODE`（subject + tutor）
- `NEXT_PUBLIC_STAGE3_API_MODE`（booking）
- `NEXT_PUBLIC_STAGE4_API_MODE`（private tutor features + user profile）
- `NEXT_PUBLIC_STAGE5_API_MODE`（admin）

Each switch supports:

- `backend`: use the real backend API (`src/lib/api.js`)
- `mock`: use the mock API (`src/mocks/stage1.mock.js`, `src/mocks/stage2.mock.js`, `src/mocks/stage3.mock.js`, `src/mocks/stage4.mock.js`, `src/mocks/stage5.mock.js`)

Recommended local environment setup:

```bash
# frontend/.env.local
NEXT_PUBLIC_STAGE1_API_MODE=mock
NEXT_PUBLIC_STAGE2_API_MODE=mock
NEXT_PUBLIC_STAGE3_API_MODE=mock
NEXT_PUBLIC_STAGE4_API_MODE=mock
NEXT_PUBLIC_STAGE5_API_MODE=mock
```

Compatibility note:
- If `STAGE2/3/4/5` are not set, they default to following `STAGE1`.

Restart the frontend development server after changing these values.

## Current Mock Coverage

Currently implemented:

- `authApi`（register/login/logout/getMe/verifyEmail/resendVerification/changePassword）
- `subjectApi`（getCategories/getAll）
- `tutorApi`（search/getById/getAvailability）
- `bookingApi`（create/getMyBookings/getById/cancel）
- `stage4 tutorApi`（getMyProfile/updateProfile/updateAvailability/addSubject/removeSubject/updateApplication）
- `stage4 bookingApi`（getTutorBookings/getById/accept/decline/reschedule/complete）
- `userApi`（updateProfile/uploadAvatar）
- `messageApi`（getConversations/createConversation/getMessages/sendMessage/markAsRead/getUnreadCount）
- `adminApi`（getDashboard/getAnalytics/getUsers/getUser/updateUserStatus/getPendingTutors/approveTutor/rejectTutor/returnTutor/getBookings/getActions/createSubject/updateSubject/deleteSubject）

Switching logic:

- `src/lib/api-entry.js`

## Mock Demo Accounts

All demo accounts use the same password:

- `Demo1234!`

Recommended accounts:

- Learner: `ava.learner@example.com`
- Tutor: `emma.tutor@example.com`
- Admin: `admin@mock.local`

Other built-in accounts:

- `ethan.learner@example.com`
- `mia.learner@example.com`
- `liam.tutor@example.com`
- `sophie.tutor@example.com`
- `noah.tutor@example.com`
- `sysadmin@mock.local`

## Reset Mock Data (Optional)

To replay a full mock flow from a clean state, run this in the browser console:

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
