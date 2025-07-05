# AWS Browser Logging Solutions for Rewind App

## Overview

You're experiencing an "Unauthorized access" error in your Rewind PWA, and AWS provides several services to capture browser logs for troubleshooting. This document outlines the available options and provides implementation recommendations.

## AWS Services for Browser Logging

### 1. AWS CloudWatch Logs (Recommended)

**Best for:** Detailed error logging, API call tracking, and general application debugging

**Key Features:**
- Direct log streaming from browsers via AWS SDK
- Custom log groups and streams
- Real-time log monitoring
- Integration with existing AWS infrastructure
- Cost-effective for targeted logging

**Implementation:**
```javascript
// Install AWS SDK
npm install aws-sdk

// Browser logging setup
import AWS from 'aws-sdk';

AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY'
});

const cloudWatchLogs = new AWS.CloudWatchLogs();

// Create a logger function
function logToCloudWatch(level, message, metadata = {}) {
  const logEvent = {
    timestamp: Date.now(),
    message: JSON.stringify({
      level,
      message,
      metadata,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: sessionStorage.getItem('userId') || 'anonymous'
    })
  };

  const params = {
    logGroupName: '/rewind/browser-logs',
    logStreamName: `browser-${new Date().toISOString().split('T')[0]}`,
    logEvents: [logEvent]
  };

  cloudWatchLogs.putLogEvents(params, (err, data) => {
    if (err) console.error('CloudWatch logging failed:', err);
  });
}

// Usage for your authorization error
function handleApiError(error, endpoint) {
  logToCloudWatch('ERROR', 'API Request Failed', {
    endpoint,
    status: error.status,
    statusText: error.statusText,
    response: error.response,
    headers: error.headers
  });
}
```

### 2. AWS CloudWatch RUM (Real User Monitoring)

**Best for:** Comprehensive user experience monitoring, performance tracking, and error analysis

**Key Features:**
- Automatic JavaScript error capturing
- HTTP request/response monitoring
- Performance metrics (page load times, Core Web Vitals)
- User session tracking
- Built-in dashboard and analytics

**Implementation:**
```html
<!-- Add to your PWA's <head> section -->
<script>
(function(n,i,v,r,s,c,u,x,z){
  // RUM snippet code here
})(
  'cwr',
  'your-app-monitor-id',
  '1.0.0',
  'us-east-1',
  'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',
  {
    sessionSampleRate: 1.0,
    guestRoleArn: 'arn:aws:iam::ACCOUNT:role/RUM-Monitor-us-east-1-XXXXX-Unauth',
    identityPoolId: 'us-east-1:XXXXX-XXXX-XXXX-XXXX-XXXXX',
    endpoint: 'https://dataplane.rum.us-east-1.amazonaws.com',
    telemetries: ['performance', 'errors', 'http'],
    allowCookies: true,
    enableXRay: false
  }
);
</script>
```

### 3. AWS X-Ray (Limited Browser Support)

**Best for:** Distributed tracing across your full stack

**Key Features:**
- End-to-end request tracing
- Service map visualization
- Performance bottleneck identification
- Integration with backend services

**Note:** X-Ray has limited browser support and requires careful implementation.

### 4. Custom CloudWatch Logs via API Gateway

**Best for:** Secure logging without exposing AWS credentials in the browser

**Implementation:**
```javascript
// Create an API endpoint in your backend for logging
// Frontend code:
async function logToBrowser(level, message, metadata = {}) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        level,
        message,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: sessionStorage.getItem('sessionId')
        }
      })
    });
  } catch (error) {
    console.error('Failed to log to server:', error);
  }
}
```

## Recommended Solution for Rewind App

Given your "Unauthorized access" error, I recommend a **hybrid approach**:

### Phase 1: Immediate Debugging (CloudWatch Logs)

1. **Create a logging Lambda function** that receives logs from your frontend
2. **Implement client-side error tracking** for API calls
3. **Log authentication flows** to identify where the authorization fails

### Phase 2: Long-term Monitoring (CloudWatch RUM)

1. **Set up CloudWatch RUM** for comprehensive user monitoring
2. **Track API performance** and error rates
3. **Monitor user sessions** to understand the full context

## Implementation Plan for Your Authorization Issue

### Step 1: Create CloudWatch Log Group

```bash
aws logs create-log-group --log-group-name /rewind/browser-errors
aws logs create-log-group --log-group-name /rewind/api-calls
```

### Step 2: Add Error Logging to Your Frontend

```typescript
// utils/logger.ts
interface LogMetadata {
  endpoint?: string;
  status?: number;
  headers?: Record<string, string>;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export class RewindLogger {
  private static async sendLog(level: string, message: string, metadata: LogMetadata = {}) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
          }
        })
      });
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }

  static error(message: string, metadata?: LogMetadata) {
    this.sendLog('ERROR', message, metadata);
  }

  static logApiCall(endpoint: string, method: string, status: number, responseTime: number) {
    this.sendLog('API_CALL', `${method} ${endpoint}`, {
      endpoint,
      method,
      status,
      responseTime,
      success: status >= 200 && status < 300
    });
  }

  static logAuthError(endpoint: string, error: any) {
    this.sendLog('AUTH_ERROR', 'Authentication failed', {
      endpoint,
      error: error.message,
      status: error.status,
      headers: error.headers
    });
  }
}
```

### Step 3: Integrate Logging in Your API Calls

```typescript
// Update your API service to include logging
export class ApiService {
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...options.headers
        }
      });

      const responseTime = Date.now() - startTime;
      
      RewindLogger.logApiCall(endpoint, options.method || 'GET', response.status, responseTime);

      if (response.status === 401 || response.status === 403) {
        const errorData = await response.text();
        RewindLogger.logAuthError(endpoint, {
          status: response.status,
          statusText: response.statusText,
          response: errorData,
          headers: Object.fromEntries(response.headers.entries())
        });
      }

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      RewindLogger.error('Network error', {
        endpoint,
        error: error.message,
        responseTime
      });
      throw error;
    }
  }
}
```

### Step 4: Create Backend Logging Endpoint

```typescript
// backend/src/routes/logs.ts
import { Router } from 'express';
import { CloudWatchLogs } from 'aws-sdk';

const router = Router();
const cloudWatchLogs = new CloudWatchLogs({ region: 'us-east-1' });

router.post('/logs', async (req, res) => {
  try {
    const { level, message, metadata } = req.body;
    
    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level,
        message,
        metadata
      })
    };

    const params = {
      logGroupName: level === 'AUTH_ERROR' ? '/rewind/auth-errors' : '/rewind/browser-logs',
      logStreamName: `rewind-${new Date().toISOString().split('T')[0]}`,
      logEvents: [logEvent]
    };

    await cloudWatchLogs.putLogEvents(params).promise();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('CloudWatch logging failed:', error);
    res.status(500).json({ error: 'Logging failed' });
  }
});

export default router;
```

## CloudWatch RUM Setup for Rewind

### 1. Create App Monitor

```bash
aws rum create-app-monitor \
  --name "rewind-pwa" \
  --domain "your-domain.com" \
  --app-monitor-configuration '{
    "IdentityPoolId": "us-east-1:your-identity-pool-id",
    "ExcludedPages": [],
    "IncludedPages": [],
    "FavoritePages": [],
    "SessionSampleRate": 0.1,
    "GuestRoleArn": "arn:aws:iam::account:role/RUM-Monitor-role",
    "AllowCookies": true,
    "Telemetries": ["errors", "performance", "http"],
    "EnableXRay": false
  }'
```

### 2. Add RUM to Your PWA

```html
<!-- In your main HTML template -->
<script>
(function(n,i,v,r,s,c,u,x,z){
  // RUM initialization
})(
  'cwr',
  'your-app-monitor-id',
  '1.0.0',
  'us-east-1',
  'https://client.rum.us-east-1.amazonaws.com/1.0.2/cwr.js',
  {
    sessionSampleRate: 0.1,
    guestRoleArn: 'your-guest-role-arn',
    identityPoolId: 'your-identity-pool-id',
    endpoint: 'https://dataplane.rum.us-east-1.amazonaws.com',
    telemetries: ['performance', 'errors', 'http'],
    allowCookies: true
  }
);
</script>
```

## Cost Considerations

- **CloudWatch Logs**: ~$0.50 per GB ingested, $0.03 per GB stored
- **CloudWatch RUM**: ~$1.00 per 100,000 events
- **X-Ray**: ~$5.00 per 1 million traces

## Security Best Practices

1. **Use IAM roles** instead of hardcoded credentials
2. **Implement log filtering** to avoid sensitive data leakage
3. **Set up log retention policies** to control costs
4. **Use CORS properly** for API endpoints
5. **Implement rate limiting** on logging endpoints

## Monitoring Your Authorization Issue

With this setup, you'll be able to:

1. **Track failed API calls** with detailed error information
2. **Monitor authentication token lifecycle**
3. **Identify patterns** in authorization failures
4. **Correlate errors** with user actions and session data
5. **Set up CloudWatch alarms** for critical error thresholds

## Next Steps

1. Implement the CloudWatch Logs solution first for immediate debugging
2. Add CloudWatch RUM for comprehensive monitoring
3. Set up CloudWatch dashboards to visualize error patterns
4. Create alerts for authorization error spikes
5. Use the collected data to identify and fix the root cause

This approach will give you comprehensive visibility into your PWA's behavior and help you quickly identify why users are experiencing "Unauthorized access" errors.