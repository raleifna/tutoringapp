# TutorConnect — Setup & Run Guide

## Quick Start (Recommended)

### 1. Clone the repository

```bash
git clone <repository-url>
cd capstone-project-26t1-9900-f09c-cake
```

### 2. Start the application

**macOS / Linux:**

```bash
bash start-local.sh
```

**Windows (PowerShell):**

```powershell
.\start-local.ps1
```

The script will automatically:
- Build all Docker containers (frontend, backend, database, mail server)
- Apply the database schema
- Seed demo accounts and sample data
- Wait until all services are healthy

First run takes **3–5 minutes** due to Docker image downloads. Subsequent starts take under 30 seconds.

---

## Access the Application

Once the script finishes, open your browser:

| Service | URL |
|---------|-----|
| **Application** | http://localhost:8080 |
| **API Health Check** | http://localhost:8080/api/v1/health |
| **Email Inbox** (dev) | http://localhost:8025 |

---

## Demo Accounts

The database is pre-seeded with the following accounts for testing:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@tutorconnect.com | Admin@123456 |
| **Learner** | learner@demo.com | Learner@123 |
| **Tutor** (verified) | tutor@demo.com | Tutor@123 |
| **Tutor** (pending review) | pending.tutor@demo.com | Tutor@123 |

> Email verification emails are captured by the local mail server at http://localhost:8025 — no real emails are sent.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, Tailwind CSS |
| Backend | Node.js, Express.js, Socket.IO |
| Database | PostgreSQL 15, Prisma ORM |
| Auth | JWT (access + refresh tokens) |
| Payments | Stripe |
| Infrastructure | Docker, Nginx (reverse proxy) |

---

## Stopping the Application

```bash
docker compose down
```

To also delete all database data:

```bash
docker compose down -v
```
