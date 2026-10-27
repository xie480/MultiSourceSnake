FROM node:22-slim as builder

WORKDIR /app

COPY package.json yarn.lock ./

COPY tsconfig.json ./

COPY packages packages

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*


RUN export YARN_CACHE_FOLDER="$(mktemp -d)" \
    && yarn install --frozen-lockfile \
    && rm -r "$YARN_CACHE_FOLDER"

RUN yarn build:action

FROM node:22-slim

WORKDIR /action-release

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    python3 \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && npm install --no-package-lock --no-save canvas@3.2.3 gifsicle@5.3.0 \
    && apt-get purge -y python3 make g++ pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/packages/action/dist/ /action-release/

CMD ["node", "/action-release/index.js"]

