import { redirectIfAuthenticated } from '@/lib/auth-guard';
import { LoginForm } from './components/login-form';

export default async function LoginPage() {
  await redirectIfAuthenticated();
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}