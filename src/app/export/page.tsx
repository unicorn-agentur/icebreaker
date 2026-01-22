'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StepNavigation } from '@/components/StepNavigation';
import { Download, UploadCloud, CheckCircle, AlertCircle, Edit2, Save, X } from 'lucide-react';
import Papa from 'papaparse';
import { Lead } from '@/types/database';

import { useSearchParams } from 'next/navigation';

export default function ExportPage() {
  const searchParams = useSearchParams();
  const listNameParam = searchParams.get('list');
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignName, setCampaignName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: number; failed: number; errors?: string[] } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchGeneratedLeads();
  }, []);

  useEffect(() => {
      // Auto-fill campaign name if leads exist and have a list_name
      if (leads.length > 0 && leads[0].list_name) {
          setCampaignName(leads[0].list_name);
      }
  }, [leads]);

  const fetchGeneratedLeads = async () => {
    setLoading(true);
    
    let query = supabase
      .from('leads')
      .select('*')
      .in('status', ['generated', 'exported'])
      .order('created_at', { ascending: true });

    if (listNameParam) {
        query = query.eq('list_name', listNameParam);
    } else if (campaignName) {
        // Fallback: If campaignName is set (e.g. from previous state), try to use it
        query = query.eq('list_name', campaignName);
    } else {
        // If no list param, try to find the most recent list name to filter by default
        const { data: recentLead } = await supabase
            .from('leads')
            .select('list_name')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (recentLead?.list_name) {
            query = query.eq('list_name', recentLead.list_name);
            // Also update campaign name state so it's consistent
            setCampaignName(recentLead.list_name);
        }
    }

    const { data, error } = await query;

    if (data) {
      setLeads(data);
    }
    setLoading(false);
  };

  const handleDownloadCsv = () => {
    const csvData = leads.map(lead => ({
      Email: lead.email,
      FirstName: lead.first_name,
      LastName: lead.last_name,
      Company: lead.company_name,
      Website: lead.website,
      LinkedIn: lead.linkedin,
      Icebreaker: lead.icebreaker,
      ResearchSummary: lead.scrape_summary
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `unicorn_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToLemlist = async () => {
    if (!campaignName) return;
    setExporting(true);
    setExportResult(null);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            campaignName, 
            leads: leads.filter(l => l.status === 'generated') // Only export pending ones? Or all? Let's export 'generated' ones.
        }),
      });

      const data = await response.json();
      if (data.success) {
          setExportResult(data.stats);
          fetchGeneratedLeads(); // Refresh status
      } else {
          alert('Fehler beim Export: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setExporting(false);
    }
  };

  const startEdit = (lead: Lead) => {
      setEditingId(lead.id);
      setEditValue(lead.icebreaker || '');
  };

  const cancelEdit = () => {
      setEditingId(null);
      setEditValue('');
  };

  const saveEdit = async (id: string) => {
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === id ? { ...l, icebreaker: editValue } : l));
      setEditingId(null);
      
      // DB Update
      await supabase.from('leads').update({ icebreaker: editValue }).eq('id', id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <main className="max-w-7xl mx-auto space-y-8">
        
        <StepNavigation />

        <header className="flex justify-between items-end pb-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Export & Review</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Überprüfe deine {leads.length} generierten Icebreaker und exportiere sie.
            </p>
          </div>
          <div className="flex gap-3">
              <Button variant="outline" onClick={handleDownloadCsv}>
                  <Download className="w-4 h-4 mr-2" /> CSV Herunterladen
              </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Export Controls */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="sticky top-6 border-primary/20 bg-primary/5 dark:bg-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UploadCloud className="w-5 h-5 text-primary" />
                            Lemlist Export
                        </CardTitle>
                        <CardDescription>
                            Erstellt eine neue Kampagne und fügt alle Leads hinzu.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kampagnen Name</label>
                            <Input 
                                placeholder="z.B. Cold Outreach Q1 2026" 
                                value={campaignName}
                                onChange={(e) => setCampaignName(e.target.value)}
                            />
                        </div>
                        <Button 
                            className="w-full bg-primary hover:bg-primary/90 text-white" 
                            onClick={handleExportToLemlist}
                            disabled={exporting || !campaignName || leads.filter(l => l.status === 'generated').length === 0}
                        >
                            {exporting ? 'Exportiere...' : `An Lemlist senden (${leads.filter(l => l.status === 'generated').length})`}
                        </Button>

                        {exportResult && (
                            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-sm flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <strong>Export erfolgreich!</strong><br/>
                                    {exportResult.success} Leads übertragen.<br/>
                                    {exportResult.failed > 0 && (
                                        <>
                                            <span className="text-red-600 font-medium">{exportResult.failed} fehlgeschlagen.</span>
                                            {exportResult.errors && exportResult.errors.length > 0 && (
                                                <div className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300">
                                                    <strong>Gründe:</strong>
                                                    <ul className="list-disc list-inside mt-1">
                                                        {exportResult.errors.map((err, i) => (
                                                            <li key={i} className="truncate max-w-[250px]" title={err}>{err}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right: Lead List */}
            <div className="lg:col-span-2 space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Lade Leads...</div>
                ) : leads.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl">
                        <p className="text-muted-foreground">Noch keine Leads generiert. Gehe zurück zum Icebreaker Generator.</p>
                    </div>
                ) : (
                    leads.map((lead) => (
                        <Card key={lead.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                            {lead.first_name} {lead.last_name} 
                                            <span className="text-muted-foreground font-normal ml-2">@ {lead.company_name}</span>
                                        </h3>
                                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {lead.status === 'exported' && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full whitespace-nowrap">Bereits in Lemlist</span>
                                        )}
                                        {editingId === lead.id ? (
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => saveEdit(lead.id)}>
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={cancelEdit}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={() => startEdit(lead)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                                    {editingId === lead.id ? (
                                        <textarea 
                                            className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm resize-none"
                                            rows={3}
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            autoFocus
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            "{lead.icebreaker}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>

      </main>
    </div>
  );
}
