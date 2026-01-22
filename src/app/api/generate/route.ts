import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { scrapeWebsite, generateIcebreaker } from '@/lib/openrouter';

export async function POST(request: Request) {
  try {
    const { lead, prompt } = await request.json();

    if (!lead || !prompt) {
      return NextResponse.json({ success: false, error: 'Missing lead or prompt' }, { status: 400 });
    }

    // 1. Scrape Website (Perplexity)
    // We update status to 'scraped'
    const summary = await scrapeWebsite(lead.website);
    
    // 2. Generate Icebreaker (Gemini)
    const icebreaker = await generateIcebreaker(prompt, lead, summary);

    // 3. Update Database
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'generated',
        scrape_summary: summary,
        icebreaker: icebreaker
      })
      .eq('id', lead.id);

    if (error) {
        console.error("DB Update Error", error);
        return NextResponse.json({ success: false, error: 'Database update failed' });
    }

    return NextResponse.json({ 
        success: true, 
        summary, 
        icebreaker 
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
