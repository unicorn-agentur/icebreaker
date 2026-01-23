import { Suspense } from 'react';
import ExportClient from './ExportClient';

export const dynamic = 'force-dynamic';

export default function ExportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lade Export...</div>}>
      <ExportClient />
    </Suspense>
  );
}
