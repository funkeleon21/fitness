# ADR-0007: Supabase als Postgres + Auth + Storage

## Status
Accepted — 2026-05-11

## Kontext
Aus [ADR-0002](./0002-postgres-jsonb.md) folgt, dass wir Postgres mit JSONB nutzen. Daneben brauchen wir:

- **Authentifizierung** (auch wenn initial nur ein Nutzer — RLS basiert darauf, siehe [ADR-0009](./0009-rls-ab-tag-1.md)),
- **File-Storage** für Fotos (Mahlzeiten, Körperbilder),
- später **pgvector** für Ähnlichkeitssuche (Personal Food Memory in Phase 5),
- **Row Level Security** als integrierten Mechanismus.

Wir wollen diese Bausteine nicht selbst zusammenstecken oder mit getrennten Anbietern verwalten.

## Entscheidung
Wir nutzen **Supabase** als verwaltetes Bundle aus:

- Postgres (Datenbank inkl. pgvector und pg_cron),
- Auth (User-Management, Session, OAuth-Provider),
- Storage (S3-kompatibles File-Storage),
- Realtime (optional, später für Cross-Device-Sync).

Bewusst **nicht** genutzt:

- **Supabase Edge Functions** — Compute läuft auf Vercel (siehe [ADR-0006](./0006-vercel-hosting.md)). Edge Functions kommen nur dort zum Einsatz, wo Vercels Function-Timeouts nicht reichen und kein anderer Mechanismus passt.
- **Supabase-CLI-Migrations** — Schema-Migrations laufen ausschließlich über Drizzle (siehe [ADR-0008](./0008-drizzle-migrations.md)).

## Konsequenzen
**Positiv:**
- Eine einzige Plattform für DB + Auth + Storage; deutlich weniger Setup-Aufwand.
- **pgvector** ohne separate Vector-DB verfügbar — direkt relevant für Personal Food Memory.
- **pg_cron** für DB-interne Projektions-Refreshes.
- **RLS** ist erstklassig unterstützt, Auth-Hooks (`auth.uid()`) integrieren sich direkt in Policies.
- Lokale Entwicklung über Supabase-CLI mit Docker funktioniert sauber.
- Supabase ist Open Source — bei Bedarf selbst-hostbar; kein harter Lock-in.

**Negativ:**
- Free-Tier pausiert ein Projekt nach 1 Woche Inaktivität → erster Request danach hat einen Wake-up-Delay (für tägliche Nutzung irrelevant).
- 500 MB DB im Free-Tier — reicht für persönliche Eventdaten viele Jahre, aber bei Foto-Storage schnell knapp; ggf. Pro-Plan ($25/Monat).
- Supabase-spezifische APIs (Auth-Client, Storage-Client) sind nicht standardisiert; Wechsel kostet Adapter-Arbeit.
- Geringe zusätzliche Latenz, falls Vercel- und Supabase-Regions nicht zusammenpassen — bei Wahl identischer Regions vernachlässigbar.

## Alternativen
- **Eigenes Postgres-Hosting (Railway, Neon, Crunchy) + Clerk + S3:** Verworfen. Mehr Vendor, mehr Glue-Code, kein integriertes RLS-Story.
- **Neon + selbst gebaute Auth:** Verworfen. Auth selbst zu bauen ist auf Solo-Niveau ein Risiko, das wir nicht eingehen wollen.
- **Self-hosted Postgres + Keycloak + MinIO:** Verworfen. Operativ aufwändig, kein Mehrwert für Solo-Use.
- **Firebase:** Verworfen. NoSQL, kein Postgres → bricht ADR-0002.
