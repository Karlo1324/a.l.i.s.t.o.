# A.L.I.S.T.O. machine-learning implementation guide

This guide covers five assistive features. They should produce suggestions for residents or officials to review. They should not automatically reject reports, publish broadcasts, or dispatch responders.

## Existing integration points

- `src/data/records.ts` contains the `Incident` and `AISuggestion` shapes.
- `src/store.tsx` owns local incident state and report updates.
- `src/lib/submitResidentReport.ts` sends authenticated reports to Supabase.
- `src/admin/Verification.tsx` is the official review surface.
- `src/admin/Monitoring.tsx` provides map coordinates and filters.
- `src/admin/BroadcastForm.tsx` publishes an official broadcast after an official submits it.
- `supabase/migrations/` contains the database schema and staff RPCs.

Keep model calls behind a server or Supabase Edge Function. Do not place provider API keys in the Vite or Expo client bundles.

## Shared ML contract

Create one server endpoint such as `POST /functions/v1/incident-assist`. Accept a versioned request:

```json
{
  "task": "duplicate | location | cluster | broadcast | photo",
  "report_id": "uuid",
  "input": {},
  "model_version": "2026-01-01"
}
```

Return a reviewable result:

```json
{
  "suggestion": {},
  "confidence": 0.0,
  "reasons": ["..."],
  "model_version": "2026-01-01",
  "generated_at": "2026-11-28T00:00:00Z"
}
```

Store the result separately from the resident’s original text. Keep the original input, model version, confidence, reasons, reviewer decision, and decision timestamp for auditability.

## 3. Duplicate detection

Goal: flag reports that may describe the same incident.

Inputs:

- New and existing report coordinates
- Created time
- Category, title, description, address, and purok
- Optional photo embeddings

Start with a deterministic candidate filter before using a model:

1. Search reports from the same category within a configurable distance, such as 250 metres.
2. Limit candidates to a recent time window, such as 72 hours.
3. Exclude rejected reports and the current report.
4. Compare text using a multilingual embedding or token similarity.
5. Combine distance, time, category, and text scores.

Store candidates in a table such as `incident_duplicate_candidates` with `report_id`, `candidate_id`, `score`, `reasons`, `model_version`, and `reviewed_at`.

Display the highest-scoring candidates in `src/admin/Verification.tsx`. Let the official compare both reports and mark the new report as a duplicate. Never merge or reject automatically.

Evaluation: measure precision at the top three candidates. A false duplicate is more damaging than an extra review, so start with a high review threshold and tune it against confirmed official decisions.

## 4. Location validation

Goal: identify whether a report’s coordinates, written address, and assigned barangay agree.

Inputs:

- Latitude and longitude
- Selected barangay and purok
- Written address or landmark
- Barangay boundary polygons or authoritative geocoding results

Implementation:

1. Validate latitude and longitude ranges.
2. Perform a point-in-polygon check against the assigned barangay boundary.
3. Geocode the written address when a trusted geocoder is configured.
4. Compare the geocoder result with the submitted point using a distance threshold.
5. Return `valid`, `needs_review`, or `outside_area`, with the distance and reason.

Store the validation result on a server-side report-assistance record. Show it as a verification check in `src/admin/Verification.tsx`. A resident may still submit a report when the check fails. Officials decide whether to correct the location or reject the report.

Do not send precise resident coordinates to an external provider unless the privacy notice and data-sharing agreement allow it. Cache geocoder results where lawful and minimize the stored address text.

## 6. Incident clustering

Goal: group nearby reports into a developing event, such as one flood affecting several streets.

Inputs:

- Coordinates and timestamps
- Category and status
- Severity or danger flag
- Barangay assignment

Start with spatial-temporal clustering such as DBSCAN or a grid aggregation:

- Distance threshold: begin with 150–250 metres.
- Time window: begin with 24–72 hours.
- Minimum reports: begin with three.
- Keep category matching strict for the first version.

Write cluster records with a generated id, centroid, bounding box, category, report count, time range, and member report ids. Recompute when a report is added or its location, category, or status changes.

Use clusters in `src/admin/Monitoring.tsx` for map outlines and counts. Do not replace individual markers. Officials should be able to open a cluster and review every member report.

Evaluation: compare clusters with official incident groupings. Watch for one large cluster swallowing unrelated reports and for small clusters that should be combined.

## 8. Broadcast drafting

Goal: help an official draft a clear resident announcement from verified operational facts.

Inputs:

- Incident category and verified status
- Affected area and barangay
- Official notes
- Intended audience and expiry time
- Optional recommended action

Use a server-side text-generation endpoint with a strict structured response:

```json
{
  "title": "Heavy rain advisory",
  "body": "...",
  "recommended_action": "...",
  "expires_at": "...",
  "facts_used": ["..."],
  "uncertainties": ["..."]
}
```

Add a **Draft with assistance** action to `src/admin/BroadcastForm.tsx`. Keep the generated title and body editable. Require the official to confirm the facts, audience, and expiry before calling `publish_official_broadcast`.

Never allow the model to invent evacuation orders, road closures, casualty counts, weather measurements, or government instructions. If a fact is missing, the draft should say that it is unknown or leave it out.

Save the final human-edited broadcast and the model draft separately for audit. Do not send resident data to the generation provider when only aggregate incident facts are needed.

## 10. Photo assistance

Goal: suggest whether an uploaded image is relevant and what it may show.

Inputs:

- Compressed report photo from `src/lib/reportPhoto.ts`
- Report category and text
- Optional location context

Implementation:

1. Compress and normalize the image before upload. Keep the existing 1600px and size limits.
2. Run a vision model or a small classifier on the server.
3. Return suggested labels, confidence, image quality, and safety flags.
4. Store only the result and the image reference needed for the report workflow.

Example response:

```json
{
  "labels": [{"name": "standing water", "confidence": 0.86}],
  "quality": "usable",
  "matches_report_category": true,
  "safety_flags": [],
  "reasons": ["Water is visible across the roadway"]
}
```

Show the result as a verification aid in `src/admin/Verification.tsx`. Use wording such as “Model suggestion” and let the official accept, ignore, or correct it. The model must not determine whether a resident is truthful, identify a person, infer protected traits, or make a final safety decision.

## Delivery order

1. Location validation with point-in-polygon checks.
2. Duplicate candidates using distance, time, and text similarity.
3. Incident clustering for the monitoring map.
4. Photo quality and category suggestions.
5. Broadcast drafting with mandatory official review.

For every feature, add a disabled or unavailable state when the model service is not configured. Test with empty collections, malformed coordinates, missing photos, duplicate submissions, and provider timeouts. Keep a small reviewed test set from Binaton and Digos City with personal details removed.
