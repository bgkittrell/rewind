import { z } from 'zod'

// Auth signup schema
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
})

// Auth signin schema
export const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Auth confirm schema
export const confirmSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(6, 'Code must be at least 6 characters').max(6, 'Code must be exactly 6 characters'),
})

// Auth resend schema
export const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// Auth forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// Auth reset password schema
export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(6, 'Code must be at least 6 characters').max(6, 'Code must be exactly 6 characters'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

// Export types for TypeScript
export type SignupRequest = z.infer<typeof signupSchema>
export type SigninRequest = z.infer<typeof signinSchema>
export type ConfirmRequest = z.infer<typeof confirmSchema>
export type ResendRequest = z.infer<typeof resendSchema>
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>
