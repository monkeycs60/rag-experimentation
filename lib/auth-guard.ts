import { redirect } from 'next/navigation';
import { getTypedSession } from './auth-helpers';

export async function redirectIfAuthenticated() {
  const session = await getTypedSession();
  
  if (session) {
    redirect('/dashboard');
  }
}