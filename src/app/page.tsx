'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CsvUploader } from '@/components/CsvUploader';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Database, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepNavigation } from '@/components/StepNavigation';

export default function Home() {
  const [hasLeads, setHasLeads] = useState<boolean | null>(null);

  useEffect(() => {
    checkLeads();
  }, []);

  const checkLeads = async () => {
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error checking leads:', error);
    } else {
      setHasLeads(count !== null && count > 0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <main className="max-w-7xl mx-auto space-y-12 py-8">
        
        {/* Hero Section */}
        <header className="text-center space-y-6 mb-8">
          <div className="inline-flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm mb-4 border border-gray-100 dark:border-gray-700">
             <span className="text-xs font-medium text-gray-500 dark:text-gray-400">AI Cold Outreach v1.0</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Unicorn <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Icebreaker</span>
          </h1>
        </header>

        <StepNavigation />

        {/* Main Action Area */}
        <section className="w-full">
             <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 md:p-8">
                    <CsvUploader onUploadComplete={checkLeads} />
                </div>
             </div>
        </section>

      </main>
    </div>
  );
}
