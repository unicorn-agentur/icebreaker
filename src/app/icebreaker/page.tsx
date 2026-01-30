'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Play, RefreshCw, Database, Bot, Variable, Save, Check, Zap, AlertCircle, ChevronLeft, ArrowRight, Trash2, Plus, FileText, Shuffle, PauseCircle, Filter, Cpu, Wallet, Settings2 } from 'lucide-react';
import { Lead, PromptTemplate } from '@/types/database';
import { StepNavigation } from '@/components/StepNavigation';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function IcebreakerPage() {
  const searchParams = useSearchParams();
  const listParam = searchParams.get('list');
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { summary: string; icebreaker: string }>>({});
  
  // Templates State
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-3-flash-preview');

  const models = [
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', costPerLead: 0.0007 },
      { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', costPerLead: 0.0032 },
      { id: 'openai/gpt-5.2', name: 'GPT 5.2', costPerLead: 0.00315 },
      { id: 'openrouter/auto', name: 'OpenRouter Auto', costPerLead: 0.002 }, // Estimate
  ];

  const SEARCH_COST_PER_LEAD = 0.0055; // Perplexity Sonar estimate

  // Bulk Processing State
  const [totalPending, setTotalPending] = useState(0);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkProcessedCount, setBulkProcessedCount] = useState(0);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const shouldStopRef = useRef(false);

  const [availableLists, setAvailableLists] = useState<string[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');
  const [currentListName, setCurrentListName] = useState<string>('');

  useEffect(() => {
    // If URL param exists, set it immediately
    if (listParam) {
        setSelectedList(listParam);
        setCurrentListName(listParam);
    }
    
    fetchLists().then(() => {
        fetchTemplates();
    });
  }, [listParam]);

  useEffect(() => {
      if (selectedList) {
          fetchData();
      }
  }, [selectedList]);

  const fetchLists = async () => {
      // Fetch distinct list names. 
      // Note: For large datasets, this should be an RPC or optimized query. 
      // For now, we fetch list_name column and dedupe client-side.
      const { data } = await supabase
          .from('leads')
          .select('list_name')
          .not('list_name', 'is', null);
      
      if (data) {
          const uniqueLists = Array.from(new Set(data.map(l => l.list_name).filter(Boolean))) as string[];
          setAvailableLists(uniqueLists);
          
          // Only default if NO list is selected (and no URL param was present)
          if (!selectedList && !listParam && uniqueLists.length > 0) {
               const { data: recent } = await supabase
                  .from('leads')
                  .select('list_name')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
               
               if (recent?.list_name) {
                   setSelectedList(recent.list_name);
                   setCurrentListName(recent.list_name);
               } else {
                   setSelectedList(uniqueLists[0]);
                   setCurrentListName(uniqueLists[0]);
               }
          }
      }
  };

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Load Templates (already loaded in initial effect, but okay to refresh)
    // const { data: templatesData } = await supabase.from('prompt_templates').select('*').order('created_at', { ascending: false });
    // if (templatesData) setTemplates(templatesData);

    // 2. Fetch Settings (Prompt & Last Template)
    const { data: settings } = await supabase.from('settings').select('icebreaker_prompt, last_used_template_id, selected_model').single();
    
    if (settings) {
        if (settings.icebreaker_prompt) {
            setPrompt(settings.icebreaker_prompt);
        }
        if (settings.last_used_template_id) {
            setSelectedTemplateId(settings.last_used_template_id);
        }
        if (settings.selected_model) {
            setSelectedModel(settings.selected_model);
        }
    } else {
        // Default Prompt if nothing saved
        setPrompt("Erstelle einen kurzen, charmanten Icebreaker für eine Cold Email an {{firstName}} von {{companyName}}. Beziehe dich auf ihre Website und erwähne etwas Spezifisches aus der Recherche. Halte es unter 30 Wörtern. Du bist Dennis von der Unicorn Agentur.");
    }

    // 3. Fetch FIRST 3 Pending Leads for Selected List
    await fetchTestLeads();

    // 4. Count total pending leads for Selected List
    let countQuery = supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    if (selectedList) {
        countQuery = countQuery.eq('list_name', selectedList);
    }

    const { count } = await countQuery;
    
    if (count !== null) {
        setTotalPending(count);
    }

    setLoading(false);
  };

  const fetchTestLeads = async (random = false) => {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('status', 'pending');
      
      if (selectedList) {
          query = query.eq('list_name', selectedList);
      }

      if (random) {
          // Fetch a larger batch to pick random from
          const { data: allPending } = await query.limit(50);
            
          if (allPending && allPending.length > 0) {
              const shuffled = allPending.sort(() => 0.5 - Math.random());
              const selected = shuffled.slice(0, 3);
              setLeads(selected);
              // Clear previous results when switching leads
              setTestResults({});
          } else {
              setLeads([]);
          }
      } else {
          // Default: First 3
          const { data: firstLeads } = await query.order('created_at', { ascending: true }).limit(3);
          if (firstLeads && firstLeads.length > 0) {
            setLeads(firstLeads);
          } else {
            // If no PENDING leads, try to fetch GENERATED leads for preview
            // This fixes the issue where switching lists shows "no leads" if they are all done
             let generatedQuery = supabase
                .from('leads')
                .select('*')
                .eq('status', 'generated');
             
             if (selectedList) {
                 generatedQuery = generatedQuery.eq('list_name', selectedList);
             }

             const { data: generatedLeads } = await generatedQuery.order('created_at', { ascending: true }).limit(3);
             if (generatedLeads && generatedLeads.length > 0) {
                 setLeads(generatedLeads);
                 // Pre-fill test results for generated leads
                 const results: Record<string, { summary: string; icebreaker: string }> = {};
                 generatedLeads.forEach(l => {
                     if (l.scrape_summary && l.icebreaker) {
                         results[l.id] = { summary: l.scrape_summary, icebreaker: l.icebreaker };
                     }
                 });
                 setTestResults(results);
             } else {
                 setLeads([]);
             }
          }
      }
  };

  const fetchTemplates = async () => {
      const { data } = await supabase.from('prompt_templates').select('*').order('created_at', { ascending: false });
      if (data) setTemplates(data);
  };

  const saveSettings = async () => {
    await supabase.from('settings').update({ 
        icebreaker_prompt: prompt,
        selected_model: selectedModel 
    }).neq('id', '00000000-0000-0000-0000-000000000000');
  };

  // --- Template Logic ---

  const handleTemplateChange = async (templateId: string) => {
      setSelectedTemplateId(templateId);
      const template = templates.find(t => t.id === templateId);
      if (template) {
          setPrompt(template.content);
          await supabase.from('settings').update({ last_used_template_id: templateId }).neq('id', '00000000-0000-0000-0000-000000000000');
      }
  };

  const handleOverwriteTemplate = async () => {
      if (!selectedTemplateId) return;
      
      setIsSaving(true);
      const { error } = await supabase
          .from('prompt_templates')
          .update({ content: prompt })
          .eq('id', selectedTemplateId);
      
      if (!error) {
          setTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, content: prompt } : t));
          await saveSettings();
      }
      setTimeout(() => setIsSaving(false), 1000);
  };

  const handleSaveNewTemplate = async () => {
      const name = window.prompt("Name für das neue Template:");
      if (!name) return;

      setIsSaving(true);
      const { data, error } = await supabase
          .from('prompt_templates')
          .insert({ name, content: prompt })
          .select()
          .single();

      if (!error && data) {
          setTemplates([data, ...templates]);
          setSelectedTemplateId(data.id);
          await supabase.from('settings').update({ last_used_template_id: data.id }).neq('id', '00000000-0000-0000-0000-000000000000');
      }
      setIsSaving(false);
  };

  const handleDeleteTemplate = async () => {
      if (!selectedTemplateId || !confirm("Template wirklich löschen?")) return;

      const { error } = await supabase.from('prompt_templates').delete().eq('id', selectedTemplateId);
      if (!error) {
          setTemplates(prev => prev.filter(t => t.id !== selectedTemplateId));
          setSelectedTemplateId('');
          await supabase.from('settings').update({ last_used_template_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
      }
  };

  const handleSavePrompt = async () => {
    setIsSaving(true);
    await saveSettings();
    setTimeout(() => setIsSaving(false), 1500);
  };

  // --- Processing Logic ---

  const runTest = async () => {
    setGenerating(true);
    setTestResults({});
    await saveSettings();

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
          body: JSON.stringify({ lead, prompt, model: selectedModel }),
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
      setBulkProcessing(true);
      setBulkProgress(0);
      setBulkProcessedCount(0);
      setBulkError(null);
      shouldStopRef.current = false;
      await saveSettings();

      let processed = 0;
      const batchSize = 5; 
      const startTime = Date.now();
      
      try {
          while (true) {
              if (shouldStopRef.current) {
                  setBulkProcessing(false);
                  break;
              }

              const { data: batch, error } = await supabase
                  .from('leads')
                  .select('*')
                  .eq('status', 'pending')
                  .eq('list_name', selectedList) // Ensure we only process the selected list
                  .limit(batchSize);

              if (error) throw error;
              if (!batch || batch.length === 0) break;

              // Check again before processing batch
              if (shouldStopRef.current) {
                  setBulkProcessing(false);
                  break;
              }

              await Promise.all(batch.map(lead => processSingleLead(lead)));

              processed += batch.length;
              setBulkProcessedCount(processed);
              setBulkProgress((processed / totalPending) * 100);

              const elapsedTime = Date.now() - startTime;
              const msPerLead = elapsedTime / processed;
              const remainingLeads = totalPending - processed;
              const remainingMs = remainingLeads * msPerLead;
              setEstimatedTimeRemaining(Math.ceil(remainingMs / 60000)); 
          }

          if (!shouldStopRef.current) {
             router.push(`/export?list=${encodeURIComponent(selectedList)}`);
          }

      } catch (err: any) {
          console.error("Bulk Error", err);
          setBulkError(err.message || "Fehler beim Bulk-Processing");
          setBulkProcessing(false);
          fetchData(); 
      }
  };

  const stopBulkProcessing = () => {
      shouldStopRef.current = true;
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
        <header className="flex flex-col xl:flex-row xl:justify-between xl:items-center pb-8 border-b border-gray-200 dark:border-gray-800 gap-6">
          <div className="flex items-center gap-4">
            <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Sparkles className="text-primary w-6 h-6" />
                    </div>
                    Icebreaker Playground
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 ml-1">
                    Optimiere deinen Prompt und generiere personalisierte Icebreaker.
                </p>
            </div>
          </div>
          
          {/* Unified Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
               
               {/* List Selector */}
               <div className="relative min-w-[220px]">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                       <Filter className="w-4 h-4" />
                   </div>
                   <select 
                       className="w-full h-11 pl-9 pr-8 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 text-sm font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors appearance-none"
                       value={selectedList}
                       onChange={(e) => {
                           setSelectedList(e.target.value);
                           setCurrentListName(e.target.value);
                       }}
                       disabled={bulkProcessing || generating}
                   >
                       <option value="" disabled>Liste wählen...</option>
                       {availableLists.map(list => (
                           <option key={list} value={list}>{list}</option>
                       ))}
                   </select>
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                       <Settings2 className="w-3 h-3" />
                   </div>
               </div>

               {/* Divider (Desktop) */}
               <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

               {/* Dynamic Actions Area */}
               <div className="flex-1 flex items-center justify-end gap-3 min-w-[300px]">
                   {bulkProcessing ? (
                       <div className="flex-1 flex items-center gap-3 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-700">
                           <div className="flex-1 space-y-1">
                               <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
                                   <span className="flex items-center gap-1.5">
                                       <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                                       Verarbeite... {estimatedTimeRemaining !== null && `(~${estimatedTimeRemaining} Min.)`}
                                   </span>
                                   <span>{bulkProcessedCount} / {totalPending}</span>
                               </div>
                               <Progress value={bulkProgress} className="h-1.5" />
                           </div>
                           <Button 
                               variant="ghost" 
                               size="icon" 
                               onClick={stopBulkProcessing}
                               className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full ml-1"
                               title="Pausieren"
                           >
                               <PauseCircle className="w-5 h-5" />
                           </Button>
                       </div>
                   ) : (
                       <>
                           {/* Stats & Cost (only if pending > 0) */}
                           {totalPending > 0 && (
                                <div className="flex flex-col items-end mr-1">
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                        {totalPending} <span className="text-muted-foreground font-normal text-xs">Leads offen</span>
                                    </div>
                                    
                                    <a 
                                        href="https://openrouter.ai/credits" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="group flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-700 mt-0.5"
                                        title="Geschätzte Kosten basierend auf Modell + Suche"
                                    >
                                        <Wallet className="w-3 h-3 group-hover:text-primary" />
                                        <span>~${((SEARCH_COST_PER_LEAD + (models.find(m => m.id === selectedModel)?.costPerLead || 0)) * totalPending).toFixed(2)}</span>
                                    </a>
                                </div>
                           )}

                           <div className="flex gap-2">
                               {leads.some(l => l.status === 'generated') && (
                                   <Link href={`/export?list=${encodeURIComponent(selectedList)}`}>
                                       <Button variant="outline" className="h-11 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                           Export <ArrowRight className="w-4 h-4 ml-2" />
                                       </Button>
                                   </Link>
                               )}

                               {totalPending > 0 && (
                                    <Button 
                                        onClick={startBulkProcessing}
                                        disabled={generating}
                                        className="h-11 bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all px-6"
                                    >
                                        <Zap className="w-4 h-4 mr-2 fill-white text-white" />
                                        Alle Generieren
                                    </Button>
                               )}
                           </div>
                       </>
                   )}
               </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Prompt Editor (4 cols) */}
          <div className="xl:col-span-4 space-y-6">
            <Card className="sticky top-6 shadow-md flex flex-col h-[calc(100vh-200px)]">
              <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b pb-4 space-y-4">
                <div className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Bot className="w-5 h-5 text-primary" /> 
                            Prompt Editor
                        </CardTitle>
                    </div>
                </div>

                {/* Template Controls */}
                <div className="space-y-3">
                    {/* Model Selector */}
                    <div className="relative">
                        <div className="absolute left-3 top-2.5 pointer-events-none text-muted-foreground">
                            <Cpu className="w-4 h-4" />
                        </div>
                        <select 
                            className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={bulkProcessing || generating}
                        >
                            {models.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <select 
                                className="w-full h-10 pl-3 pr-8 rounded-md border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                value={selectedTemplateId}
                            >
                                <option value="">-- Vorlage wählen --</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        {selectedTemplateId && (
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={handleOverwriteTemplate} 
                                disabled={isSaving}
                                title="Ausgewähltes Template überschreiben"
                                className={isSaving ? "text-green-600 border-green-200 bg-green-50" : ""}
                            >
                                {isSaving ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            </Button>
                        )}

                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={handleSaveNewTemplate} 
                            title="Als NEUES Template speichern"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>

                        {selectedTemplateId && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-400 hover:text-red-600 hover:bg-red-50" 
                                onClick={handleDeleteTemplate}
                                title="Vorlage löschen"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-6 flex-1 flex flex-col min-h-0">
                <div className="relative flex-1">
                    <textarea
                        className="absolute inset-0 w-full h-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-mono leading-relaxed"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Schreibe deinen Prompt hier..."
                        disabled={bulkProcessing}
                    />
                </div>
                <div className="flex justify-end text-xs text-muted-foreground">
                    {prompt.length} Zeichen
                </div>

                <div className="space-y-2 shrink-0">
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
                </div>

                <Button 
                    onClick={runTest} 
                    disabled={generating || leads.length === 0 || bulkProcessing} 
                    className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg h-12 text-base font-semibold shrink-0"
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
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchTestLeads(true)}
                    disabled={generating || bulkProcessing}
                    className="gap-2"
                >
                    <Shuffle className="w-4 h-4" /> Andere Leads testen
                </Button>
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
                                        Generiert mit {models.find(m => m.id === selectedModel)?.name || selectedModel}
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