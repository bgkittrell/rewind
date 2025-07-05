// RUM Configuration
// These values will be populated after deploying the infrastructure
export const rumConfig = {
  // These values will be set by the CDK deployment
  applicationId: import.meta.env.VITE_RUM_APPLICATION_ID || '',
  identityPoolId: import.meta.env.VITE_RUM_IDENTITY_POOL_ID || '',
  region: import.meta.env.VITE_RUM_REGION || 'us-east-1',
  
  // RUM settings
  allowCookies: false,
  enableXRay: true,
  sessionSampleRate: 1.0, // 100% sampling rate for troubleshooting
}

// Check if RUM is properly configured
export const isRumConfigured = () => {
  return rumConfig.applicationId && rumConfig.identityPoolId && rumConfig.region
}

// Development/fallback configuration
export const devRumConfig = {
  applicationId: 'dev-application-id',
  identityPoolId: 'dev-identity-pool-id',
  region: 'us-east-1',
  allowCookies: false,
  enableXRay: false,
  sessionSampleRate: 0.1, // 10% sampling rate for development
}