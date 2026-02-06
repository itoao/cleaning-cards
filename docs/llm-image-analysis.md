# LLM Image Analysis Plan

## Goal / Output
- Outputs: priority, estimated time, location (desk/floor/etc), and actual item names (e.g., clothes, cup noodle trash)
- Quality focus: accuracy
- Data retention: do not store images

## Data Flow (No Storage)
- Client: capture photo -> resize/compress -> remove EXIF -> upload -> render results
- Server: receive temp -> call LLM -> return structured result -> discard immediately

## Image Processing / Upload
- Resize: long edge 1024-1280px
- Compression: JPEG quality 0.7-0.8
- EXIF: remove before upload
- Retry: 2 attempts with backoff
- Timeout: 20-30s

## LLM / Model
- Model: Gemini 3 Flash Preview via OpenRouter
- Input: 1 image + short instruction
- Output: strict JSON only (schema-validated)

## Output Schema (Draft)
{
  "overall": {
    "priority": "high|medium|low",
    "estimated_minutes": 0,
    "summary": ""
  },
  "areas": [
    {
      "location": "desk|floor|bed|shelf|counter|other",
      "priority": "high|medium|low",
      "estimated_minutes": 0,
      "items": [
        {
          "name": "",
          "type": "trash|clothes|dish|paper|electronics|other",
          "count": 0,
          "action": "throw|laundry|wash|put_away|sort|other"
        }
      ]
    }
  ],
  "notes": []
}

## Prompt Direction (Draft)
- Identify location, item names, priority, and estimated minutes from the image
- Output JSON only, no extra text
- If uncertain, put in notes

## Prompt (Draft)
System:
- You are a cleaning assistant. Analyze the photo and output JSON only.
- Follow the schema exactly. Do not include extra keys.
- Use specific item names when visible.
- If 5+ items are visible, list only the top 5 obvious items and aggregate the rest.
- If uncertain, add a short note in notes.

User:
Analyze this room photo and output the JSON schema.

## Output Validation / Rules
- Must be valid JSON only
- Must match the schema keys and value constraints
- If items count >= 5, limit items list to 5 and add one aggregated item
- Locations must be one of: desk, floor, bed, shelf, counter, other
- Priority must be: high, medium, low
- Estimated minutes: integer >= 0

## Open Questions
- Location categories: keep as above or expand?
- Item granularity: specific (e.g., "cup noodle trash") vs generic ("trash")?

## Granularity Decision
- Use specific item names where visible (e.g., "cup noodle trash")
- If items are too many or unclear (5+ items), prioritize top 5 obvious items
  and aggregate the rest as a single grouped item (e.g., "mixed small trash")
