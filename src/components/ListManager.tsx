'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trash2, RefreshCw, Database, FileSpreadsheet, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ListStat = {
  name: string;
  total: number;
  pending: number;
  generated: number;
  exported: number;
  error: number;
};

export function ListManager({ onListDeleted }: { onListDeleted?: () => void }) {
  const router = useRouter();
  const [lists, setLists] = useState<ListStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchListStats();
  }, []);

  const fetchListStats = async () => {
    setLoading(true);
    // Fetch all leads with just the necessary columns to aggregate client-side
    // Note: For production with >50k rows, use an RPC function instead.
    const { data, error } = await supabase
      .from('leads')
      .select('list_name, status');

    if (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
      return;
    }

    if (!data) {
      setLists([]);
      setLoading(false);
      return;
    }

    // Aggregate stats
    const statsMap = new Map<string, ListStat>();

    data.forEach(lead => {
      const name = lead.list_name || 'Unbenannt';
      if (!statsMap.has(name)) {
        statsMap.set(name, {
          name,
          total: 0,
          pending: 0,
          generated: 0,
          exported: 0,
          error: 0
        });
      }

      const stat = statsMap.get(name)!;
      stat.total++;
      
      switch (lead.status) {
        case 'pending': stat.pending++; break;
        case 'generated': stat.generated++; break;
        case 'exported': stat.exported++; break;
        case 'error': stat.error++; break;
      }
    });

    const sortedLists = Array.from(statsMap.values()).sort((a, b) => b.total - a.total);
    setLists(sortedLists);
    setLoading(false);
  };

  const handleDeleteList = async (listName: string) => {
    if (!confirm(`Möchtest du die Liste "${listName}" und ALLE zugehörigen Leads wirklich löschen?`)) {
      return;
    }

    setDeleting(listName);
    
    // Delete leads with this list_name
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('list_name', listName);

    if (error) {
      alert('Fehler beim Löschen: ' + error.message);
    } else {
      await fetchListStats();
      if (onListDeleted) onListDeleted();
    }
    
    setDeleting(null);
  };

  const handleSelectList = (listName: string) => {
      router.push(`/icebreaker?list=${encodeURIComponent(listName)}`);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Lade Listen...</div>;
  }

  if (lists.length === 0) {
    return null; // Don't show if no lists
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> Deine Listen
        </h2>
        <Button variant="ghost" size="sm" onClick={fetchListStats}>
          <RefreshCw className="w-4 h-4 mr-2" /> Aktualisieren
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <Card 
            key={list.name} 
            className="overflow-hidden hover:shadow-md transition-all border-l-4 border-l-primary/50 cursor-pointer group"
            onClick={() => handleSelectList(list.name)}
          >
            <CardHeader className="pb-3 bg-gray-50/50 dark:bg-gray-800/50 group-hover:bg-primary/5 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors" title={list.name}>
                    {list.name}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {list.total} Leads gesamt
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 z-10"
                  onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.name);
                  }}
                  disabled={deleting === list.name}
                  title="Liste löschen"
                >
                  {deleting === list.name ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fortschritt</span>
                  <span>{Math.round(((list.generated + list.exported) / list.total) * 100)}%</span>
                </div>
                <Progress value={((list.generated + list.exported) / list.total) * 100} className="h-1.5" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700">
                  <span className="text-muted-foreground mb-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Offen
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{list.pending}</span>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-xs flex flex-col items-center justify-center border border-green-100 dark:border-green-900/30">
                  <span className="text-green-600 dark:text-green-400 mb-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Fertig
                  </span>
                  <span className="font-semibold text-green-700 dark:text-green-300">{list.generated + list.exported}</span>
                </div>
              </div>
              
              {list.error > 0 && (
                 <div className="text-xs text-red-500 flex items-center gap-1 justify-center bg-red-50 dark:bg-red-900/10 py-1 rounded">
                    <AlertCircle className="w-3 h-3" /> {list.error} Fehler
                 </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}