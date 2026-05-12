# ADR-0006: Vercel als Hosting

## Status
Accepted — 2026-05-11

## Kontext
Die App ist eine Next.js PWA mit Server Actions / Route Handlers. Für Solo-Nutzung mit langfristiger Persönlich-Datenkonservierung brauchen wir:

- niedrige Operations-Last (Solo-Entwickler, keine DevOps-Kapazität),
- schnelle Iteration mit Preview-Deployments pro Branch,
- zuverlässige Cron-Jobs für tägliche Aggregationen,
- akzeptable Skalierbarkeit bei wachsendem KI-Aufwand,
- portierbarkeit, falls wir später wechseln wollen.

## Entscheidung
Wir hosten die Next.js-Anwendung auf **Vercel**, mit:

- **Vercel Cron** für zeitgesteuerte App-seitige Jobs (z.B. tägliche Auswertungen, Erinnerungen),
- **Preview-Deployments** für jeden Branch,
- **Server Actions** und **Route Handlers** als Backend (kein separater Service initial).

Lange laufende Workloads (umfangreiche KI-Interpretationen) laufen **asynchron** über Events — nicht in einem einzelnen Function-Call (siehe [architecture.md](../architecture.md), Abschnitt „Lange laufende KI-Workloads").

Wir vermeiden bewusst Vercel-spezifische APIs (Edge Config, Vercel KV), damit die Anwendung auf jedem Node-Host läuft.

## Konsequenzen
**Positiv:**
- Beste Next.js Developer Experience (Vercel und Next.js werden vom gleichen Team gepflegt).
- Preview-Deployments für jede Änderung — sehr wertvoll bei UI-Iteration.
- Zero-Config-Deployment, sehr schnelle Builds.
- Free-Tier reicht für persönlichen Solo-Use weit aus.
- Cron-Jobs ohne zusätzliche Infrastruktur.

**Negativ:**
- Function-Timeouts (10s im Free-Plan, bis 300s im Pro-Plan mit Fluid Compute) zwingen zu asynchroner Verarbeitung bei langen Workloads — was wir aber ohnehin wollen.
- Bandbreite und Function-Execution-Time können bei viel KI-Traffic kostspielig werden; bei Solo-Nutzung unkritisch.
- Geringer Lock-in durch Build-System und Infrastruktur (mitigiert durch Vermeidung Vercel-spezifischer APIs).

## Alternativen
- **Self-hosted (VPS/Hetzner/Fly.io):** Verworfen. Höherer Ops-Aufwand, kein Preview-Deployment out-of-the-box, mehr Sorge um Uptime — kein Mehrwert für Solo-Use.
- **Railway / Render:** Solide, aber Next.js-DX schlechter als bei Vercel, kein gleichwertiges Preview-System.
- **AWS (Amplify / ECS):** Massiver Overkill und steile Lernkurve für diesen Anwendungsfall.
- **Supabase Edge Functions als Backend statt Vercel:** Verworfen. Deno-Runtime, schlechtere Next.js-Integration; sinnvoll nur für spezifische Workloads.
