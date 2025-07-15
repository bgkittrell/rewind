import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { z } from 'zod'
import { APIGatewayProxyEvent } from 'aws-lambda'
import {
  validateRequestBody,
  validateQueryParams,
  validatePathParams,
  createValidationErrorResponse,
  withValidation,
} from '../../validation/middleware'
import { logger } from '../../services/loggerService'

// Mock the logger
jest.mock('../../services/loggerService', () => ({
  logger: {
    warn: jest.fn(),
  },
}))

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateRequestBody', () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number(),
    })

    it('should validate correct request body', () => {
      const body = JSON.stringify({ name: 'John', age: 30 })
      const result = validateRequestBody(body, testSchema, '/test')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'John', age: 30 })
      expect(result.error).toBeUndefined()
    })

    it('should reject null body', () => {
      const result = validateRequestBody(null, testSchema, '/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Request body is required')
    })

    it('should reject invalid JSON', () => {
      const body = 'invalid-json'
      const result = validateRequestBody(body, testSchema, '/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JSON in request body')
      expect(logger.warn).toHaveBeenCalledWith('Invalid JSON in request body:', {
        path: '/test',
        error: expect.any(SyntaxError),
      })
    })

    it('should reject data that fails schema validation', () => {
      const body = JSON.stringify({ name: 'John' }) // missing age
      const result = validateRequestBody(body, testSchema, '/test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('age')
      expect(logger.warn).toHaveBeenCalledWith('Request body validation failed:', {
        path: '/test',
        errors: expect.any(Array),
        body: { name: 'John' },
      })
    })

    it('should format multiple validation errors', () => {
      const body = JSON.stringify({ name: 123, age: 'not-a-number' })
      const result = validateRequestBody(body, testSchema, '/test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('name')
      expect(result.error).toContain('age')
    })
  })

  describe('validateQueryParams', () => {
    const testSchema = z.object({
      limit: z.string().transform(Number).optional(),
      filter: z.enum(['active', 'inactive']).optional(),
    })

    it('should validate correct query parameters', () => {
      const queryParams = { limit: '10', filter: 'active' as const }
      const result = validateQueryParams(queryParams, testSchema, '/test')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ limit: 10, filter: 'active' })
    })

    it('should handle null query parameters', () => {
      const result = validateQueryParams(null, testSchema, '/test')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('should reject invalid query parameters', () => {
      const queryParams = { filter: 'invalid' }
      const result = validateQueryParams(queryParams, testSchema, '/test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('filter')
      expect(logger.warn).toHaveBeenCalledWith('Query parameters validation failed:', {
        path: '/test',
        errors: expect.any(Array),
        queryParams,
      })
    })

    it('should handle empty query parameters', () => {
      const result = validateQueryParams({}, testSchema, '/test')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })
  })

  describe('validatePathParams', () => {
    const testSchema = z.object({
      id: z.string().uuid(),
      type: z.enum(['user', 'admin']),
    })

    it('should validate correct path parameters', () => {
      const pathParams = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'user' as const,
      }
      const result = validatePathParams(pathParams, testSchema, '/test')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(pathParams)
    })

    it('should handle null path parameters', () => {
      const result = validatePathParams(null, testSchema, '/test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('id')
    })

    it('should reject invalid path parameters', () => {
      const pathParams = { id: 'not-a-uuid', type: 'invalid' }
      const result = validatePathParams(pathParams, testSchema, '/test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('id')
      expect(logger.warn).toHaveBeenCalledWith('Path parameters validation failed:', {
        path: '/test',
        errors: expect.any(Array),
        pathParams,
      })
    })
  })

  describe('createValidationErrorResponse', () => {
    it('should create proper validation error response', () => {
      const response = createValidationErrorResponse('Test error', '/test')

      expect(response.statusCode).toBe(400)
      expect(response.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      })

      const body = JSON.parse(response.body)
      expect(body.error).toBe('Test error')
      expect(body.code).toBe('VALIDATION_ERROR')
      expect(body.path).toBe('/test')
    })
  })

  describe('withValidation', () => {
    const bodySchema = z.object({
      name: z.string(),
    })

    const querySchema = z.object({
      limit: z.string().transform(Number).optional(),
    })

    const pathSchema = z.object({
      id: z.string().uuid(),
    })

    const mockHandler = jest.fn()
    const mockEvent: Partial<APIGatewayProxyEvent> = {
      path: '/test',
      body: JSON.stringify({ name: 'John' }),
      queryStringParameters: { limit: '10' },
      pathParameters: { id: '123e4567-e89b-12d3-a456-426614174000' },
    }

    beforeEach(() => {
      mockHandler.mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      })
    })

    it('should validate all parameters and call handler', async () => {
      const wrappedHandler = withValidation(mockHandler, {
        bodySchema,
        querySchema,
        pathSchema,
      })

      await wrappedHandler(mockEvent as APIGatewayProxyEvent)

      expect(mockHandler).toHaveBeenCalledWith(
        mockEvent,
        { name: 'John' },
        { limit: 10 },
        { id: '123e4567-e89b-12d3-a456-426614174000' },
      )
    })

    it('should work with only body schema', async () => {
      const wrappedHandler = withValidation(mockHandler, {
        bodySchema,
      })

      await wrappedHandler(mockEvent as APIGatewayProxyEvent)

      expect(mockHandler).toHaveBeenCalledWith(mockEvent, { name: 'John' }, undefined, undefined)
    })

    it('should work with only query schema', async () => {
      const wrappedHandler = withValidation(mockHandler, {
        querySchema,
      })

      await wrappedHandler(mockEvent as APIGatewayProxyEvent)

      expect(mockHandler).toHaveBeenCalledWith(mockEvent, undefined, { limit: 10 }, undefined)
    })

    it('should work with only path schema', async () => {
      const wrappedHandler = withValidation(mockHandler, {
        pathSchema,
      })

      await wrappedHandler(mockEvent as APIGatewayProxyEvent)

      expect(mockHandler).toHaveBeenCalledWith(mockEvent, undefined, undefined, {
        id: '123e4567-e89b-12d3-a456-426614174000',
      })
    })

    it('should return validation error for invalid body', async () => {
      const invalidEvent = {
        ...mockEvent,
        body: JSON.stringify({ age: 30 }), // missing name
      }

      const wrappedHandler = withValidation(mockHandler, {
        bodySchema,
      })

      const response = await wrappedHandler(invalidEvent as APIGatewayProxyEvent)

      expect(response.statusCode).toBe(400)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should return validation error for invalid query', async () => {
      const invalidEvent = {
        ...mockEvent,
        queryStringParameters: { limit: 'not-a-number' },
      }

      const wrappedHandler = withValidation(mockHandler, {
        querySchema,
      })

      const response = await wrappedHandler(invalidEvent as APIGatewayProxyEvent)

      expect(response.statusCode).toBe(400)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should return validation error for invalid path', async () => {
      const invalidEvent = {
        ...mockEvent,
        pathParameters: { id: 'not-a-uuid' },
      }

      const wrappedHandler = withValidation(mockHandler, {
        pathSchema,
      })

      const response = await wrappedHandler(invalidEvent as APIGatewayProxyEvent)

      expect(response.statusCode).toBe(400)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should work with no validation schemas', async () => {
      const wrappedHandler = withValidation(mockHandler, {})

      await wrappedHandler(mockEvent as APIGatewayProxyEvent)

      expect(mockHandler).toHaveBeenCalledWith(mockEvent, undefined, undefined, undefined)
    })
  })
})
