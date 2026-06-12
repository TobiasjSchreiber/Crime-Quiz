# Crime Show Quiz: "DOSCHAUHER, EIN MORD!" 🕵️‍♂️🩸

Ein interaktives Echtzeit-Umfragewerkzeug (ähnlich wie Mentimeter) speziell für Live-Krimishows. Die Anwendung läuft komplett serverlos (statisches HTML/JS/CSS), wird auf **GitHub Pages** gehostet und nutzt **Supabase** als kostenlose Echtzeit-Datenbank.

Deine Live-Links:
- **Zuschauer-Voting (Voter)**: [https://tobiasjschreiber.github.io/Crime-Quiz/](https://tobiasjschreiber.github.io/Crime-Quiz/)
- **Moderator-Panel (Admin)**: [https://tobiasjschreiber.github.io/Crime-Quiz/?role=admin](https://tobiasjschreiber.github.io/Crime-Quiz/?role=admin)
- **Beamer-Leinwand (Presenter)**: [https://tobiasjschreiber.github.io/Crime-Quiz/?role=presenter](https://tobiasjschreiber.github.io/Crime-Quiz/?role=presenter)

### Am Handy

<img alt="image" src="https://github.com/user-attachments/assets/408414cb-ddd3-4000-bc19-d8e7659d1505" width="25%">

### Live Vorschau

<img src="https://github.com/user-attachments/assets/7440da29-33a9-4545-a76f-bf289cabbda3" width="50%">

<img src="https://github.com/user-attachments/assets/fb79127e-5252-421e-bc5d-f42b48784ded" width="50%">

### Admin Dashboard

<img src="https://github.com/user-attachments/assets/fb576ef9-4039-4289-a25b-d2e7b0fe316f" width="50%">




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
