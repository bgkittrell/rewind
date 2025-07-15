import { z } from 'zod'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { createErrorResponse } from '../utils/response'
import { logger } from '../services/loggerService'

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Validates request body against a Zod schema
 */
export function validateRequestBody<T>(body: string | null, schema: z.ZodSchema<T>, path: string): ValidationResult<T> {
  if (!body) {
    return {
      success: false,
      error: 'Request body is required',
    }
  }

  try {
    const parsedBody = JSON.parse(body)
    const result = schema.safeParse(parsedBody)

    if (!result.success) {
      const errorMessage = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      logger.warn('Request body validation failed:', {
        path,
        errors: result.error.errors,
        body: parsedBody,
      })
      return {
        success: false,
        error: errorMessage,
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    logger.warn('Invalid JSON in request body:', { path, error })
    return {
      success: false,
      error: 'Invalid JSON in request body',
    }
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  queryParams: { [key: string]: string | undefined } | null,
  schema: z.ZodSchema<T>,
  path: string,
): ValidationResult<T> {
  const result = schema.safeParse(queryParams || {})

  if (!result.success) {
    const errorMessage = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
    logger.warn('Query parameters validation failed:', {
      path,
      errors: result.error.errors,
      queryParams,
    })
    return {
      success: false,
      error: errorMessage,
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

/**
 * Validates path parameters against a Zod schema
 */
export function validatePathParams<T>(
  pathParams: { [key: string]: string | undefined } | null,
  schema: z.ZodSchema<T>,
  path: string,
): ValidationResult<T> {
  const result = schema.safeParse(pathParams || {})

  if (!result.success) {
    const errorMessage = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
    logger.warn('Path parameters validation failed:', {
      path,
      errors: result.error.errors,
      pathParams,
    })
    return {
      success: false,
      error: errorMessage,
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

/**
 * Creates a validation error response
 */
export function createValidationErrorResponse(error: string, path: string): APIGatewayProxyResult {
  return createErrorResponse(error, 'VALIDATION_ERROR', 400, path)
}

/**
 * Higher-order function that wraps a handler with validation
 */
export function withValidation<TBody, TQuery, TPath>(
  handler: (
    event: APIGatewayProxyEvent,
    validatedBody?: TBody,
    validatedQuery?: TQuery,
    validatedPath?: TPath,
  ) => Promise<APIGatewayProxyResult>,
  options: {
    bodySchema?: z.ZodSchema<TBody>
    querySchema?: z.ZodSchema<TQuery>
    pathSchema?: z.ZodSchema<TPath>
  },
) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const path = event.path

    // Validate request body if schema provided
    let validatedBody: TBody | undefined
    if (options.bodySchema) {
      const bodyValidation = validateRequestBody(event.body, options.bodySchema, path)
      if (!bodyValidation.success) {
        return createValidationErrorResponse(bodyValidation.error!, path)
      }
      validatedBody = bodyValidation.data
    }

    // Validate query parameters if schema provided
    let validatedQuery: TQuery | undefined
    if (options.querySchema) {
      const queryValidation = validateQueryParams(event.queryStringParameters, options.querySchema, path)
      if (!queryValidation.success) {
        return createValidationErrorResponse(queryValidation.error!, path)
      }
      validatedQuery = queryValidation.data
    }

    // Validate path parameters if schema provided
    let validatedPath: TPath | undefined
    if (options.pathSchema) {
      const pathValidation = validatePathParams(event.pathParameters, options.pathSchema, path)
      if (!pathValidation.success) {
        return createValidationErrorResponse(pathValidation.error!, path)
      }
      validatedPath = pathValidation.data
    }

    // Call the original handler with validated data
    return handler(event, validatedBody, validatedQuery, validatedPath)
  }
}
