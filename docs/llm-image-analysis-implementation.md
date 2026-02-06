# LLM Image Analysis Implementation

## API Design (Server)
- Endpoint: `POST /api/analysis/room-photo`
- Request: multipart form-data
  - `image`: JPEG
  - `locale`: optional (e.g., "ja-JP")
- Response: JSON per schema (see `docs/llm-image-analysis.md`)
- Storage: no persistence; discard buffers after response

## Client Flow (Expo)
- Capture photo -> resize/compress -> strip EXIF -> upload
- On success: render cards from response
- On failure: show retry CTA + fallback message

## OpenRouter Call
- Model: `google/gemini-3-flash-preview`
- Content:
  - system: strict JSON-only output + schema constraints
  - user: short instruction + image
- Timeouts: 20-30s
- Retries: 2 with exponential backoff

## Validation
- JSON parse required
- Schema validation with strict enums and required keys
- If invalid:
  - 1 retry with a "fix output" prompt
  - If still invalid, return a safe fallback:
    - overall: medium, 5-10 minutes
    - areas: 1 generic area with "mixed small trash"

## Error Handling
- Network: retry with backoff (client)
- LLM timeout: return fallback message + ask for retake
- Too large image: client-side resize and reject > 5MB

## Retake UX
- Pre-capture guide: light/angle/distance tips before shooting
- Post-analysis check: if confidence is low, prompt "retake"
- Trigger conditions (examples):
  - Image too dark or blurry
  - Location cannot be identified
  - Item list quality too low (e.g., only generic items)

## Security / Privacy
- Strip EXIF client-side
- Do not log raw image or base64
- Log only: request id, latency, success/fail, model name

## Implementation Notes
- Consider serverless function for short-lived processing
- Consider queueing if concurrency spikes
