import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function scrapeWebsite(url: string): Promise<string> {
  if (!url) return "Keine Website angegeben.";
  
  // Ensure protocol
  let targetUrl = url;
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const response = await axios.post(
      SITE_URL,
      {
        model: "perplexity/sonar-reasoning-pro",
        messages: [
          {
            role: "user",
            content: `Analysiere diese Website und fasse kurz zusammen, was das Unternehmen macht, was ihre Hauptprodukte sind und nenne 1-2 aktuelle News oder Besonderheiten, die man für einen Icebreaker nutzen könnte: ${targetUrl}`
          }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter
          "X-Title": "Unicorn Icebreaker"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Perplexity Error:", error);
    return "Fehler beim Scrapen der Website.";
  }
}

export async function generateIcebreaker(prompt: string, leadData: any, scrapeSummary: string, model: string = "google/gemini-3-flash-preview"): Promise<string> {
  console.log("--- Generating Icebreaker ---");
  console.log("Model:", model);
  console.log("Lead Data:", JSON.stringify(leadData, null, 2));
  console.log("Original Prompt:", prompt);

  try {
    // 1. Replace standard variables (case-insensitive)
    let finalPrompt = prompt
      .replace(/{{firstName}}/gi, leadData.first_name || 'Partner')
      .replace(/{{lastName}}/gi, leadData.last_name || '')
      .replace(/{{companyName}}/gi, leadData.company_name || 'deinem Unternehmen')
      .replace(/{{website}}/gi, leadData.website || '')
      .replace(/{{linkedin}}/gi, leadData.linkedin || '');

    console.log("Final Prompt (after replacement):", finalPrompt);

    // 2. Inject Summary
    // We provide the summary as context to the model
    const systemContext = `
    TASK: Write a cold email icebreaker.
    
    CONTEXT DATA (Scraped from Lead's Website):
    """
    ${scrapeSummary}
    """
    
    LEAD INFO:
    Name: ${leadData.first_name} ${leadData.last_name}
    Company: ${leadData.company_name}
    
    INSTRUCTIONS:
    Use the provided website context to make the icebreaker specific and relevant.
    `;

    const response = await axios.post(
      SITE_URL,
      {
        model: model,
        messages: [
          {
            role: "system",
            content: "Du bist ein Experte für Cold Outreach. Schreibe nur den Icebreaker, keine Anführungszeichen, keine Einleitung. Halte dich strikt an den User Prompt."
          },
          {
            role: "user",
            content: `${systemContext}\n\nUSER PROMPT:\n${finalPrompt}`
          }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
           "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Unicorn Icebreaker"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Fehler beim Generieren des Icebreakers.";
  }
}
