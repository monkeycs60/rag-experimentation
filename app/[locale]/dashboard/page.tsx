import { getTypedSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getTypedSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="bg-card p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Welcome, {session.user.name}!</h2>
          <p className="text-muted-foreground">You are successfully logged in.</p>
        </div>
      </div>
    </div>
  );
}