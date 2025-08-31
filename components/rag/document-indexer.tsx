'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';

interface DocumentIndexerProps {
  onStatsUpdate: (stats: { totalVectors: number; uniqueDocuments: string[] } | null) => void;
  onIndexComplete: () => void;
}

export function DocumentIndexer({ onStatsUpdate, onIndexComplete }: DocumentIndexerProps) {
  const t = useTranslations('rag');
  const [isIndexing, setIsIndexing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const refreshStats = async () => {
    try {
      const response = await fetch('/api/rag/stats');
      const result = await response.json();
      if (result.success) {
        onStatsUpdate(result.stats);
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  const handleIndexDocuments = async () => {
    setIsIndexing(true);
    setStatus('idle');
    setProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      const response = await fetch('/api/rag/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfDirectory: './pdf' }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setResultMessage(result.message);
        refreshStats();
        setTimeout(() => {
          onIndexComplete();
        }, 2000);
      } else {
        setStatus('error');
        setResultMessage(result.error || t('indexing.error.generic'));
      }

      setProgress(100);
      clearInterval(progressInterval);
    } catch (error) {
      clearInterval(progressInterval);
      setStatus('error');
      setResultMessage(t('indexing.error.generic'));
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t('indexing.title')}
        </CardTitle>
        <CardDescription>
          {t('indexing.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Indexing Button */}
        <Button 
          onClick={handleIndexDocuments}
          disabled={isIndexing}
          className="w-full"
          size="lg"
        >
          {isIndexing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('indexing.processing')}
            </>
          ) : (
            t('indexing.startButton')
          )}
        </Button>

        {/* Progress Bar */}
        {isIndexing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('indexing.progress')}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Status Messages */}
        {status === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {resultMessage}
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {resultMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Information */}
        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
          <p className="font-medium mb-1">{t('indexing.info.title')}</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>{t('indexing.info.pdfs')}</li>
            <li>{t('indexing.info.chunks')}</li>
            <li>{t('indexing.info.embeddings')}</li>
            <li>{t('indexing.info.storage')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}