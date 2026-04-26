# TutorConnect

## Testing Strategy

TutorConnect uses automated Vitest suites for the frontend and backend. The tests focus on code developed for this project and cover both expected user flows and failure cases.

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

### Backend Coverage

Backend tests live in `backend/tests`.

Current backend integration coverage includes:

- Authentication registration, login, token refresh, and current-user lookup.
- JWT socket authentication, including bearer-prefixed tokens and invalid tokens.
- Health check endpoints.
- Booking creation, tutor time-slot conflict handling, and tutor notification behavior.
- Payment method behavior when Stripe is unavailable.
- Message conversation creation, message sending, unread counts, notifications, and marking notifications as read.

The backend tests use `supertest` against the Express app and mock external or cross-layer dependencies with Vitest stubs. Prisma database access, email delivery, notification delivery, socket emission, and Stripe configuration are mocked so that the tests can check our API behavior without relying on a live database, email provider, socket server, or payment provider.

### Frontend Coverage

Frontend tests live in `frontend/src/lib/__tests__`.

Current frontend coverage includes:

- Registration form validation, including learner/tutor-specific validation and verification file limits.
- Search filter parsing and invalid query fallback behavior.
- Availability calendar helper behavior.
- Recurring booking display and payment-state helper behavior.
- Booking status helper behavior.
- Payment display helper behavior.

These tests cover rendering-adjacent and form/business logic that supports the React UI. They are written as deterministic unit tests around frontend helper modules.

### Mocking and Stubbing

The automated suites mock external dependencies where direct integration would make the tests slow, fragile, or dependent on third-party state:

- Prisma is mocked in backend API integration tests to control database success and failure cases.
- Stripe is mocked or configured as unavailable to test payment fallback and error handling without calling the Stripe API.
- Email and notification services are stubbed to verify that the application requests the right side effects.
- Socket services are stubbed to verify emitted events without needing a running Socket.IO server.

### Known Gaps

The current automated suite does not yet include full browser-based end-to-end tests. It also does not call real Stripe APIs or a real production-like database in CI. Those flows should be manually verified during system testing or covered by a future E2E suite with a seeded test database and Stripe test-mode credentials.

Frontend tests currently focus on helper and validation logic. Additional component tests with React Testing Library would improve coverage of rendered component states, user interaction, and accessibility behavior.

Backend tests currently emphasize API-level integration behavior. Additional unit tests for individual services and validation helpers would improve isolation around business rules and edge cases.
