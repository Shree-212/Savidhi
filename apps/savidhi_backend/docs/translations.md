# Translations (en ↔ hi)

## Why

Devotees consume the catalog in two languages. Rather than re-fetching at read time, every translatable catalog column has a sibling: `name` + `name_hi` + `name_en`. The web/mobile client picks the column matching the user's locale and falls back to the canonical column via SQL COALESCE.

Migration 013 introduced the `_hi` siblings; 026 extended the pattern to all catalog tables; 027 added the `_en` siblings so when the admin types the canonical value in Hindi (Devanagari), the en sibling gets a phonetic Hinglish transliteration for English users to read aloud.

## Direction logic

The canonical column accepts either language. On write, `detectLocale()` ([`services/catalog-service/src/lib/translate.ts`](../services/catalog-service/src/lib/translate.ts)) checks for any Devanagari character:

- **Canonical is English (Latin script)** → `_en` = canonical, `_hi` = Google Translate en→hi.
- **Canonical is Hindi (Devanagari)** → `_hi` = canonical, `_en` = phonetic transliteration (NOT a meaning translation — proper nouns lose meaning when translated literally; Hinglish read-aloud is the right form).

The transliterator is hand-rolled at [`services/catalog-service/src/lib/transliterate.ts`](../services/catalog-service/src/lib/transliterate.ts).

## Lazy on-write vs background backfill

Two entry points populate the siblings:

1. **Lazy on-write** — when the admin CRUDs a catalog row, the catalog route wraps the insert/update with `lazyTranslate.fillSiblings()` ([`services/catalog-service/src/lib/lazyTranslate.ts`](../services/catalog-service/src/lib/lazyTranslate.ts)). It runs in the background ("Run translations in background" commit `ae8d496`) so the admin save returns immediately; the user sees the canonical value, the siblings show up on next refresh.
2. **Background backfill** — when a new translatable column is added (a new migration like 026/027), an operator runs the backfill script:
   ```
   docker-compose exec catalog-service node dist/scripts/backfill-translations.js
   ```
   See [`services/catalog-service/src/scripts/backfill-translations.ts`](../services/catalog-service/src/scripts/backfill-translations.ts).

## Silent fallback

If Google's API errors (or there's no ADC locally), `googleTranslateEnToHi()` returns `null`, the sibling stays empty, and the client's COALESCE renders the canonical. The user always sees something — never blanks.

## Auth (Google Cloud Translation)

Uses Application Default Credentials.

- **Prod (GKE)** — Workload Identity binds the pod's k8s SA (`savidhi-eso`) to a GCP SA holding `roles/cloudtranslate.user`.
- **Local** — runs without ADC by default → silent fallback. To exercise translations locally, `gcloud auth application-default login` and mount `~/.config/gcloud` into the catalog-service container.

## Files

- [`services/catalog-service/src/lib/translate.ts`](../services/catalog-service/src/lib/translate.ts) — Google client wrapper, detect, scalar/array helpers.
- [`services/catalog-service/src/lib/lazyTranslate.ts`](../services/catalog-service/src/lib/lazyTranslate.ts) — async fillSiblings called from CRUD routes.
- [`services/catalog-service/src/lib/transliterate.ts`](../services/catalog-service/src/lib/transliterate.ts) — Devanagari → Hinglish.
- [`services/catalog-service/src/scripts/backfill-translations.ts`](../services/catalog-service/src/scripts/backfill-translations.ts) — operator-run backfill.
- [`migrations/013_translations.sql`](../migrations/013_translations.sql), [`026_translations_extended.sql`](../migrations/026_translations_extended.sql), [`027_translations_en_siblings.sql`](../migrations/027_translations_en_siblings.sql).
