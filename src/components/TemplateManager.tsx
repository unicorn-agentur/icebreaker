'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PromptTemplate } from '@/types/database';
import { Trash2, FileText, Plus, ArrowLeft } from 'lucide-react';
import { SimpleModal } from '@/components/ui/simple-modal';

interface TemplateManagerProps {
  currentPrompt: string;
  onLoadTemplate: (content: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateManager({ currentPrompt, onLoadTemplate, isOpen, onClose }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [mode, setMode] = useState<'list' | 'save'>('list');

  useEffect(() => {
    if (isOpen) {
        fetchTemplates();
        setMode('list');
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('prompt_templates').select('*').order('created_at', { ascending: false });
    if (data) setTemplates(data);
  };

  const handleSave = async () => {
    if (!newTemplateName) return;
    const { error } = await supabase.from('prompt_templates').insert({
      name: newTemplateName,
      content: currentPrompt
    });
    if (!error) {
      setNewTemplateName('');
      fetchTemplates();
      setMode('list');
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('prompt_templates').delete().eq('id', id);
    fetchTemplates();
  };

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title={mode === 'save' ? 'Als Template speichern' : 'Vorlagen verwalten'}>
      {mode === 'list' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <p className="text-sm text-muted-foreground">Wähle eine Vorlage oder speichere den aktuellen Prompt.</p>
             <Button size="sm" onClick={() => setMode('save')} className="gap-2">
                <Plus className="w-4 h-4" /> Neu speichern
             </Button>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    Keine Vorlagen gefunden.
                </div>
            ) : (
                templates.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 group hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onClick={() => { onLoadTemplate(t.content); onClose(); }}>
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium truncate text-gray-700 dark:text-gray-200">{t.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Name der Vorlage</label>
                <Input 
                    placeholder="z.B. Formell - CEO Ansprache" 
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
            </div>
            <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setMode('list')} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Zurück
                </Button>
                <Button onClick={handleSave} disabled={!newTemplateName}>Speichern</Button>
            </div>
        </div>
      )}
    </SimpleModal>
  );
}
