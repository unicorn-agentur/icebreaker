import axios from 'axios';

const LEMLIST_API_KEY = process.env.LEMLIST_API_KEY;
const BASE_URL = 'https://api.lemlist.com/api';

// Lemlist uses Basic Auth with empty username and API Key as password
const authHeader = {
  Authorization: `Basic ${Buffer.from(`:${LEMLIST_API_KEY}`).toString('base64')}`,
  'Content-Type': 'application/json'
};

export async function createCampaign(name: string): Promise<string> {
  try {
    const response = await axios.post(
      `${BASE_URL}/campaigns`,
      { name },
      { headers: authHeader }
    );
    return response.data._id;
  } catch (error: any) {
    console.error('Lemlist Create Campaign Error:', error.response?.data || error.message);
    throw new Error('Fehler beim Erstellen der Kampagne in Lemlist.');
  }
}

export async function addLeadToCampaign(campaignId: string, lead: any, icebreaker: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Map our lead data to Lemlist format strictly according to docs
    // IMPORTANT: Custom variables must be top-level fields for 'create-lead-in-campaign'
    // BUT if that fails, we might need to try 'customFields' or similar. 
    // However, docs say "icebreaker" is a standard field.
    // If user says "custom column icebreaker", maybe they mean a custom variable named "icebreaker".
    // Let's try sending it as a custom variable in an array format if top-level fails? 
    // No, let's stick to the most robust way: Top-level AND inside a 'custom' object if possible, 
    // but the previous attempt with 'variables' failed.
    
    // Let's try sending it ONLY as top level, but ensure the key is exactly "icebreaker".
    // AND let's add it to a 'customFields' array which some integrations use.
    
    const payload = {
      email: lead.email,
      firstName: lead.first_name,
      lastName: lead.last_name,
      companyName: lead.company_name,
      icebreaker: icebreaker,
      linkedinUrl: lead.linkedin,
      companyDomain: lead.website,
    };

    console.log(`Sending payload for ${lead.email}:`, JSON.stringify(payload, null, 2));

    // Use the correct endpoint for adding a lead to a specific campaign
    // According to Lemlist API v2 docs: POST /campaigns/{campaignId}/leads
    await axios.post(
      `${BASE_URL}/campaigns/${campaignId}/leads`,
      payload,
      { headers: authHeader }
    );

    return { success: true };
  } catch (error: any) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;

    // Handle "Lead already exists" (409) OR if message says so
    if (status === 409 || (msg && typeof msg === 'string' && msg.toLowerCase().includes('exist'))) {
        console.log(`Lead ${lead.email} already exists in campaign. Attempting update...`);
        try {
            // Try to UPDATE the lead in the campaign instead
            // PATCH /campaigns/{campaignId}/leads/{email}
            await axios.patch(
                `${BASE_URL}/campaigns/${campaignId}/leads/${encodeURIComponent(lead.email)}`,
                {
                    firstName: lead.first_name,
                    lastName: lead.last_name,
                    companyName: lead.company_name,
                    icebreaker: icebreaker,
                    linkedinUrl: lead.linkedin,
                    companyDomain: lead.website
                },
                { headers: authHeader }
            );
            
            console.log(`Lead ${lead.email} updated successfully.`);
            return { success: true };
        } catch (updateError: any) {
            const updateMsg = updateError.response?.data?.message || updateError.message;
            console.error(`Failed to update existing lead ${lead.email}:`, updateMsg);
            
            // If update fails, we still return success=false but with specific error
            return { success: false, error: `Update failed: ${updateMsg}` };
        }
    }
    
    console.error(`Lemlist Add Lead Error (${lead.email}):`, msg);
    return { success: false, error: msg };
  }
}
