'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface IndexStatsProps {
  stats: {
    totalVectors: number;
    uniqueDocuments: string[];
  } | null;
  onStatsUpdate: (stats: typeof stats) => void;
}

export function IndexStats({ stats, onStatsUpdate }: IndexStatsProps) {
  const t = useTranslations('rag');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'success' | 'error'>('idle');


  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/rag/stats');
      const result = await response.json();
      if (result.success) {
        onStatsUpdate(result.stats);
      }
    } catch (error) {
      console.error('Error refreshing stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteStatus('idle');
    
    try {
      const response = await fetch('/api/rag/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      const result = await response.json();

      if (result.success) {
        setDeleteStatus('success');
        onStatsUpdate({ totalVectors: 0, uniqueDocuments: [] });
      } else {
        setDeleteStatus('error');
      }
    } catch (error) {
      console.error('Error deleting index:', error);
      setDeleteStatus('error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t('stats.title')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            {t('stats.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">
                    {stats.totalVectors.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600">
                    {t('stats.totalVectors')}
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {stats.uniqueDocuments?.length || 0}
                  </div>
                  <div className="text-sm text-green-600">
                    {t('stats.uniqueDocuments')}
                  </div>
                </div>
              </div>

              {stats.totalVectors === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('stats.emptyIndex')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {t('stats.noData')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Card */}
      {stats && stats.totalVectors > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">
              {t('stats.dangerZone')}
            </CardTitle>
            <CardDescription>
              {t('stats.dangerZoneDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isDeleting}
                  className="w-full"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('stats.deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('stats.deleteButton')}
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('stats.deleteConfirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('stats.deleteConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t('stats.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    {t('stats.confirmDelete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete Status Messages */}
            {deleteStatus === 'success' && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  {t('stats.deleteSuccess')}
                </AlertDescription>
              </Alert>
            )}

            {deleteStatus === 'error' && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  {t('stats.deleteError')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}