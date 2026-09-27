# syntax=docker/dockerfile:1

# --- build: compile TypeScript to dist/ (needs devDependencies) ---
FROM node:22-alpine AS build
WORKDIR /app
# bcrypt is a native module; its prebuilt binary may not match Alpine's musl
# libc, in which case npm falls back to compiling it from source, which
# needs these tools. They never make it into the runner stage.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- prod-deps: install only production dependencies (bcrypt included) ---
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runner: minimal production image, no build tools, no devDependencies ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# The "node" user/group already exists in the official node:22-alpine image.
USER node

EXPOSE 3000

CMD ["node", "dist/main"]
