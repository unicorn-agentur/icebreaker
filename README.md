# Unicorn Icebreaker Generator 🦄

**Live URL:** [https://icebreaker-iota.vercel.app/](https://icebreaker-iota.vercel.app/)

Eine intelligente App zur Automatisierung von personalisierten Erstkontakten (Cold Outreach).

---

## 📖 Über das Projekt (Workflow)

Dieses Tool nimmt uns die manuelle Recherchearbeit ab. Statt jeden Lead einzeln zu googeln, Website zu lesen und eine E-Mail zu tippen, automatisiert der Icebreaker Generator diesen Prozess intelligent.

**Der Workflow in 3 Schritten:**

1.  **Import (Datenbasis):**
    *   Wir laden eine CSV-Liste mit Kontakten hoch (z.B. Export aus Apollo).
    *   Das Tool filtert automatisch "schlechte" Leads heraus (keine Website vorhanden oder Lead steht auf unserer internen Blacklist/Opt-Out Liste).

2.  **Generate (AI Magie):**
    *   Das Tool besucht die Website jedes Leads (via **Perplexity AI**), liest den Inhalt und versteht, was die Firma macht.
    *   Anschließend schreibt eine zweite AI (**Google Gemini 3.0**) einen charmanten, persönlichen "Icebreaker"-Satz, der zeigt: "Hey, ich habe mich wirklich mit euch beschäftigt."

3.  **Export (Outreach):**
    *   Wir überprüfen die Ergebnisse.
    *   Mit einem Klick werden die Leads inklusive des personalisierten Satzes direkt in **Lemlist** übertragen.
    *   Dort wird automatisch eine Kampagne angelegt (oder befüllt), und die E-Mails können versendet werden.

---

## ☁️ Hosting & Infrastruktur

Das Projekt ist modern und serverless aufgebaut, um Kosten zu sparen und Wartung zu minimieren.

*   **Frontend & Hosting:** [Vercel](https://vercel.com)
    *   Hier liegt die eigentliche Webseite. Vercel sorgt dafür, dass sie weltweit schnell lädt und immer online ist.
*   **Datenbank:** [Supabase](https://supabase.com)
    *   Eine Cloud-Datenbank (PostgreSQL), die alle Leads, Status und generierten Texte speichert.
*   **AI Engine:** [OpenRouter](https://openrouter.ai)
    *   Schnittstelle zu den großen Sprachmodellen (Perplexity für Recherche, Gemini Flash für Textgenerierung).
*   **E-Mail Engine:** [Lemlist](https://lemlist.com)
    *   Hierhin werden die fertigen Daten für den Versand geschickt.

---

## 🛠 Features (Technisch)

*   **CSV Import:** Upload von Apollo-Exporten (automatische Spalten-Erkennung).
*   **Smart Filtering:**
    *   Filtert Leads ohne Website.
    *   Filtert Leads auf der Opt-Out Liste (Google Sheet).
*   **AI Icebreaker:**
    *   **Perplexity:** Scrapt und fasst die Website des Leads zusammen.
    *   **Gemini 3.0 Flash:** Generiert charmante Icebreaker basierend auf der Zusammenfassung.
*   **Bulk Processing:** Verarbeitet tausende Leads im Hintergrund mit Fortschrittsanzeige.
*   **Lemlist Integration:**
    *   Erstellt automatisch Kampagnen.
    *   Fügt Leads hinzu (auch wenn sie bereits existieren).
    *   Übergibt den generierten Icebreaker als Variable `{{icebreaker}}`.

## 💻 Tech Stack

*   **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
*   **Backend/DB:** Supabase (PostgreSQL)
*   **AI:** OpenRouter (Perplexity + Google Gemini)
*   **Email:** Lemlist API v2

## 🚀 Deployment auf Vercel

1.  **Repository pushen:** Code auf GitHub hochladen.
2.  **Neues Projekt in Vercel:** Repository importieren.
3.  **Environment Variables:** Folgende Variablen in den Vercel-Einstellungen hinterlegen:

| Variable | Beschreibung |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Deine Supabase Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dein Supabase Anon/Public Key |
| `OPENROUTER_API_KEY` | API Key für OpenRouter (Perplexity/Gemini) |
| `LEMLIST_API_KEY` | API Key für Lemlist |
| `SITE_URL` | Die URL deiner Vercel-App (z.B. `https://icebreaker-iota.vercel.app`) |

4.  **Deployen:** Klicke auf "Deploy".

## 👨‍💻 Lokale Entwicklung

1.  Dependencies installieren:
    ```bash
    npm install
    ```

2.  `.env.local` Datei erstellen (siehe oben).

3.  Server starten:
    ```bash
    npm run dev
    ```
