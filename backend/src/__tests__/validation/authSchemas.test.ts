import { describe, it, expect } from '@jest/globals'
import {
  signupSchema,
  signinSchema,
  confirmSchema,
  resendSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../validation/authSchemas'

describe('Auth Validation Schemas', () => {
  describe('signupSchema', () => {
    it('should validate correct signup data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
      }
      const result = signupSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'John Doe',
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid email address')
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'short',
        name: 'John Doe',
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Password must be at least 8 characters')
    })

    it('should reject empty name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: '',
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Name is required')
    })

    it('should reject long name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'A'.repeat(101),
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Name must be less than 100 characters')
    })

    it('should reject missing fields', () => {
      const invalidData = {
        email: 'test@example.com',
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('signinSchema', () => {
    it('should validate correct signin data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      }
      const result = signinSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      }
      const result = signinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid email address')
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      }
      const result = signinSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Password is required')
    })
  })

  describe('confirmSchema', () => {
    it('should validate correct confirm data', () => {
      const validData = {
        email: 'test@example.com',
        code: '123456',
      }
      const result = confirmSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        code: '123456',
      }
      const result = confirmSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid email address')
    })

    it('should reject short code', () => {
      const invalidData = {
        email: 'test@example.com',
        code: '123',
      }
      const result = confirmSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Code must be at least 6 characters')
    })

    it('should reject long code', () => {
      const invalidData = {
        email: 'test@example.com',
        code: '1234567',
      }
      const result = confirmSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Code must be exactly 6 characters')
    })
  })

  describe('resendSchema', () => {
    it('should validate correct resend data', () => {
      const validData = {
        email: 'test@example.com',
      }
      const result = resendSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
      }
      const result = resendSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid email address')
    })
  })

  describe('forgotPasswordSchema', () => {
    it('should validate correct forgot password data', () => {
      const validData = {
        email: 'test@example.com',
      }
      const result = forgotPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
      }
      const result = forgotPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid email address')
    })
  })

  describe('resetPasswordSchema', () => {
    it('should validate correct reset password data', () => {
      const validData = {
        email: 'test@example.com',
        code: '123456',
        newPassword: 'newpassword123',
      }
      const result = resetPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        code: '123456',
        newPassword: 'newpassword123',
      }
      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid email address')
    })

    it('should reject short code', () => {
      const invalidData = {
        email: 'test@example.com',
        code: '123',
        newPassword: 'newpassword123',
      }
      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Code must be at least 6 characters')
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        code: '123456',
        newPassword: 'short',
      }
      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Password must be at least 8 characters')
    })
  })
})
