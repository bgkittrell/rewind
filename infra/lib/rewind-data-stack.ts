import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class RewindDataStack extends cdk.Stack {
  public readonly tables: { [key: string]: dynamodb.Table } = {};

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Users table
    this.tables.users = new dynamodb.Table(this, 'RewindUsers', {
      tableName: 'RewindUsers',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Podcasts table with GSI
    this.tables.podcasts = new dynamodb.Table(this, 'RewindPodcasts', {
      tableName: 'RewindPodcasts',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.tables.podcasts.addGlobalSecondaryIndex({
      indexName: 'RssUrlIndex',
      partitionKey: { name: 'rssUrl', type: dynamodb.AttributeType.STRING },
    });

    // Episodes table with GSI
    this.tables.episodes = new dynamodb.Table(this, 'RewindEpisodes', {
      tableName: 'RewindEpisodes',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.tables.episodes.addGlobalSecondaryIndex({
      indexName: 'ReleaseDateIndex',
      partitionKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'releaseDate', type: dynamodb.AttributeType.STRING },
    });

    // ListeningHistory table with GSI
    this.tables.listeningHistory = new dynamodb.Table(this, 'RewindListeningHistory', {
      tableName: 'RewindListeningHistory',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.tables.listeningHistory.addGlobalSecondaryIndex({
      indexName: 'LastPlayedIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastPlayed', type: dynamodb.AttributeType.STRING },
    });

    // UserFavorites table with GSI
    this.tables.userFavorites = new dynamodb.Table(this, 'RewindUserFavorites', {
      tableName: 'RewindUserFavorites',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.tables.userFavorites.addGlobalSecondaryIndex({
      indexName: 'ItemTypeIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'itemType', type: dynamodb.AttributeType.STRING },
    });

    // UserFeedback table
    this.tables.userFeedback = new dynamodb.Table(this, 'RewindUserFeedback', {
      tableName: 'RewindUserFeedback',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'episodeId#feedbackId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Shares table with GSI
    this.tables.shares = new dynamodb.Table(this, 'RewindShares', {
      tableName: 'RewindShares',
      partitionKey: { name: 'shareId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.tables.shares.addGlobalSecondaryIndex({
      indexName: 'UserSharesIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });
  }
}