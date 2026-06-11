# Crime Show Quiz: "DOSCHAUHER, EIN MORD!" 🕵️‍♂️🩸

Ein interaktives Echtzeit-Umfragewerkzeug (ähnlich wie Mentimeter) speziell für Live-Krimishows. Die Anwendung läuft komplett serverlos (statisches HTML/JS/CSS), wird auf **GitHub Pages** gehostet und nutzt **Supabase** als kostenlose Echtzeit-Datenbank.

Deine Live-Links:
- **Zuschauer-Voting (Voter)**: [https://tobiasjschreiber.github.io/Crime-Quiz/](https://tobiasjschreiber.github.io/Crime-Quiz/)
- **Moderator-Panel (Admin)**: [https://tobiasjschreiber.github.io/Crime-Quiz/?role=admin](https://tobiasjschreiber.github.io/Crime-Quiz/?role=admin)
- **Beamer-Leinwand (Presenter)**: [https://tobiasjschreiber.github.io/Crime-Quiz/?role=presenter](https://tobiasjschreiber.github.io/Crime-Quiz/?role=presenter)

---

## 🚀 Features

- **3 Ansichten in einer App**:
  - **Zuschauer (Voter)**: Für Smartphones optimiert, zeigt die aktive Frage und ermöglicht das Abstimmen per Klick. Unterstützt eingebaute Silhouetten oder hochgeladene Fotos.
  - **Präsentation (Presenter)**: Für Beamer/Großbildschirm. Zeigt das Live-Diagramm der Stimmen, die Gesamtstimmanzahl und den dynamischen QR-Code.
  - **Moderator (Admin)**: Steuerung der aktiven Frage, Ein-/Ausblenden der Live-Ergebnisse, Zurücksetzen der Stimmen und Fragen-Editor.
- **Echtzeit-Synchronisierung**: Stimmen und Fragenwechsel werden über WebSockets (Supabase Realtime) in Millisekunden an alle Geräte übertragen.
- **Lokale Stimmsperre**: Verhindert doppeltes Abstimmen pro Frage.
- **Krimi-Retro-Design**: Stilvolles Vibe mit Papiertexturen, Schreibmaschinenschrift und markanten Schlagschatten.

## 📖 Bedienung während der Show

1. **Fragen vorbereiten (Admin)**: 
   Öffne [https://tobiasjschreiber.github.io/Crime-Quiz/?role=admin](https://tobiasjschreiber.github.io/Crime-Quiz/?role=admin) und erstelle deine Fragen. Du kannst eigene Bilder hochladen (werden automatisch auf 500x500 Pixel skaliert und in der DB gespeichert).
2. **Beamer einrichten (Presenter)**: 
   Öffne [https://tobiasjschreiber.github.io/Crime-Quiz/?role=presenter](https://tobiasjschreiber.github.io/Crime-Quiz/?role=presenter) auf dem Beamer-Bildschirm.
3. **Abstimmen (Voter)**: 
   Die Zuschauer scannen den QR-Code auf der Leinwand und gelangen auf [https://tobiasjschreiber.github.io/Crime-Quiz/](https://tobiasjschreiber.github.io/Crime-Quiz/).
4. **Das Spiel leiten**:
   Aktiviere die Fragen nacheinander im Admin-Panel und schalte die Ergebnisse über **Ergebnisse anzeigen** live frei.
