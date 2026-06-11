# Setup- & Bedienungsanleitung: Crime Show Quiz ("DOSCHAUHER, EIN MORD!")

Diese Anleitung führt dich Schritt für Schritt durch die Einrichtung der Echtzeit-Abstimmung für dein Live-Event. Da die Anwendung komplett im Browser läuft (statische HTML/JS-Dateien), nutzen wir **Supabase** als kostenlose Echtzeit-Datenbank.

---

## 1. Supabase-Datenbank einrichten (Dauer: ca. 2-3 Minuten)

Da das Quiz in Echtzeit Wählerstimmen empfangen soll, musst du ein kostenloses Supabase-Projekt anlegen.

1. Gehe auf [supabase.com](https://supabase.com) und erstelle einen kostenlosen Account.
2. Erstelle ein neues Projekt (Name z. B. `crime-quiz`). Vergebe ein sicheres Datenbank-Passwort und wähle einen Server-Standort in deiner Nähe (z. B. Frankfurt/Europe Central).
3. Sobald das Projekt bereitgestellt wurde (ca. 1 Minute), klicke im linken Menü auf **SQL Editor** (das Icon mit `SQL`).
4. Klicke oben links auf **New query** (Leere Abfrage erstellen).
5. Kopiere das folgende SQL-Skript komplett und füge es in das Textfeld ein:

```sql
-- 1. Fragen-Tabelle erstellen
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  options jsonb NOT NULL, -- Array von Strings: ["Gärtner", "Butler", ...]
  silhouettes jsonb NOT NULL, -- Array von Strings: ["man-hat", "butler", ...]
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Quiz-Status-Tabelle erstellen (Welche Frage ist aktiv? Sollen Ergebnisse angezeigt werden?)
CREATE TABLE IF NOT EXISTS quiz_state (
  id integer PRIMARY KEY DEFAULT 1,
  active_question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  show_results boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT single_row CHECK (id = 1) -- Nur eine einzige Zeile erlaubt
);

-- Initiale Zeile einfügen falls noch nicht vorhanden
INSERT INTO quiz_state (id, show_results) 
VALUES (1, false) 
ON CONFLICT DO NOTHING;

-- 3. Stimmen-Tabelle erstellen (Für die Echtzeit-Abstimmung)
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  option_index integer NOT NULL,
  device_id text NOT NULL, -- Zur Verhinderung von Mehrfachstimmen
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_vote_per_device UNIQUE (question_id, device_id)
);

-- 4. Realtime (Echtzeit-Updates) für die Tabellen aktivieren
-- Wir fügen die Tabellen der Publikation hinzu (kann bei wiederholter Ausführung ignoriert werden)
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_state, votes, questions;
```

6. Klicke rechts unten auf den grünen Button **Run**, um das Skript auszuführen. In der Konsole sollte `"Success. No rows returned"` stehen.
7. Deine Datenbank ist nun bereit!

---

## 2. API-Zugangsdaten kopieren

Um die App mit deiner Datenbank zu verbinden, benötigst du die URL und den API-Key deines Supabase-Projekts.

1. Klicke im linken Menü von Supabase ganz unten auf das Zahnrad-Symbol (**Project Settings**).
2. Gehe im Untermenü auf den Punkt **API**.
3. Kopiere die Werte für:
   - **Project URL** (unter `Project API keys` oder `Connection info` - sieht aus wie `https://xxxxxx.supabase.co`)
   - **anon / public** Key (sieht aus wie ein extrem langer Zeichensalat beginnend mit `eyJhbGciOi...`)

---

## 3. Quiz starten & Konfigurieren

### Lokaler Schnellstart zum Testen
1. Öffne die PowerShell in deinem Projektordner (`C:\My_Skripts_Local\Crime Quiz`).
2. Starte den lokalen Webserver mit:
   ```powershell
   npm run dev
   ```
3. Öffne im Browser die Adresse: [http://localhost:8080](http://localhost:8080).
4. Da die App noch nicht eingerichtet ist, siehst du automatisch den **DATENBANK EINRICHTEN**-Screen.
5. Trage hier Folgendes ein:
   - **Supabase Project URL**: Deine kopierte Project URL.
   - **Supabase Anon Key**: Deinen kopierten anon/public Key.
   - **Admin Passwort**: Ein beliebiges Passwort deiner Wahl (z.B. `mord123`). Dieses schützt dein Admin-Panel auf diesem Gerät.
6. Klicke auf **Verbindung Speichern**. Die App lädt sich neu und verbindet sich.

---

## 4. Nutzung im Live-Betrieb

### A. Moderator-Panel (Admin)
- Um das Admin-Panel zu öffnen, navigiere zu:
  `http://localhost:8080/?role=admin`
- Gib dein bei der Einrichtung gewähltes Admin-Passwort ein.
- **Fragen anlegen**: Klicke auf **+ Neue Frage**, gib die Frage ein, füge Antwortmöglichkeiten (die Namen der Verdächtigen) hinzu und wähle für jeden Verdächtigen eine passende Silhouette aus. Klicke auf **Speichern**.
- **Frage aktivieren**: Klicke bei einer Frage auf **Aktivieren**. Dadurch wird diese Frage live an alle Zuschauer übertragen.
- **Ergebnisse steuern**: Über den Button **Ergebnisse anzeigen/verbergen** kannst du steuern, ob die Ergebnisse live auf dem Beamer wachsen oder bis zum Enthüllungsmoment verdeckt bleiben.
- **Presenter öffnen**: Klicke auf **Präsentationsfenster öffnen ↗**.

### B. Beamer-Screen (Presenter)
- Öffnet sich über:
  `http://localhost:8080/?role=presenter` (oder über den Link im Admin-Panel).
- Dieser Screen wird auf die Leinwand projiziert. Er zeigt das Quiz-Logo, einen dynamisch generierten QR-Code und die Live-Grafik.
- Wenn Zuschauer den QR-Code scannen, öffnet sich deren Wähler-Ansicht auf dem Smartphone. Die Verbindungsdaten zur Datenbank sind sicher im QR-Code verschlüsselt, d.h. Zuschauer müssen nichts konfigurieren!

### C. Zuschauer-Ansicht (Voter)
- Öffnet sich über das Scannen des QR-Codes oder direkt unter:
  `http://localhost:8080/?role=voter` (mit den entsprechenden URL-Parametern für Supabase).
- Zeigt die aktuelle Frage an. Der Zuschauer wählt einen Verdächtigen und tippt auf dessen Button.
- Sobald die Stimme abgegeben ist, sperrt `localStorage` ein erneutes Abstimmen für diese Frage auf diesem Gerät.
- Sobald der Admin die nächste Frage aktiviert, wechselt das Smartphone des Zuschauers automatisch (ohne Neuladen) zur neuen Frage.

---

## 5. Deployment auf GitHub Pages

Wenn du die App online stellen möchtest, damit Zuschauer über das Internet abstimmen können:
1. Erstelle ein öffentliches GitHub-Repository.
2. Lade alle Projektdateien (`index.html`, `style.css`, `app.js`, `voter.js`, `presenter.js`, `admin.js`, `package.json`, `Walkthrough.md`) in das Repository hoch.
3. Gehe im Repository auf **Settings** -> **Pages**.
4. Wähle unter *Build and deployment* -> *Source* den Eintrag **Deploy from a branch** und wähle deinen `main`- oder `master`-Branch sowie den Ordner `/ (root)`. Klicke auf **Save**.
5. Nach 1-2 Minuten ist deine App unter `https://dein-benutzername.github.io/dein-repo-name/` erreichbar.
6. Rufe die GitHub-URL mit `?role=admin` auf, richte die Datenbank ein und die App generiert automatisch QR-Codes mit deiner Online-URL!
