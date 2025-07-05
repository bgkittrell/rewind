import { AwsRum, AwsRumConfig } from 'aws-rum-web'

export interface RumConfig {
  applicationId: string
  identityPoolId: string
  region: string
  allowCookies?: boolean
  enableXRay?: boolean
  sessionSampleRate?: number
}

export class RumService {
  private awsRum: AwsRum | null = null
  private isInitialized = false
  private config: RumConfig | null = null

  async initialize(config: RumConfig) {
    if (this.isInitialized) {
      console.warn('RUM service is already initialized')
      return
    }

    this.config = config

    try {
      const rumConfig: AwsRumConfig = {
        sessionSampleRate: config.sessionSampleRate || 1.0,
        identityPoolId: config.identityPoolId,
        endpoint: `https://dataplane.rum.${config.region}.amazonaws.com`,
        telemetries: ['errors', 'performance', 'http'],
        allowCookies: config.allowCookies || false,
        enableXRay: config.enableXRay || true,
      }

      this.awsRum = new AwsRum(config.applicationId, '1.0.0', config.region, rumConfig)
      this.isInitialized = true

      console.log('RUM service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize RUM service:', error)
    }
  }

  recordError(error: Error, additionalDetails?: Record<string, any>) {
    if (!this.awsRum) {
      console.warn('RUM service not initialized, cannot record error')
      return
    }

    try {
      this.awsRum.recordError(error, additionalDetails)
    } catch (rumError) {
      console.error('Failed to record error in RUM:', rumError)
    }
  }

  recordPageView(pageId: string, additionalDetails?: Record<string, any>) {
    if (!this.awsRum) {
      console.warn('RUM service not initialized, cannot record page view')
      return
    }

    try {
      this.awsRum.recordPageView(pageId, additionalDetails)
    } catch (rumError) {
      console.error('Failed to record page view in RUM:', rumError)
    }
  }

  recordCustomEvent(eventType: string, details: Record<string, any>) {
    if (!this.awsRum) {
      console.warn('RUM service not initialized, cannot record custom event')
      return
    }

    try {
      this.awsRum.recordEvent(eventType, details)
    } catch (rumError) {
      console.error('Failed to record custom event in RUM:', rumError)
    }
  }

  recordApiCall(
    operation: string,
    url: string,
    method: string,
    statusCode: number,
    duration: number,
    additionalDetails?: Record<string, any>,
  ) {
    if (!this.awsRum) {
      console.warn('RUM service not initialized, cannot record API call')
      return
    }

    try {
      this.awsRum.recordEvent('api_call', {
        operation,
        url,
        method,
        statusCode,
        duration,
        ...additionalDetails,
      })
    } catch (rumError) {
      console.error('Failed to record API call in RUM:', rumError)
    }
  }

  recordAuthEvent(eventType: 'login' | 'logout' | 'signup' | 'auth_error', details?: Record<string, any>) {
    if (!this.awsRum) {
      console.warn('RUM service not initialized, cannot record auth event')
      return
    }

    try {
      this.awsRum.recordEvent('auth_event', {
        eventType,
        timestamp: new Date().toISOString(),
        ...details,
      })
    } catch (rumError) {
      console.error('Failed to record auth event in RUM:', rumError)
    }
  }

  recordRecommendationEvent(eventType: 'load_attempt' | 'load_success' | 'load_error', details?: Record<string, any>) {
    if (!this.awsRum) {
      console.warn('RUM service not initialized, cannot record recommendation event')
      return
    }

    try {
      this.awsRum.recordEvent('recommendation_event', {
        eventType,
        timestamp: new Date().toISOString(),
        ...details,
      })
    } catch (rumError) {
      console.error('Failed to record recommendation event in RUM:', rumError)
    }
  }

  addUserDetails(userId: string, userAttributes?: Record<string, any>) {
    if (!this.awsRum) {
      console.warn('RUM service not initialized, cannot add user details')
      return
    }

    try {
      this.awsRum.addUserDetails({
        userId,
        ...userAttributes,
      })
    } catch (rumError) {
      console.error('Failed to add user details in RUM:', rumError)
    }
  }

  isServiceInitialized(): boolean {
    return this.isInitialized
  }

  getConfig(): RumConfig | null {
    return this.config
  }
}

export const rumService = new RumService()