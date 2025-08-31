'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { Search, Loader2, BookOpen, User } from 'lucide-react';
import { SearchResults } from './search-results';

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  topK: z.number().min(1).max(20).default(5),
  minRelevanceScore: z.number().min(0).max(1).default(0.7),
});

type SearchFormData = z.infer<typeof searchSchema>;

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

export function SearchInterface() {
  const t = useTranslations('rag');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [contextualAnswer, setContextualAnswer] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: '',
      topK: 5,
      minRelevanceScore: 0.7,
    },
  });


  const onSubmit = async (data: SearchFormData) => {
    setIsSearching(true);
    setResults([]);
    setContextualAnswer('');
    
    try {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: data.query,
          topK: data.topK,
          minRelevanceScore: data.minRelevanceScore,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setResults(result.results);
        setContextualAnswer(result.contextualAnswer);
      } else {
        setResults([]);
        setContextualAnswer('');
        console.error('Search error:', result.error);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setContextualAnswer('');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('search.title')}
          </CardTitle>
          <CardDescription>
            {t('search.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('search.queryLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('search.queryPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="topK"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('search.maxResults')}: {field.value}
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={20}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minRelevanceScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('search.minScore')}: {Math.round(field.value * 100)}%
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={1}
                          step={0.1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSearching}
                size="lg"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('search.searching')}
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    {t('search.searchButton')}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Search Results */}
      <SearchResults 
        results={results}
        contextualAnswer={contextualAnswer}
        isLoading={isSearching}
      />
    </div>
  );
}