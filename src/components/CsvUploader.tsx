'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { fetchOptOutList, isOptedOut, type OptOutEntry } from '@/lib/opt-out';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Upload, FileUp, CheckCircle, AlertCircle, FileSpreadsheet, List, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

function StatCard({ label, value, icon, color, bg, highlight = false }: { label: string, value: number, icon: React.ReactNode, color: string, bg: string, highlight?: boolean }) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 h-full",
            "bg-white dark:bg-gray-800",
            highlight ? "border-green-200 dark:border-green-900 shadow-md scale-105 z-10" : "border-gray-100 dark:border-gray-700 shadow-sm"
        )}>
            <div className={cn("p-2 rounded-full mb-2 shrink-0", bg)}>
                <div className={color}>{icon}</div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide text-center whitespace-nowrap">{label}</p>
            <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
        </div>
    );
}

export function CsvUploader({ onUploadComplete }: { onUploadComplete: () => void }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{ total: number; optedOut: number; noWebsite: number; skipped: number; uploaded: number; debugKeys?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [listName, setListName] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    if (!listName) {
        setError("Bitte gib zuerst einen Namen für diese Liste ein.");
        return;
    }

    setUploading(true);
    setProgress(0);
    setStats(null);
    setError(null);

    try {
      // 1. Fetch Opt-Out List
      const optOutList = await fetchOptOutList();
      setProgress(10);

      // 2. Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        // transformHeader removed to preserve original case for better matching
        complete: async (results) => {
          const rows = results.data as any[];
          const total = rows.length;
          let optedOutCount = 0;
          let noWebsiteCount = 0;
          let skippedCount = 0;
          const validLeads: any[] = [];

          setProgress(30);

          // 3. Filter & Map Data
          // Helper to find column with case-insensitive matching
          const findCol = (row: any, candidates: string[]) => {
            const rowKeys = Object.keys(row);
            
            // 1. Exact match (case insensitive)
            for (const candidate of candidates) {
                const key = rowKeys.find(k => k.toLowerCase().trim() === candidate.toLowerCase().trim());
                if (key && row[key] && row[key].trim() !== '') return row[key];
            }
            
            // 2. Fuzzy match (contains)
            for (const candidate of candidates) {
                 const key = rowKeys.find(k => k.toLowerCase().includes(candidate.toLowerCase()));
                 if (key && row[key] && row[key].trim() !== '') return row[key];
            }

            return null;
          };

          // Debugging
          if (rows.length > 0) {
            console.log('First row keys:', Object.keys(rows[0]));
            console.log('First row values:', Object.values(rows[0]));
          }

          let debugFirstRowKeys: string[] = [];
          if (rows.length > 0) {
              debugFirstRowKeys = Object.keys(rows[0]);
          }

          // FIX: Check for "Quoted Row" issue where the entire row is wrapped in quotes
          // This happens if the CSV is malformed or exported weirdly (e.g. Row 1 is headers, Row 2 is "Val1,Val2,Val3")
          // In this case, PapaParse puts the whole row into the first column.
          let processedRows = rows;
          const firstRow = rows[0];
          const firstKey = Object.keys(firstRow)[0];
          const firstValue = firstRow[firstKey];

          if (
              rows.length > 0 && 
              Object.keys(firstRow).length === 1 && // Only 1 column detected
              typeof firstValue === 'string' && 
              firstValue.includes(',') // And it contains commas
          ) {
              console.log("⚠️ Detected Malformed CSV (Quoted Rows). Attempting to fix...");
              
              // We need to re-parse the values of the first column as if they were the rows
              // The headers are likely correct (from the first line of file), but the data is jammed into col 1.
              // Actually, PapaParse might have parsed headers correctly if line 1 was normal.
              // Let's check results.meta.fields
              const headers = results.meta.fields || [];
              
              if (headers.length > 1) {
                  // Headers are fine, but rows are jammed.
                  // We need to re-map the data.
                  processedRows = rows.map(row => {
                      // Get the jammed string (value of the first key)
                      const jammedString = Object.values(row)[0] as string;
                      if (!jammedString) return {};

                      // Parse this single string as a CSV line
                      const parsedLine = Papa.parse(jammedString, { header: false }).data[0] as any[];
                      
                      // Map back to headers
                      const newRow: any = {};
                      headers.forEach((header, index) => {
                          newRow[header] = parsedLine[index];
                      });
                      return newRow;
                  });
                  console.log("Fixed Rows (Example):", processedRows[0]);
              }
          }

          for (const row of processedRows) {
            // Flexible column mapping
            // Priority: Exact "Email" -> "Email Address" -> Fuzzy "Email"
            let email = null;
            
            // Strategy 1: Exact match for "Email" (most common)
            if (row['Email'] && row['Email'].trim()) email = row['Email'];
            else if (row['email'] && row['email'].trim()) email = row['email'];
            
            // Strategy 2: Common variations
            if (!email) {
                email = findCol(row, ['Email', 'Email Address', 'E-mail', 'Contact Email', 'Primary Email']);
            }

            // Strategy 3: Any column with "email" in name (risky but needed if headers are weird)
            if (!email) {
                 const emailKey = Object.keys(row).find(k => k.toLowerCase().includes('email') && !k.toLowerCase().includes('status') && !k.toLowerCase().includes('source'));
                 if (emailKey && row[emailKey]) email = row[emailKey];
            }
            
            // Try explicit website columns first, then fuzzy search if needed
            let website = findCol(row, ['Website', 'Company Website', 'Company Url', 'Url']);
            
            if (!email) {
                skippedCount++;
                continue; // Skip rows without email
            }

            if (isOptedOut(email, optOutList)) {
              optedOutCount++;
              continue;
            }

            if (!website) {
                noWebsiteCount++;
                continue;
            }

            validLeads.push({
              first_name: findCol(row, ['First Name', 'FirstName', 'Given Name']),
              last_name: findCol(row, ['Last Name', 'LastName', 'Surname']),
              email: email,
              company_name: findCol(row, ['Company Name', 'Company', 'Organization', 'Company Name for Emails']),
              website: website,
              linkedin: findCol(row, ['Person Linkedin Url', 'Linkedin', 'Linkedin Url']),
              status: 'pending',
              list_name: listName // Add the list name
            });
          }

          setProgress(60);

          // 4. Upload to Supabase in chunks
          const chunkSize = 100;
          let uploadedCount = 0;

          for (let i = 0; i < validLeads.length; i += chunkSize) {
            const chunk = validLeads.slice(i, i + chunkSize);
            const { error: uploadError } = await supabase
              .from('leads')
              .insert(chunk);

            if (uploadError) {
              console.error('Error uploading chunk:', JSON.stringify(uploadError, null, 2));
              throw new Error('Fehler beim Hochladen in die Datenbank: ' + (uploadError.message || 'Unbekannter Fehler'));
            }

            uploadedCount += chunk.length;
            const currentProgress = 60 + ((uploadedCount / validLeads.length) * 40);
            setProgress(currentProgress);
          }

          setStats({
            total,
            optedOut: optedOutCount,
            noWebsite: noWebsiteCount,
            skipped: skippedCount,
            uploaded: uploadedCount,
            debugKeys: debugFirstRowKeys
          });
          setUploading(false);
          onUploadComplete();
        },
        error: (err) => {
            console.error(err);
            setError("Fehler beim Lesen der CSV Datei.");
            setUploading(false);
        }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
        
        {/* List Name Input */}
        {!uploading && !stats && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name der Liste / Kampagne
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <List className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="z.B. Agenturen Berlin Q1" 
                            className="pl-9" 
                            value={listName}
                            onChange={(e) => setListName(e.target.value)}
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Dieser Name hilft dir später, die Leads im Generator wiederzufinden.
                </p>
            </div>
        )}

        {!uploading && !stats && (
            <div className={cn("transition-opacity", !listName ? "opacity-50 pointer-events-none" : "opacity-100")}>
                <label 
                    htmlFor="dropzone-file" 
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300",
                        isDragging 
                            ? "border-primary bg-primary/5 scale-[1.02]" 
                            : "border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                        <div className={cn("p-4 rounded-full mb-4 transition-colors", isDragging ? "bg-primary/20 text-primary" : "bg-gray-100 dark:bg-gray-700 text-gray-500")}>
                            <Upload className="w-8 h-8" />
                        </div>
                        <p className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">
                            CSV Datei hier ablegen
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                            Unterstützt Apollo Exports. Automatische Filterung.
                        </p>
                    </div>
                    <input id="dropzone-file" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={!listName} />
                </label>
            </div>
        )}

        {uploading && (
            <div className="space-y-6 py-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary blur-xl opacity-20 animate-pulse"></div>
                        <div className="relative bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg">
                             <FileUp className="w-8 h-8 text-primary animate-bounce" />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold">Importiere in "{listName}"...</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                        Deine Leads werden geprüft, gefiltert und sicher in die Datenbank übertragen.
                    </p>
                </div>
                <div className="max-w-md mx-auto">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground mt-2">{Math.round(progress)}% abgeschlossen</p>
                </div>
            </div>
        )}

        {stats && (
            <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard 
                        label="Gefunden" 
                        value={stats.total} 
                        icon={<List className="w-4 h-4" />}
                        color="text-gray-600"
                        bg="bg-gray-50/50"
                    />
                    <StatCard 
                        label="Opt-Out" 
                        value={stats.optedOut} 
                        icon={<AlertCircle className="w-4 h-4" />}
                        color="text-red-500"
                        bg="bg-red-50/50"
                    />
                    <StatCard 
                        label="Keine Website" 
                        value={stats.noWebsite} 
                        icon={<AlertCircle className="w-4 h-4" />}
                        color="text-orange-500"
                        bg="bg-orange-50/50"
                    />
                    <StatCard 
                        label="Übersprungen" 
                        value={stats.skipped} 
                        icon={<AlertCircle className="w-4 h-4" />}
                        color="text-yellow-500"
                        bg="bg-yellow-50/50"
                    />
                    <StatCard 
                        label="Importiert" 
                        value={stats.uploaded} 
                        icon={<CheckCircle className="w-4 h-4" />}
                        color="text-green-600"
                        bg="bg-green-50/50"
                        highlight
                    />
                </div>

                {stats.uploaded === 0 && stats.total > 0 ? (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-900 flex items-start space-x-3 text-orange-700 dark:text-orange-400">
                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-semibold">Keine Leads importiert</h4>
                            <p className="text-sm opacity-90">
                                {stats.skipped === stats.total 
                                    ? "Wir konnten keine Email-Adresse finden. Bitte prüfe, ob deine CSV eine Spalte 'Email' oder 'Email Address' enthält." 
                                    : "Alle Leads wurden aufgrund der Filter (Opt-Out / Keine Website) übersprungen."}
                            </p>
                            {stats.debugKeys && (
                                <div className="mt-3 p-2 bg-white/50 rounded text-xs font-mono break-all">
                                    <strong>Erkannte Spalten:</strong> {stats.debugKeys.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm">
                        <div className="flex items-center space-x-3 text-green-600 dark:text-green-400">
                            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div className="text-lg font-medium">
                                "{listName}" erfolgreich angelegt!
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                    <Button onClick={() => { setStats(null); setListName(''); }} variant="outline" className="flex-1 border-dashed">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Weitere Liste hochladen
                    </Button>
                    <Button onClick={() => router.push('/icebreaker')} className="flex-1 bg-primary hover:bg-primary/90 text-white">
                        Weiter zum Generator <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        )}

        {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900 flex items-start space-x-3 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                    <h4 className="font-semibold">Fehler beim Upload</h4>
                    <p className="text-sm opacity-90">{error}</p>
                    <Button 
                        variant="link" 
                        className="p-0 h-auto text-red-700 underline mt-2"
                        onClick={() => setError(null)}
                    >
                        Erneut versuchen
                    </Button>
                </div>
            </div>
        )}
    </div>
  );
}
