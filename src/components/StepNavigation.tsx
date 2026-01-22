'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Database, Sparkles, Zap, Check } from 'lucide-react';

export function StepNavigation() {
  const pathname = usePathname();

  const steps = [
    {
      id: 1,
      name: 'Import',
      description: 'CSV Upload',
      href: '/',
      icon: Database,
      isActive: pathname === '/',
      isCompleted: pathname !== '/', // Simplified assumption: if we are not on home, we passed home
    },
    {
      id: 2,
      name: 'Generate',
      description: 'AI Research & Writing',
      href: '/icebreaker',
      icon: Sparkles,
      isActive: pathname === '/icebreaker',
      isCompleted: false, // Logic could be more complex based on state
    },
    {
      id: 3,
      name: 'Export',
      description: 'Push to Lemlist',
      href: '/export', // We will create this
      icon: Zap,
      isActive: pathname === '/export',
      isCompleted: false,
    },
  ];

  return (
    <nav aria-label="Progress" className="w-full max-w-4xl mx-auto mb-12">
      <ol role="list" className="divide-y divide-gray-300 dark:divide-gray-700 rounded-md border border-gray-300 dark:border-gray-700 md:flex md:divide-y-0 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className="relative md:flex-1 md:flex">
            {step.isCompleted ? (
              <Link href={step.href} className="group flex w-full items-center">
                <span className="flex items-center px-6 py-4 text-sm font-medium">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary group-hover:bg-primary/90 transition-colors">
                    <Check className="h-6 w-6 text-white" aria-hidden="true" />
                  </span>
                  <span className="ml-4 text-sm font-medium text-gray-900 dark:text-gray-100">{step.name}</span>
                </span>
              </Link>
            ) : step.isActive ? (
              <Link href={step.href} className="flex items-center px-6 py-4 text-sm font-medium" aria-current="step">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary">
                  <step.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </span>
                <span className="ml-4 text-sm font-medium text-primary">{step.name}</span>
              </Link>
            ) : (
              <Link href={step.href} className="group flex items-center">
                <span className="flex items-center px-6 py-4 text-sm font-medium">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-gray-400 transition-colors">
                    <step.icon className="h-6 w-6 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-300" aria-hidden="true" />
                  </span>
                  <span className="ml-4 text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-300">{step.name}</span>
                </span>
              </Link>
            )}

            {stepIdx !== steps.length - 1 ? (
              <>
                {/* Arrow separator for md screens and up */}
                <div className="hidden md:block absolute top-0 right-0 h-full w-5" aria-hidden="true">
                  <svg
                    className="h-full w-full text-gray-300 dark:text-gray-700"
                    viewBox="0 0 22 80"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 -2L20 40L0 82"
                      vectorEffect="non-scaling-stroke"
                      stroke="currentcolor"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
