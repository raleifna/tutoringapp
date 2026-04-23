Backend tests are organized by scope:

- `tests/setup/`: shared test environment setup
- `tests/integration/`: API-level tests using `supertest` against `src/app.js`

Suggested next additions:

- `tests/integration/auth/`
- `tests/integration/bookings/`
- `tests/integration/messages/`
- `tests/unit/services/`
