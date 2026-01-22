'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Play, RefreshCw, Database, Bot, Variable, Save, Check, Zap, AlertCircle, ChevronLeft, ArrowRight } from 'lucide-react';
import { Lead } from '@/types/database';
import { StepNavigation } from '@/components/StepNavigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function IcebreakerPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { summary: string; icebreaker: string }>>({});
  
  // Bulk Processing State
  const [totalPending, setTotalPending] = useState(0);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkProcessedCount, setBulkProcessedCount] = useState(0);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const router = useRouter();

  const [currentListName, setCurrentListName] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // 1. Fetch Settings (Prompt)
    const { data: settings } = await supabase.from('settings').select('icebreaker_prompt').single();
    if (settings?.icebreaker_prompt) {
      setPrompt(settings.icebreaker_prompt);
    } else {
        setPrompt("Erstelle einen kurzen, charmanten Icebreaker für eine Cold Email an {{firstName}} von {{companyName}}. Beziehe dich auf ihre Website und erwähne etwas Spezifisches aus der Recherche. Halte es unter 30 Wörtern. Du bist Dennis von der Unicorn Agentur.");
    }

    // 2. Fetch FIRST 3 Pending Leads (Ordered by creation)
    const { data: firstLeads } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(3);
    
    if (firstLeads && firstLeads.length > 0) {
      setLeads(firstLeads);
      if (firstLeads[0].list_name) {
          setCurrentListName(firstLeads[0].list_name);
      }
    }

    // 3. Count total pending leads
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    if (count !== null) {
        setTotalPending(count);
    }

    setLoading(false);
  };

  const savePrompt = async () => {
    await supabase.from('settings').update({ icebreaker_prompt: prompt }).neq('id', '00000000-0000-0000-0000-000000000000');
  };

  const handleSavePrompt = async () => {
    setIsSaving(true);
    await savePrompt();
    setTimeout(() => setIsSaving(false), 1500);
  };

  const runTest = async () => {
    setGenerating(true);
    setTestResults({});
    await savePrompt();

    for (const lead of leads) {
      await processSingleLead(lead);
    }
    setGenerating(false);
  };

  const processSingleLead = async (lead: Lead) => {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead, prompt }),
        });
        
        const data = await response.json();
        if (data.success) {
            setTestResults(prev => ({
                ...prev,
                [lead.id]: {
                    summary: data.summary,
                    icebreaker: data.icebreaker
                }
            }));
            return true;
        }
        return false;
      } catch (error) {
        console.error("Error generating for lead", lead.id, error);
        return false;
      }
  };

  const startBulkProcessing = async () => {
      // Removed confirmation dialog as requested
      
      setBulkProcessing(true);
      setBulkProgress(0);
      setBulkProcessedCount(0);
      setBulkError(null);
      await savePrompt();

      let processed = 0;
      const batchSize = 5; // Process 5 at a time
      const startTime = Date.now();
      // Use the stored list name
      
      try {
          while (true) {
              const { data: batch, error } = await supabase
                  .from('leads')
                  .select('*')
                  .eq('status', 'pending')
                  .limit(batchSize);

              if (error) throw error;
              if (!batch || batch.length === 0) break;

              // Process batch in parallel
              await Promise.all(batch.map(lead => processSingleLead(lead)));

              processed += batch.length;
              setBulkProcessedCount(processed);
              setBulkProgress((processed / totalPending) * 100);

              // Calculate estimated time remaining
              const elapsedTime = Date.now() - startTime;
              const msPerLead = elapsedTime / processed;
              const remainingLeads = totalPending - processed;
              const remainingMs = remainingLeads * msPerLead;
              setEstimatedTimeRemaining(Math.ceil(remainingMs / 60000)); // in minutes
          }

          // Automatically redirect to export page when done
          router.push(`/export?list=${encodeURIComponent(currentListName)}`);

      } catch (err: any) {
          console.error("Bulk Error", err);
          setBulkError(err.message || "Fehler beim Bulk-Processing");
          setBulkProcessing(false);
          fetchData(); // Refresh list and counts
      }
  };

  const insertVariable = (variable: string) => {
    setPrompt(prev => prev + ' ' + variable);
  };

  const variables = [
    { name: '{{firstName}}', desc: 'Vorname' },
    { name: '{{lastName}}', desc: 'Nachname' },
    { name: '{{companyName}}', desc: 'Firma' },
    { name: '{{website}}', desc: 'Website URL' },
    { name: '{{linkedin}}', desc: 'LinkedIn URL' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <main className="max-w-7xl mx-auto space-y-8">
        
        <StepNavigation />

        {/* Header */}
        <header className="flex justify-between items-center pb-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full">
                    <ChevronLeft className="w-5 h-5" />
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <Sparkles className="text-primary w-8 h-8" /> Icebreaker Playground
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                Teste deinen Prompt an den ersten 3 Leads deiner Liste.
                </p>
            </div>
          </div>
          
          {/* Bulk Action Area */}
          <div className="flex items-center gap-4">
               {/* Export Button if leads are ready */}
               {leads.some(l => l.status === 'generated') && !bulkProcessing && (
                   <Link href={`/export?list=${encodeURIComponent(currentListName)}`}>
                       <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/5">
                           Weiter zum Export <ArrowRight className="w-4 h-4 ml-2" />
                       </Button>
                   </Link>
               )}

               {bulkProcessing ? (
                   <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-lg border shadow-sm min-w-[300px]">
                       <div className="flex-1 space-y-1">
                           <div className="flex justify-between text-xs font-medium">
                               <span>Verarbeite Leads... {estimatedTimeRemaining !== null && `(ca. ${estimatedTimeRemaining} Min.)`}</span>
                               <span>{bulkProcessedCount} / {totalPending}</span>
                           </div>
                           <Progress value={bulkProgress} className="h-2" />
                       </div>
                   </div>
               ) : (
                   totalPending > 0 && (
                        <div className="flex items-center gap-2">
                             <div className="text-sm text-right mr-2 hidden sm:block">
                                <div className="font-semibold">{totalPending} Leads</div>
                                <div className="text-muted-foreground text-xs">warten auf Generierung</div>
                             </div>
                             <Button 
                                onClick={startBulkProcessing}
                                disabled={generating}
                                className="bg-primary hover:bg-primary/90 text-white shadow-lg border-0"
                            >
                                <Zap className="w-4 h-4 mr-2 fill-white text-white" />
                                Alle Generieren
                             </Button>
                        </div>
                   )
               )}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Prompt Editor (4 cols) */}
          <div className="xl:col-span-4 space-y-6">
            <Card className="sticky top-6 shadow-md">
              <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b pb-4 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bot className="w-5 h-5 text-primary" /> 
                        Prompt Editor
                    </CardTitle>
                    <CardDescription>
                    Definiere, wie Gemini den Icebreaker schreiben soll.
                    </CardDescription>
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSavePrompt} 
                    disabled={isSaving || bulkProcessing}
                    className={isSaving ? "text-green-600 border-green-200 bg-green-50" : ""}
                >
                    {isSaving ? <Check className="w-4 h-4 mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    {isSaving ? 'Gespeichert' : 'Speichern'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="relative">
                    <textarea
                    className="flex min-h-[300px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono leading-relaxed"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Schreibe deinen Prompt hier..."
                    disabled={bulkProcessing}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                        {prompt.length} Zeichen
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Variable className="w-3 h-3" /> Verfügbare Variablen
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {variables.map((v) => (
                            <button
                                key={v.name}
                                onClick={() => insertVariable(v.name)}
                                disabled={bulkProcessing}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30 transition-colors border border-primary/20 dark:border-primary/30 disabled:opacity-50"
                                title={v.desc}
                            >
                                {v.name}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        * Die <strong>Website-Zusammenfassung</strong> von Perplexity wird automatisch als Kontext an Gemini übergeben.
                    </p>
                </div>

                <Button 
                    onClick={runTest} 
                    disabled={generating || leads.length === 0 || bulkProcessing} 
                    className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg h-12 text-base font-semibold"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Generiere...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5 fill-current" /> Testlauf starten
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Results (8 cols) */}
          <div className="xl:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    Test Leads <span className="text-sm font-normal text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{leads.length}</span>
                </h2>
            </div>
            
            {leads.length === 0 && !loading && (
                <div className="text-center p-12 border-2 border-dashed rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-muted-foreground">Keine 'pending' Leads gefunden. Bitte lade erst eine CSV hoch.</p>
                </div>
            )}

            <div className="space-y-6">
              {leads.map((lead, index) => (
                <Card key={lead.id} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                  {/* Lead Header */}
                  <div className="bg-gray-50/80 dark:bg-gray-800/80 px-6 py-4 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {index + 1}
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                {lead.first_name} {lead.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <span>{lead.company_name}</span>
                                {lead.website ? (
                                    <>
                                        <span>•</span>
                                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                                            {lead.website}
                                        </a>
                                    </>
                                ) : (
                                    <span className="text-red-500 text-xs bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                                        Keine Website gefunden
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {testResults[lead.id] ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                Fertig
                            </span>
                        ) : generating ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse">
                                Arbeitet...
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                                Pending
                            </span>
                        )}
                    </div>
                  </div>

                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x dark:divide-gray-800">
                        
                        {/* Left: Perplexity Summary */}
                        <div className="p-6 bg-white dark:bg-gray-900/50">
                            <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wide">
                                <Database className="w-4 h-4" /> Perplexity Recherche
                            </div>
                            {testResults[lead.id] ? (
                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed prose dark:prose-invert max-w-none">
                                    {testResults[lead.id].summary}
                                </div>
                            ) : (
                                <div className="space-y-2 opacity-30">
                                    <div className="h-2 bg-gray-300 rounded w-full"></div>
                                    <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                                    <div className="h-2 bg-gray-300 rounded w-4/6"></div>
                                </div>
                            )}
                        </div>

                        {/* Right: Gemini Icebreaker */}
                        <div className="p-6 bg-primary/5 dark:bg-primary/5">
                            <div className="flex items-center gap-2 mb-3 text-primary dark:text-primary font-semibold text-sm uppercase tracking-wide">
                                <Sparkles className="w-4 h-4" /> Gemini Icebreaker
                            </div>
                            {testResults[lead.id] ? (
                                <div className="relative">
                                    <div className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed p-4 bg-white dark:bg-gray-800 rounded-lg border border-primary/20 dark:border-primary/30 shadow-sm not-italic">
                                        "{testResults[lead.id].icebreaker}"
                                    </div>
                                    <div className="mt-2 text-xs text-right text-muted-foreground">
                                        Generiert mit Gemini 3.0 Flash
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 opacity-30">
                                    <div className="h-3 bg-primary/20 rounded w-full"></div>
                                    <div className="h-3 bg-primary/20 rounded w-3/4"></div>
                                </div>
                            )}
                        </div>

                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
