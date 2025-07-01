import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class RewindAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'RewindUserPool', {
      userPoolName: 'RewindUserPool',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // User Pool Client for the web app
    this.userPoolClient = new cognito.UserPoolClient(this, 'RewindUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'RewindWebClient',
      authFlows: {
        userSrp: true,
        userPassword: false,
        adminUserPassword: false,
      },
      generateSecret: false, // Public client for SPA
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:5173/callback', // Development
          'https://rewindpodcast.com/callback', // Production
        ],
        logoutUrls: [
          'http://localhost:5173/', // Development
          'https://rewindpodcast.com/', // Production
        ],
      },
    });

    // User Pool Domain for hosted UI
    new cognito.UserPoolDomain(this, 'RewindUserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `rewind-${this.account}-${this.region}`,
      },
    });

    // Identity Pool for federated identities (optional for future social logins)
    this.identityPool = new cognito.CfnIdentityPool(this, 'RewindIdentityPool', {
      identityPoolName: 'RewindIdentityPool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // Output important values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'RewindUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'RewindUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID',
      exportName: 'RewindIdentityPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolDomain', {
      value: `https://rewind-${this.account}-${this.region}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito User Pool Domain',
      exportName: 'RewindUserPoolDomain',
    });
  }
}