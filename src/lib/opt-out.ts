import axios from 'axios';
import Papa from 'papaparse';

const OPT_OUT_SHEET_ID = '12Qk34NXLCTnDjFz8DbwhXRvrlULpz9a3JDUxPMs3D3Q';
const OPT_OUT_CSV_URL = `https://docs.google.com/spreadsheets/d/${OPT_OUT_SHEET_ID}/export?format=csv`;

export type OptOutEntry = {
  email: string;
  domain: string;
};

export async function fetchOptOutList(): Promise<OptOutEntry[]> {
  try {
    const response = await axios.get(OPT_OUT_CSV_URL);
    const csvData = response.data;

    const parsed = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    const entries: OptOutEntry[] = [];

    // Wir gehen davon aus, dass die Spalte 'Contact Email' heißt, wie im Screenshot zu sehen.
    // Wir sammeln auch Domains, falls wir basierend darauf filtern wollen (optional, aber gut zu haben).
    
    for (const row of parsed.data as any[]) {
      const email = row['Contact Email']?.trim().toLowerCase();
      if (email) {
        entries.push({
            email: email,
            domain: email.split('@')[1]
        });
      }
    }

    return entries;
  } catch (error) {
    console.error('Error fetching opt-out list:', error);
    return [];
  }
}

export function isOptedOut(email: string, optOutList: OptOutEntry[]): boolean {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  return optOutList.some(entry => entry.email === normalizedEmail);
}
