# Kernprinzipien

Diese Prinzipien sind **Entscheidungs-Filter**. Bei jeder Architektur-, Feature- oder UX-Entscheidung gilt: Wenn ein Vorschlag gegen mehrere dieser Prinzipien verstößt, ist er wahrscheinlich falsch — egal wie attraktiv er kurzfristig wirkt.

---

## 1. Evidence-based

Empfehlungen, Schätzungen und Berechnungen müssen auf nachvollziehbaren wissenschaftlichen Grundlagen basieren. Keine Bauchgefühl-Heuristiken im Code, die als „Wissen" verkauft werden.

**Filter:** Kann ich die Quelle der Formel/Heuristik/Schwellenwerte benennen? Wenn nein → markieren als unsichere Schätzung oder gar nicht erst einbauen.

---

## 2. Transparent Reasoning

Jede KI-Aussage hat eine Begründungskette: zugrundeliegende Daten → erkannte Muster → Hypothese → Konfidenz → Empfehlung. Der Nutzer kann diese Kette jederzeit aufklappen.

**Filter:** Würde ein Wissenschaftler diese Aussage so akzeptieren? Wenn die Begründung im Code nicht reproduzierbar ist, gehört sie nicht raus.

---

## 3. Trend-based statt Tagesbasiert

Einzelne Datenpunkte (besonders Gewicht) sind verrauscht. Das System denkt in Bewegungsdurchschnitten, Steigungen und Konfidenzintervallen — nicht in „heute +0.3kg".

**Filter:** Wenn eine UI-Komponente einen einzelnen Tageswert prominent zeigt, ist sie verdächtig. Default ist Trend, Einzelwert nur auf explizite Anforderung.

---

## 4. Minimal Friction

Eingaben müssen so reibungsarm wie möglich sein. Sprache > Foto > Freitext > Formular. Pflichtfelder sind die Ausnahme. Kein tägliches Pflichtjournal.

**Filter:** Bei jedem neuen Eingabefluss: Was ist der schnellste mögliche Weg, dieses Datum reinzubekommen? Wenn die Antwort „Formular" ist, denk weiter.

---

## 5. Personalisierung

Vorlieben, Abneigungen, Schmerzen, Prioritäten und individuelle Reaktionen fließen in jede Empfehlung ein. Generische „Best Practices" werden nur dort eingesetzt, wo persönliche Daten fehlen.

**Filter:** Würde diese Antwort identisch für jeden Nutzer aussehen? Wenn ja, ist sie zu generisch.

---

## 6. Langfristiges Lernen

Das System wird über Monate und Jahre intelligenter. Architektur und Datenmodell müssen so gebaut sein, dass historische Daten jederzeit mit verbesserten Modellen reinterpretiert werden können.

**Filter:** Werfen wir Roh-Informationen weg (z.B. den ursprünglichen Sprachtext nach KI-Extraktion)? Wenn ja → Fehler, alles aufheben.

---

## 7. Wissenschaftliche Ehrlichkeit

Unsicherheit wird ausgesprochen, nicht versteckt. Lieber „Konfidenz 60% — Datenbasis dünn" als eine präzise klingende Falschaussage.

**Filter:** Versteckt der UI-Text gerade Unsicherheit (gerundete Zahlen ohne Range, ein einzelner „TDEE-Wert")? Dann fehlt eine Konfidenz- oder Range-Angabe.

---

## 8. Flexible / Modulare Architektur

Neue Domänen (Koffein, Fokus, Supplements, Hautbild, Stress, ...) müssen jederzeit hinzufügbar sein, ohne dass bestehende Strukturen aufgerissen werden. Neue Event-Typen statt erweiterte Tabellen.

**Filter:** Erfordert dieses neue Feature eine Datenbank-Migration mit Schema-Änderung? Wenn ja → vermutlich falscher Ansatz, ein neuer Event-Typ wäre richtig.

---

## 9. Strukturierte Daten statt KI-Chaos

Die KI ist nicht die Datenbank. Sie übersetzt Sprache/Bilder in strukturierte Events. Die Wahrheit liegt in typisierten, versionierten Events und reproduzierbaren Projektionen.

**Filter:** Wenn die einzige Quelle eines Wertes „KI hat das mal gesagt" ist (ohne dass es als Event mit Konfidenz gespeichert wurde), ist das System nicht reproduzierbar — Fehler.

---

## 10. Interpretation wichtiger als Tracking

Jedes neue Feature wird daran gemessen: Verbessert es die Interpretationsfähigkeit, oder fügt es nur einen weiteren Tracking-Knopf hinzu? Tracking ist nur Mittel zum Zweck.

**Filter:** Vor jedem Feature: Welche neue Frage kann das System danach besser beantworten? Wenn keine — Feature überspringen.
