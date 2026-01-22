import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createCampaign, addLeadToCampaign } from '@/lib/lemlist';

export async function POST(request: Request) {
  try {
    let { campaignName, leads, campaignId } = await request.json();

    if ((!campaignName && !campaignId) || !leads || !Array.isArray(leads)) {
      return NextResponse.json({ success: false, error: 'Missing campaign name/ID or leads' }, { status: 400 });
    }

    // 1. Create Campaign if ID not provided
    if (!campaignId) {
        campaignId = await createCampaign(campaignName);
        if (!campaignId) {
            return NextResponse.json({ success: false, error: 'Failed to create campaign' }, { status: 500 });
        }
    }

    // 2. Add Leads to Campaign
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Process in parallel with limit (e.g. 10 at a time) to avoid rate limits
    // Simple version: chunking
    const chunkSize = 5;
    for (let i = 0; i < leads.length; i += chunkSize) {
        const chunk = leads.slice(i, i + chunkSize);
        const results = await Promise.all(chunk.map(async (lead: any) => {
            const result = await addLeadToCampaign(campaignId, lead, lead.icebreaker);
            if (result.success) {
                // Update status in DB
                await supabase.from('leads').update({ status: 'exported' }).eq('id', lead.id);
                return { success: true };
            }
            return { success: false, error: result.error };
        }));
        
        successCount += results.filter(r => r.success).length;
        failCount += results.filter(r => !r.success).length;
        
        // Collect unique errors
        results.forEach(r => {
            if (!r.success && r.error) {
                errors.push(r.error);
            }
        });
    }

    return NextResponse.json({ 
        success: true, 
        campaignId,
        stats: {
            total: leads.length,
            success: successCount,
            failed: failCount,
            errors: [...new Set(errors)] // Unique errors
        }
    });

  } catch (error: any) {
    console.error("Export API Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
