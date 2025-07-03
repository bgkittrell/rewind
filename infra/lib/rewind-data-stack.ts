import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

export interface RewindDataStackProps extends cdk.StackProps {}

export class RewindDataStack extends cdk.Stack {
  public readonly tables: { [key: string]: dynamodb.Table } = {}

  constructor(scope: Construct, id: string, props?: RewindDataStackProps) {
    super(scope, id, props)

    // Users table
    this.tables.users = new dynamodb.Table(this, 'RewindUsers', {
      tableName: 'RewindUsers',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // Podcasts table with GSI for RSS URL lookups
    this.tables.podcasts = new dynamodb.Table(this, 'RewindPodcasts', {
      tableName: 'RewindPodcasts',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'podcastId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
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
      pointInTimeRecovery: true,
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
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    })

    // Share links table
    this.tables.shares = new dynamodb.Table(this, 'RewindShares', {
      tableName: 'RewindShares',
      partitionKey: { name: 'shareId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
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
  }
}
