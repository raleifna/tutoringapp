FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile --filter tutorconnect-frontend...

COPY frontend ./frontend

WORKDIR /app/frontend
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG NEXT_PUBLIC_SOCKET_URL=
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN pnpm build

EXPOSE 3000

CMD ["sh", "-c", "NODE_ENV=production pnpm start"]
