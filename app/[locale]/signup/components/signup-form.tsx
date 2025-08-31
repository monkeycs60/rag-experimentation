'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations, useLocale } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, UserPlus, Eye, EyeOff } from 'lucide-react';
import { signupAction } from '../actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleButton } from '../../components/auth/google-button';
import { authClient } from '@/lib/auth-client';

export function SignupForm() {
	const t = useTranslations('auth');
	const locale = useLocale();
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const { refetch: refetchSession } = authClient.useSession();

	const formSchema = z.object({
		name: z.string().min(2, t('nameMinLength')),
		email: z.string().email(t('invalidEmail')),
		password: z.string().min(6, t('passwordMinLength')),
	});

	type FormData = z.infer<typeof formSchema>;

	const {
		register,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<FormData>({
		resolver: zodResolver(formSchema),
	});

	const { execute: executeSignup, isExecuting } = useAction(signupAction, {
		onError: ({ error }) => {
			if (error.serverError) {
				setError('root', { message: error.serverError });
			} else {
				setError('root', { message: t('signupFailed') });
			}
		},
		onSuccess: async ({ data }) => {
			if (data?.success) {
				refetchSession?.();
				router.refresh();
				router.push(`/${locale}/dashboard`);
			}
		},
	});

	const handleSignup = async (data: FormData) => {
		executeSignup(data);
	};

	const handlePasswordToggle = () => {
		setShowPassword((prev) => !prev);
	};

	return (
		<div className='w-md mx-auto'>
			<Card>
				<CardHeader className='text-center space-y-4'>
					<div className='w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto'>
						<UserPlus className='w-6 h-6 text-primary-foreground' />
					</div>
					<div>
						<CardTitle className='text-xl'>
							{t('createAccount')}
						</CardTitle>
						<p className='text-muted-foreground mt-2'>
							{t('signUpToStart')}
						</p>
					</div>
				</CardHeader>

				<CardContent className='space-y-6'>
					{/* Google Sign-In Button */}
					<GoogleButton mode='signup' />

					{/* Divider */}
					<div className='relative'>
						<div className='absolute inset-0 flex items-center'>
							<span className='w-full border-t' />
						</div>
						<div className='relative flex justify-center text-xs uppercase'>
							<span className='bg-background px-2 text-muted-foreground'>
								{t('orDivider')}
							</span>
						</div>
					</div>

					<form
						onSubmit={handleSubmit(handleSignup)}
						className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='name'>{t('name')}</Label>
							<Input
								id='name'
								type='text'
								{...register('name')}
								placeholder={t('namePlaceholder')}
								disabled={isExecuting}
							/>
							{errors.name && (
								<p className='text-sm text-destructive'>
									{errors.name.message}
								</p>
							)}
						</div>

						<div className='space-y-2'>
							<Label htmlFor='email'>{t('email')}</Label>
							<Input
								id='email'
								type='email'
								{...register('email')}
								placeholder={t('emailPlaceholder')}
								disabled={isExecuting}
							/>
							{errors.email && (
								<p className='text-sm text-destructive'>
									{errors.email.message}
								</p>
							)}
						</div>

						<div className='space-y-2'>
							<Label htmlFor='password'>{t('password')}</Label>
							<div className='relative'>
								<Input
									id='password'
									type={showPassword ? 'text' : 'password'}
									{...register('password')}
									placeholder={t('passwordPlaceholder')}
									disabled={isExecuting}
								/>
								<Button
									type='button'
									variant='ghost'
									size='sm'
									className='absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1'
									onClick={handlePasswordToggle}>
									{showPassword ? (
										<EyeOff className='w-4 h-4' />
									) : (
										<Eye className='w-4 h-4' />
									)}
								</Button>
							</div>
							{errors.password && (
								<p className='text-sm text-destructive'>
									{errors.password.message}
								</p>
							)}
						</div>

						{errors.root && (
							<div className='flex items-center gap-2 text-sm text-destructive'>
								<AlertCircle className='w-4 h-4' />
								{errors.root.message}
							</div>
						)}

						<Button
							type='submit'
							disabled={isExecuting}
							className='w-full py-6'>
							{isExecuting ? t('loading') : t('signUp')}
						</Button>
					</form>

					<div className='text-center'>
						<p className='text-sm text-muted-foreground'>
							{t('alreadyHaveAccount')}{' '}
							<Link
								href={`/${locale}/login`}
								className='font-medium text-primary hover:underline'>
								{t('signIn')}
							</Link>
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
