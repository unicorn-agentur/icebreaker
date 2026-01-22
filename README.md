# Unicorn Icebreaker Generator 🦄

Eine AI-gestützte Web-App für Cold Outreach Automation. Generiert personalisierte Icebreaker basierend auf Website-Analysen (Perplexity) und sendet Leads direkt in Lemlist-Kampagnen.

## Features

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
    *   Übergibt den generierten Icebreaker als Variable.

## Tech Stack

*   **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
*   **Backend/DB:** Supabase (PostgreSQL)
*   **AI:** OpenRouter (Perplexity + Google Gemini)
*   **Email:** Lemlist API v2

## Deployment auf Vercel

1.  **Repository pushen:** Lade diesen Code auf GitHub hoch.
2.  **Neues Projekt in Vercel:** Importiere das Repository.
3.  **Environment Variables:** Füge folgende Umgebungsvariablen in den Vercel-Einstellungen hinzu:

| Variable | Beschreibung |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Deine Supabase Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dein Supabase Anon/Public Key |
| `OPENROUTER_API_KEY` | API Key für OpenRouter (Perplexity/Gemini) |
| `LEMLIST_API_KEY` | API Key für Lemlist |
| `SITE_URL` | Die URL deiner Vercel-App (z.B. `https://dein-projekt.vercel.app`) |

4.  **Deployen:** Klicke auf "Deploy".

## Lokale Entwicklung

1.  Dependencies installieren:
    ```bash
    npm install
    ```

2.  `.env.local` Datei erstellen (siehe oben).

3.  Server starten:
    ```bash
    npm run dev
    ```
