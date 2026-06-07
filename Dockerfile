FROM node:20-bookworm-slim

LABEL org.opencontainers.image.title="jdh5st ARM64 study server"
LABEL org.opencontainers.image.description="ARM64-friendly local study scaffold for jdh5st. Real JD cookie/request automation is intentionally disabled."
LABEL org.opencontainers.image.source="https://github.com/f63531119/jdh5st"

WORKDIR /app

ARG BUILD_COMMIT=unknown
ARG BUILD_TIME=unknown

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    BUILD_COMMIT=$BUILD_COMMIT \
    BUILD_TIME=$BUILD_TIME

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
