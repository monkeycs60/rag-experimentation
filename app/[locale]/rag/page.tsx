import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { RagInterface } from '@/components/rag/rag-interface';
import { ragService } from '@/lib/services/rag.service';

export default async function RagPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const t = await getTranslations('rag');
  
  // Get initial index stats
  let initialStats = null;
  try {
    initialStats = await ragService.getIndexStats();
  } catch (error) {
    console.error('Error getting initial stats:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        
        <RagInterface 
          initialStats={initialStats}
        />
      </div>
    </div>
  );
}