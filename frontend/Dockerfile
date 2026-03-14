FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile --filter tutorconnect-frontend...

COPY frontend ./frontend

WORKDIR /app/frontend
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
