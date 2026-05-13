# Event-Modell

Events sind die einzige Wahrheit des Systems. Jede Eingabe wird als append-only Event gespeichert und Projektionen werden daraus reproduzierbar aufgebaut.

## Envelope

Jedes Event hat einen gemeinsamen Envelope:

| Feld | Bedeutung |
|---|---|
| `id` | Eindeutige Event-ID. |
| `user_id` | Besitzer des Events, durch RLS isoliert. |
| `type` | Event-Typ, z.B. `weight_logged`. |
| `version` | Payload-Version fuer Schema-Evolution. |
| `occurred_at` | Fachliche Zeit: wann das Ereignis passiert ist. |
| `recorded_at` | Log-Zeit: wann das Event im System erfasst wurde. Projektionen replayen nach `recorded_at, id`. |
| `source` | Ursprung der Eingabe: `manual`, `voice`, `photo`, `qr`, `import`, `ai-extracted`. |
| `external_id` | Optionaler Idempotenz-Schluessel der Quelle. Pro `user_id + source + external_id` darf es nur ein Event geben. |
| `confidence` | Konfidenz fuer unsichere/AI-extrahierte Daten. |
| `raw_input` | Originaleingabe oder Referenz darauf. Pflicht fuer `ai-extracted`. |
| `provenance` | Technische Herkunft, z.B. Modell und Prompt-Hash. Pflicht fuer `ai-extracted`. |
| `payload` | Typisierte Event-Daten als JSONB. |

## Zeit-Semantik

`occurred_at` ist die Zeitachse der Fachlichkeit: Charts, Trends und Historien sortieren nach ihr.

`recorded_at` ist die Zeitachse des Event-Logs: Projektions-Replay, Backfills und Korrekturketten verwenden `recorded_at, id`, damit gleiche Inputs deterministisch dieselbe Projektion ergeben.

## Idempotenz

Quellen, die wiederholt senden koennen, setzen `external_id`.

Beispiele:

- Import: stabile ID aus Quelldatei + Zeilennummer + Hash.
- Voice/Foto: Upload-ID oder Transkriptions-Job-ID.
- LLM-Reinterpretation: Hash aus Rohinput, Prompt-Version und Modell.

Manuelle Formulare duerfen `external_id = null` lassen. Dann ist jede Speicherung ein neues Event.

## KI-Provenance

Events mit `source = "ai-extracted"` brauchen:

- `confidence`
- nicht-leeres `raw_input`
- `provenance.model`
- `provenance.prompt_hash`

Optional, aber empfohlen:

- `provenance.provider`
- `provenance.model_version`
- `provenance.input_hash`

Damit kann ein altes Rohsignal spaeter mit einem besseren Modell neu interpretiert werden, ohne historische Daten zu verlieren.
