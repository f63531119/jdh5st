# ARM64 Docker offline-study image

This repository includes an ARM64-friendly Docker scaffold for local jdh5st study.

## Image

GitHub Actions builds and pushes:

```text
ghcr.io/f63531119/jdh5st:arm64-study
```

The image is built for `linux/arm64`.

## Run

If port `3001` is free:

```bash
docker run -d \
  --name jdh5st_arm64 \
  -p 127.0.0.1:3001:3001 \
  --log-opt max-file=2 \
  --log-opt max-size=50m \
  ghcr.io/f63531119/jdh5st:arm64-study
```

If `3001` is occupied, use host port `13001`:

```bash
docker run -d \
  --name jdh5st_arm64 \
  -p 127.0.0.1:13001:3001 \
  --log-opt max-file=2 \
  --log-opt max-size=50m \
  ghcr.io/f63531119/jdh5st:arm64-study
```

## Health check

```bash
curl http://127.0.0.1:3001/health
```

## Version

```bash
curl http://127.0.0.1:3001/version
```

Returns h5st/js versions, build commit/time, and file hashes.

## Offline sign test

```bash
curl -sS -X POST http://127.0.0.1:3001/sign/offline \
  -H 'content-type: application/json' \
  -d '{"appId":"fb5df","functionId":"testFunction","body":{"skuId":"100000000000","area":"1_72_2799_0"},"client":"pc","clientVersion":"1.0.0","t":1710000000000,"fingerprint":"test_fp"}'
```

This returns a deterministic `studyH5st` value for local/offline testing.

## Safety boundary

`POST /sign` intentionally returns `501 SIGN_ENDPOINT_DISABLED`.

`POST /sign/offline` is not a real JD h5st signer. It does not use real JD cookies, does not call JD APIs, and returns a deterministic offline study result only.
