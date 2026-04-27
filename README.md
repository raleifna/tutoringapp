# TutorConnect

## Testing Strategy

TutorConnect uses automated Vitest suites for frontend and backend code developed in this project. The suite is split into unit, component, and API integration tests so business rules can be tested in isolation while the main API flows are still exercised through Express routes.

### Running Tests

Install dependencies from the repository root if needed:

```bash
pnpm install
```

Run backend tests:

```bash
cd backend
pnpm test
```

Run frontend tests:

```bash
cd frontend
pnpm test
```

Run every automated test from the repository root:

```bash
pnpm test
```

Generate coverage reports:

```bash
pnpm test:coverage
```

GitHub Actions runs the frontend test suite, frontend build, and backend test suite on pushes to `main`/`Arc` and pull requests targeting `main`.

Latest local verification on 2026-04-27:

- Backend: 5 test files, 21 tests passing.
- Frontend: 8 test files, 31 tests passing.
- Frontend coverage is scoped to the helper modules and shared components covered by automated unit/component tests. Page-level workflows are covered by the manual end-to-end checklist below.
- Backend coverage is reported across `backend/src` except environment/config wrappers, which highlights remaining gaps in admin, tutor, subject, and service-level unit coverage.

### Backend Coverage

Backend tests live in `backend/tests`.

Current backend API integration coverage includes:

- Authentication registration, login, token refresh, and current-user lookup.
- JWT socket authentication, including bearer-prefixed tokens and invalid tokens.
- Health check endpoints.
- Booking creation, tutor time-slot conflict handling, and tutor notification behavior.
- Payment method behavior when Stripe is unavailable.
- Message conversation creation, message sending, unread counts, notifications, and marking notifications as read.

The backend suite covers both happy and sad cases. Examples include successful registration/login, rejected login for an unverified account, successful booking creation, duplicate-slot booking rejection, unavailable Stripe setup, invalid socket tokens, and notification read updates.

The backend tests use `supertest` against the Express app and mock external or cross-layer dependencies with Vitest stubs. Prisma database access, email delivery, notification delivery, socket emission, and Stripe configuration are mocked so that the tests can check our API behavior without relying on a live database, email provider, socket server, or payment provider.

### Frontend Coverage

Frontend tests live in `frontend/src/lib/__tests__` and `frontend/src/components/__tests__`.

Current frontend coverage includes:

- Registration form validation, including learner/tutor-specific validation and verification file limits.
- Search filter parsing and invalid query fallback behavior.
- Availability calendar helper behavior.
- Recurring booking display and payment-state helper behavior.
- Booking status helper behavior.
- Payment display helper behavior.
- Availability calendar component rendering and interactions, including editing availability, selecting available slots, and blocking booked slots.
- Location cascader component rendering and interactions, including opening the menu, selecting a leaf location, resolving existing values, and closing on outside click.

These tests cover rendering logic, component behaviour, user interactions, and deterministic form/business logic that supports the React UI. Component tests run in `jsdom` with Testing Library.

### Mocking and Stubbing

The automated suites mock external dependencies where direct integration would make the tests slow, fragile, or dependent on third-party state:

- Prisma is mocked in backend API integration tests to control database success and failure cases.
- Stripe is mocked or configured as unavailable to test payment fallback and error handling without calling the Stripe API.
- Email and notification services are stubbed to verify that the application requests the right side effects.
- Socket services are stubbed to verify emitted events without needing a running Socket.IO server.

### Manual End-to-End Coverage

The current automated suite does not call real Stripe APIs or a production-like database in CI. Those flows are verified manually with the seeded local application and Stripe test-mode credentials when available.

| Flow | Setup | Steps | Expected result |
| --- | --- | --- | --- |
| Learner registration and verification fallback | Start the app locally with default `.env.example` values. | Register a learner, inspect the verification response/log URL, then attempt login before and after verification. | Unverified login is blocked; verified login reaches the learner dashboard. |
| Tutor search and booking request | Use seeded learner and active tutor data. | Search by subject/location, open a tutor profile, choose an available time, and submit a booking. | Booking is created with `PENDING` status and the tutor receives a notification. |
| Booking conflict handling | Use an already-booked tutor time slot. | Attempt to book an overlapping slot. | The app rejects the request and does not create a duplicate booking. |
| Messaging and notifications | Log in as two seeded users in separate browsers. | Start a conversation, send a message, open notifications, and mark notifications as read. | The receiver sees the message/notification and unread counts update. |
| Payment fallback | Run without Stripe secrets. | Open payment method setup and booking payment screens. | The UI/API show payment setup as unavailable without crashing. |
| Stripe test-mode payment | Add Stripe test keys locally. | Add a test card and complete a payable booking flow. | Payment method is saved and the booking payment status updates using Stripe test mode. |
| Admin/tutor review | Use seeded admin and tutor accounts. | Review tutor verification/profile information and update tutor status. | Tutor status changes are reflected in admin and tutor views. |

### Known Gaps

The current automated suite does not yet include full browser-based end-to-end tests. The manual coverage above should be repeated before release, or replaced by a future Playwright suite with a seeded test database and Stripe test-mode credentials.

Frontend automated tests now include component interaction coverage for shared UI controls. Additional page-level component tests would improve coverage of login, registration, search results, booking detail, and payment screens.

Backend tests currently emphasize API-level integration behavior. Additional unit tests for individual services and validation helpers would improve isolation around business rules and edge cases.
