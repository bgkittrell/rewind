import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface RewindDataStackProps extends cdk.StackProps {}

export class RewindDataStack extends cdk.Stack {
  public readonly tables: { [key: string]: dynamodb.Table } = {}
  public readonly userPool: cognito.UserPool
  public readonly userPoolClient: cognito.UserPoolClient
  public readonly identityPool: cognito.CfnIdentityPool

  constructor(scope: Construct, id: string, props?: RewindDataStackProps) {
    super(scope, id, props)

    // Cognito User Pool for authentication
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
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // Ensure MFA is not required which can cause authorization issues
      mfa: cognito.Mfa.OFF,
    })

    // User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'RewindUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: 'RewindWebClient',
      generateSecret: false, // For web clients
      authFlows: {
        userSrp: true,
        userPassword: true, // Enable this for admin auth
        adminUserPassword: true, // Enable this for admin auth
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: ['http://localhost:5173', 'https://app.rewind.com'], // Development and production URLs
        logoutUrls: ['http://localhost:5173', 'https://app.rewind.com'],
      },
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
    })

    // Identity Pool for AWS resource access
    this.identityPool = new cognito.CfnIdentityPool(this, 'RewindIdentityPool', {
      identityPoolName: 'RewindIdentityPool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    })

    // Create IAM roles for Identity Pool
    const authenticatedRole = new iam.Role(this, 'RewindAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    })

    // Add basic permissions to authenticated role
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-identity:*'],
        resources: ['*'],
      }),
    )

    const unauthenticatedRole = new iam.Role(this, 'RewindUnauthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    })

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'RewindIdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
    })

    // Users table
    this.tables.users = new dynamodb.Table(this, 'RewindUsers', {
      tableName: 'RewindUsers',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // Podcasts table with GSI for RSS URL lookups
    this.tables.podcasts = new dynamodb.Table(this, 'RewindPodcasts', {
      tableName: 'RewindPodcasts',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // Add GSI for RSS URL lookups
    this.tables.podcasts.addGlobalSecondaryIndex({
      indexName: 'RssUrlIndex',
      partitionKey: { name: 'rssUrl', type: dynamodb.AttributeType.STRING },
    })

    // Episodes table
    this.tables.episodes = new dynamodb.Table(this, 'RewindEpisodes', {
      tableName: 'RewindEpisodes',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // Add GSI for release date queries
    this.tables.episodes.addGlobalSecondaryIndex({
      indexName: 'ReleaseDateIndex',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'releaseDate', type: dynamodb.AttributeType.STRING },
    })

    // Listening history table
    this.tables.listeningHistory = new dynamodb.Table(this, 'RewindListeningHistory', {
      tableName: 'RewindListeningHistory',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // Share links table
    this.tables.shares = new dynamodb.Table(this, 'RewindShares', {
      tableName: 'RewindShares',
      partitionKey: { name: 'shareId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt',
    })

    // Output table names for reference
    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.tables.users.tableName,
      description: 'Users table name',
    })

    new cdk.CfnOutput(this, 'PodcastsTableName', {
      value: this.tables.podcasts.tableName,
      description: 'Podcasts table name',
    })

    new cdk.CfnOutput(this, 'EpisodesTableName', {
      value: this.tables.episodes.tableName,
      description: 'Episodes table name',
    })

    // Cognito outputs for frontend configuration
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    })

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID',
    })
  }
}
