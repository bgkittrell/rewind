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

    // Episodes table with DynamoDB streams for guest extraction
    this.tables.episodes = new dynamodb.Table(this, 'RewindEpisodes', {
      tableName: 'RewindEpisodes',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // Enable streams for guest extraction
    })

    // Add GSI for release date queries
    this.tables.episodes.addGlobalSecondaryIndex({
      indexName: 'ReleaseDateIndex',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'releaseDate', type: dynamodb.AttributeType.STRING },
    })

    // Add GSI for natural key deduplication (title + releaseDate hash)
    this.tables.episodes.addGlobalSecondaryIndex({
      indexName: 'NaturalKeyIndex',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'naturalKey', type: dynamodb.AttributeType.STRING },
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

    // Add GSI for recent listening activity
    this.tables.listeningHistory.addGlobalSecondaryIndex({
      indexName: 'LastPlayedIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastPlayed', type: dynamodb.AttributeType.STRING },
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

    // Add GSI for user's share history
    this.tables.shares.addGlobalSecondaryIndex({
      indexName: 'UserSharesIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    })

    // UserFavorites table for recommendation engine
    this.tables.userFavorites = new dynamodb.Table(this, 'RewindUserFavorites', {
      tableName: 'RewindUserFavorites',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // Add GSI for filtering by item type
    this.tables.userFavorites.addGlobalSecondaryIndex({
      indexName: 'ItemTypeIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemType', type: dynamodb.AttributeType.STRING },
    })

    // GuestAnalytics table for recommendation engine
    this.tables.guestAnalytics = new dynamodb.Table(this, 'RewindGuestAnalytics', {
      tableName: 'RewindGuestAnalytics',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'guestName', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // UserFeedback table for recommendation engine
    this.tables.userFeedback = new dynamodb.Table(this, 'RewindUserFeedback', {
      tableName: 'RewindUserFeedback',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId#feedbackId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
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

    new cdk.CfnOutput(this, 'ListeningHistoryTableName', {
      value: this.tables.listeningHistory.tableName,
      description: 'Listening history table name',
    })

    new cdk.CfnOutput(this, 'UserFavoritesTableName', {
      value: this.tables.userFavorites.tableName,
      description: 'User favorites table name',
    })

    new cdk.CfnOutput(this, 'GuestAnalyticsTableName', {
      value: this.tables.guestAnalytics.tableName,
      description: 'Guest analytics table name',
    })

    new cdk.CfnOutput(this, 'UserFeedbackTableName', {
      value: this.tables.userFeedback.tableName,
      description: 'User feedback table name',
    })

    new cdk.CfnOutput(this, 'SharesTableName', {
      value: this.tables.shares.tableName,
      description: 'Shares table name',
    })

    new cdk.CfnOutput(this, 'EpisodesTableStreamArn', {
      value: this.tables.episodes.tableStreamArn!,
      description: 'Episodes table stream ARN for guest extraction',
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
