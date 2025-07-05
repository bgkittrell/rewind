import * as cdk from 'aws-cdk-lib'
import * as rum from 'aws-cdk-lib/aws-rum'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface RewindMonitoringStackProps extends cdk.StackProps {
  domainName: string
  userPool: cognito.UserPool
}

export class RewindMonitoringStack extends cdk.Stack {
  public readonly rumApplicationId: string
  public readonly rumIdentityPoolId: string
  public readonly rumRegion: string

  constructor(scope: Construct, id: string, props: RewindMonitoringStackProps) {
    super(scope, id, props)

    // Create Identity Pool for RUM authentication
    const identityPool = new cognito.CfnIdentityPool(this, 'RumIdentityPool', {
      allowUnauthenticatedIdentities: true,
      identityPoolName: `rewind-rum-${cdk.Stack.of(this).region}`,
    })

    // Create IAM role for unauthenticated users
    const unauthenticatedRole = new iam.Role(this, 'RumUnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    })

    // Create IAM role for authenticated users
    const authenticatedRole = new iam.Role(this, 'RumAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    })

    // Attach the identity pool to the user pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'RumIdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthenticatedRole.roleArn,
        authenticated: authenticatedRole.roleArn,
      },
    })

    // Create RUM App Monitor
    const rumAppMonitor = new rum.CfnAppMonitor(this, 'RewindRumAppMonitor', {
      name: `rewind-rum-${cdk.Stack.of(this).region}`,
      domain: props.domainName,
      appMonitorConfiguration: {
        allowCookies: false,
        enableXRay: true,
        sessionSampleRate: 1.0, // 100% sampling rate for troubleshooting
        telemetries: ['errors', 'performance', 'http'],
        identityPoolId: identityPool.ref,
        guestRoleArn: unauthenticatedRole.roleArn,
        includedPages: [`https://${props.domainName}/*`],
        excludedPages: [],
        favoritePages: ['/login', '/signup', '/', '/library'],
      },
    })

    // Add RUM permissions to both roles
    const rumArn = cdk.Stack.of(this).formatArn({
      service: 'rum',
      resource: 'appmonitor',
      resourceName: rumAppMonitor.attrId,
    })

    const rumPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'rum:PutRumEvents',
        'rum:PutRumMetrics',
        'rum:BatchCreateRumMetricDefinitions',
        'rum:GetAppMonitorData',
      ],
      resources: [rumArn],
    })

    unauthenticatedRole.addToPolicy(rumPolicyStatement)
    authenticatedRole.addToPolicy(rumPolicyStatement)

    // Add CloudWatch Logs permissions for RUM
    const cloudWatchPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [`arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/rum/*`],
    })

    unauthenticatedRole.addToPolicy(cloudWatchPolicyStatement)
    authenticatedRole.addToPolicy(cloudWatchPolicyStatement)

    // Add X-Ray permissions for enhanced tracing
    const xrayPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
      resources: ['*'],
    })

    unauthenticatedRole.addToPolicy(xrayPolicyStatement)
    authenticatedRole.addToPolicy(xrayPolicyStatement)

    // Store values for frontend configuration
    this.rumApplicationId = rumAppMonitor.attrId
    this.rumIdentityPoolId = identityPool.ref
    this.rumRegion = cdk.Stack.of(this).region

    // Output RUM configuration
    new cdk.CfnOutput(this, 'RumApplicationId', {
      value: this.rumApplicationId,
      description: 'RUM Application ID',
    })

    new cdk.CfnOutput(this, 'RumIdentityPoolId', {
      value: this.rumIdentityPoolId,
      description: 'RUM Identity Pool ID',
    })

    new cdk.CfnOutput(this, 'RumRegion', {
      value: this.rumRegion,
      description: 'RUM Region',
    })

    new cdk.CfnOutput(this, 'RumApplicationArn', {
      value: rumArn,
      description: 'RUM Application ARN',
    })
  }
}
