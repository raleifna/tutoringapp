# TutorConnect — Setup & Run Guide

## Prerequisites

- `git`
- Docker Desktop (macOS / Windows) or Docker Engine + Docker Compose (Linux)
- macOS / Linux only: `bash` and `curl`
- Make sure these local ports are available, or change them in the root `.env` file: `8080`, `3000`, `5050`, `15432`, `1025`, `8025`

You do not need to install PostgreSQL, Prisma, or Node.js locally for the standard Docker-based setup.

## Quick Start (Recommended)

### 1. Clone the repository

```bash
git clone https://github.com/unsw-cse-comp99-3900/capstone-project-26t1-9900-f09c-cake.git
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
- Create a root `.env` file from `.env.example` on first run
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

If one of those ports is already in use, update the matching value in the root `.env` file and rerun the startup script.

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

## Environment Notes

- The root `.env` file is used by Docker Compose for local development.
- The defaults in `.env.example` are enough for a full local run on a new machine.
- Stripe keys are optional locally. Leave them blank unless you want to test Stripe flows.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14.1, React, Tailwind CSS |
| Backend | Node.js, Express.js, Socket.IO |
| Database | PostgreSQL 15, Prisma ORM |
| Auth | JWT (access + refresh tokens) |
| Payments | Stripe |
| Infrastructure | Docker, Nginx (reverse proxy) |

---

## Stopping the Application

```bash
docker compose -p tutorconnect down
```

To also delete all database data:

```bash
docker compose -p tutorconnect down -v
```
