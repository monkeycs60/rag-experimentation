'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, User, Hash, Target } from 'lucide-react';

interface SearchResult {
  id: string;
  score: number;
  metadata: {
    text: string;
    fileName: string;
    pageNumber?: number;
    chunkIndex: number;
    author?: string;
  };
  relevanceScore: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  contextualAnswer: string;
  isLoading: boolean;
}

export function SearchResults({ results, contextualAnswer, isLoading }: SearchResultsProps) {
  const t = useTranslations('rag');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('results.loading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">
              {t('results.searching')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0 && !contextualAnswer) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Contextual Answer */}
      {contextualAnswer && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-900">
              {t('results.contextualAnswer')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-40">
              <div className="whitespace-pre-wrap text-sm text-blue-800">
                {contextualAnswer}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t('results.title')}
              </span>
              <Badge variant="secondary">
                {results.length} {t('results.found')}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('results.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <Card key={result.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        {result.metadata.fileName}
                      </CardTitle>
                      <Badge 
                        variant="outline" 
                        className="text-green-700 border-green-300 bg-green-50"
                      >
                        {Math.round(result.relevanceScore * 100)}% {t('results.relevance')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {result.metadata.author && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {result.metadata.author}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {t('results.chunk')} {result.metadata.chunkIndex + 1}
                      </div>
                      {result.metadata.pageNumber && (
                        <div>
                          {t('results.page')} {result.metadata.pageNumber}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-24">
                      <p className="text-sm leading-relaxed">
                        {result.metadata.text}
                      </p>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}