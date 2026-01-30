'use client';

import { Suspense } from 'react';
import IcebreakerClient from './IcebreakerClient';

export default function IcebreakerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lade Icebreaker...</div>}>
      <IcebreakerClient />
    </Suspense>
  );
}
