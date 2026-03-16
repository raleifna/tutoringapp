FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY backend/prisma backend/prisma
RUN pnpm install --frozen-lockfile --filter tutorconnect-backend...

COPY backend ./backend

WORKDIR /app/backend
RUN pnpm exec prisma generate

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["pnpm", "start"]
