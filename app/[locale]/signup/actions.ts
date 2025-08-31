'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { unauthenticatedAction } from '@/lib/actions/safe-action';
import { getTranslations } from 'next-intl/server';

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupAction = unauthenticatedAction
  .inputSchema(signupSchema)
  .action(async ({ parsedInput: { name, email, password } }) => {
    const t = await getTranslations('auth');
    
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name,
          email,
          password,
        },
      });

      if ('error' in result && result.error) {
        return {
          success: false,
          error: t('signupFailed'),
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: t('signupFailed'),
      };
    }
  });