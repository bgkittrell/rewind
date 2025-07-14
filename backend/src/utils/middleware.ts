import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { logger } from '../services/loggerService'
import { createErrorResponse } from './response'

export type HandlerFunction = (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>

export function withLogging(handler: HandlerFunction): HandlerFunction {
  return async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const startTime = Date.now()

    // Log incoming request
    logger.logRequest(event)

    try {
      // Execute the handler
      const response = await handler(event, context)

      // Log successful response
      const duration = Date.now() - startTime
      logger.logResponse(response.statusCode, duration, response.body)

      // Add correlation ID to response headers
      if (response.headers) {
        response.headers['X-Correlation-Id'] = logger['correlationId']
      }

      return response
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime
      logger.error('Handler error', error, { duration })

      // Return error response
      const errorMessage = error instanceof Error ? error.message : 'Internal server error'
      const response = createErrorResponse(errorMessage, 'INTERNAL_ERROR', 500, event.path)

      // Add correlation ID to error response
      if (response.headers) {
        response.headers['X-Correlation-Id'] = logger['correlationId']
      }

      return response
    }
  }
}

// Middleware to combine multiple middlewares
export function compose(
  ...middlewares: ((handler: HandlerFunction) => HandlerFunction)[]
): (handler: HandlerFunction) => HandlerFunction {
  return (handler: HandlerFunction) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}
