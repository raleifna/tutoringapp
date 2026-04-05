# Chat Migration Scope

## Goal

Migrate the tutor/learner 1v1 chat module from `9900_Project_demo_testVersion` into
`capstone-project-26t1-9900-f09c-cake` in small, reviewable steps that fit the
current target architecture.

## In Scope

- Tutor and learner 1v1 conversations
- Conversation creation or retrieval by target user
- Conversation list
- Message list
- Plain text message sending
- Read state and unread count
- Chat entry points from learner and tutor flows
- Navigation integration for the chat page
- Realtime chat enhancements in later steps

## Out of Scope For Initial Migration

- Admin chat
- Notification center migration
- Notification page parity with the source project
- Non-chat feature changes unrelated to the messaging flow

## Integration Rules

- Keep the target project's existing structure and naming style where possible
- Use the target project's `api-entry` pattern instead of copying the source API layer verbatim
- Prefer incremental edits to existing target pages over full file replacement
- Treat notifications as a separate later concern, even if the source project couples them with chat

## Source Chat Files

The source project currently exposes chat functionality in these files:

- `backend/src/controllers/messageController.js`
- `backend/src/routes/messages.js`
- `backend/src/services/socketService.js`
- `backend/src/services/notificationService.js`
- `frontend/src/lib/api.js`
- `frontend/src/lib/store.js`
- `frontend/src/app/(app)/messages/page.jsx`
- `frontend/src/app/(app)/layout.jsx`
- `frontend/src/app/(app)/dashboard/page.jsx`
- `frontend/src/app/(app)/bookings/[id]/page.jsx`
- `frontend/src/app/(app)/tutors/[id]/page.jsx`

## Target Files Expected To Change

These are the main target files expected to be touched during the migration:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `backend/src/app.js`
- `backend/src/controllers/messageController.js`
- `backend/src/routes/messages.js`
- `backend/src/services/socketService.js`
- `backend/server.js`
- `backend/package.json`
- `frontend/src/lib/api.js`
- `frontend/src/lib/api-entry.js`
- `frontend/src/lib/store.js`
- `frontend/src/app/(app)/messages/page.jsx`
- `frontend/src/app/(app)/layout.jsx`
- `frontend/src/app/(app)/dashboard/page.jsx`
- `frontend/src/app/(app)/tutor/dashboard/page.jsx`
- `frontend/src/app/(app)/bookings/[id]/page.jsx`
- `frontend/src/app/(app)/tutors/[id]/page.jsx`

## Deferred Or Optional Target Files

These files may be touched later if we decide to carry over enhanced behavior:

- `frontend/src/mocks/*`
- `backend/src/controllers/notificationController.js`
- `backend/src/routes/notifications.js`
- `frontend/src/app/(app)/notifications/page.jsx`

## First Milestone

The first implementation milestone is the minimum usable chat foundation:

- database models added
- backend routes registered
- conversation and message APIs available
- frontend message page shell added
- learner and tutor can open a conversation and exchange plain text messages
