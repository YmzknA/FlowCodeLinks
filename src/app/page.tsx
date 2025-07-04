'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CodeVisualizer } from '@/components/CodeVisualizer';

export default function Home() {
  return (
    <ErrorBoundary>
      <CodeVisualizer />
    </ErrorBoundary>
  );
}