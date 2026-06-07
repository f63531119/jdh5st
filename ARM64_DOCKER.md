# ARM64 Docker study image

This repository includes a small ARM64-friendly Docker scaffold for local jdh5st study.

## Image

GitHub Actions builds and pushes:

```text
ghcr.io/f63531119/jdh5st:arm64-study
```

The image is built for `linux/arm64`.

## Run

```bash
docker run -d \
  --name jdh5st_arm64 \
  -p 127.0.0.1:3001:3001 \
  --log-opt max-file=2 \
  --log-opt max-size=50m \
  ghcr.io/f63531119/jdh5st:arm64-study
```

## Health check

```bash
curl http://127.0.0.1:3001/health
```

Expected response includes:

```json
{
  "ok": true,
  "service": "jdh5st-arm64-study",
  "mode": "study"
}
```

## Safety boundary

This server intentionally exposes only a health/study scaffold. `/sign` returns `501 SIGN_ENDPOINT_DISABLED` until an offline signer is wired explicitly.

Do not put real JD cookies into this container while using it for algorithm study.
