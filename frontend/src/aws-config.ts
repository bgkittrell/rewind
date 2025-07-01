import { Amplify } from 'aws-amplify';

// AWS Amplify configuration for Cognito authentication
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
      identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
      loginWith: {
        oauth: {
          domain: `rewind-${import.meta.env.VITE_AWS_ACCOUNT_ID}-${import.meta.env.VITE_COGNITO_REGION}.auth.${import.meta.env.VITE_COGNITO_REGION}.amazoncognito.com`,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [
            'http://localhost:5173/callback',
            'https://rewindpodcast.com/callback'
          ],
          redirectSignOut: [
            'http://localhost:5173/',
            'https://rewindpodcast.com/'
          ],
          responseType: 'code'
        },
        email: true,
        username: false
      }
    }
  },
  API: {
    REST: {
      RewindAPI: {
        endpoint: import.meta.env.VITE_API_URL || 'http://localhost:3000/v1',
        region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1'
      }
    }
  }
};

// Configure Amplify
Amplify.configure(amplifyConfig);

export default amplifyConfig;