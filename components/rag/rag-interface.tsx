'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentIndexer } from './document-indexer';
import { SearchInterface } from './search-interface';
import { IndexStats } from './index-stats';

interface RagInterfaceProps {
  initialStats: {
    totalVectors: number;
    uniqueDocuments: string[];
  } | null;
}

export function RagInterface({ initialStats }: RagInterfaceProps) {
  const t = useTranslations('rag');
  const [stats, setStats] = useState(initialStats);
  const [activeTab, setActiveTab] = useState('search');

  const handleStatsUpdate = (newStats: typeof initialStats) => {
    setStats(newStats);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="search">{t('tabs.search')}</TabsTrigger>
        <TabsTrigger value="index">{t('tabs.index')}</TabsTrigger>
        <TabsTrigger value="stats">{t('tabs.stats')}</TabsTrigger>
      </TabsList>

      <TabsContent value="search" className="mt-6">
        <SearchInterface />
      </TabsContent>

      <TabsContent value="index" className="mt-6">
        <DocumentIndexer 
          onStatsUpdate={handleStatsUpdate}
          onIndexComplete={() => setActiveTab('search')}
        />
      </TabsContent>

      <TabsContent value="stats" className="mt-6">
        <IndexStats 
          stats={stats}
          onStatsUpdate={handleStatsUpdate}
        />
      </TabsContent>
    </Tabs>
  );
}