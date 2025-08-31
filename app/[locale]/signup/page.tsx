import { redirectIfAuthenticated } from '@/lib/auth-guard';
import { SignupForm } from './components/signup-form';

export default async function SignupPage() {
  await redirectIfAuthenticated();
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SignupForm />
    </div>
  );
}