import * as cdk from 'aws-cdk-lib';
import * as personalize from 'aws-cdk-lib/aws-personalize';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class RewindPersonalizeStack extends cdk.Stack {
  public readonly datasetGroupArn: string;
  public readonly personalizeDataBucket: s3.Bucket;
  public readonly personalizeRole: iam.Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for Personalize training data
    this.personalizeDataBucket = new s3.Bucket(this, 'PersonalizeDataBucket', {
      bucketName: `rewind-personalize-data-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
    });

    // IAM role for Personalize service
    this.personalizeRole = new iam.Role(this, 'PersonalizeServiceRole', {
      assumedBy: new iam.ServicePrincipal('personalize.amazonaws.com'),
      description: 'Service role for AWS Personalize to access S3 data',
    });

    // Grant Personalize access to the S3 bucket
    this.personalizeDataBucket.grantRead(this.personalizeRole);

    // Additional permissions for Personalize
    this.personalizeRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:ListBucket',
      ],
      resources: [
        this.personalizeDataBucket.bucketArn,
        `${this.personalizeDataBucket.bucketArn}/*`,
      ],
    }));

    // Dataset Group - Main container for all Personalize resources
    const datasetGroup = new personalize.CfnDatasetGroup(this, 'RewindDatasetGroup', {
      name: `rewind-dataset-group-${this.region}`,
      roleArn: this.personalizeRole.roleArn,
      // Remove domain specification to avoid KMS requirements for now
    });

    this.datasetGroupArn = datasetGroup.attrDatasetGroupArn;

    // Schema for user interactions (REQUIRED)
    const interactionsSchema = new personalize.CfnSchema(this, 'InteractionsSchema', {
      name: `rewind-interactions-schema-${this.region}`,
      schema: JSON.stringify({
        type: 'record',
        name: 'Interactions',
        namespace: 'com.amazonaws.personalize.schema',
        fields: [
          {
            name: 'USER_ID',
            type: 'string',
          },
          {
            name: 'ITEM_ID',
            type: 'string',
          },
          {
            name: 'TIMESTAMP',
            type: 'long',
          },
          {
            name: 'EVENT_TYPE',
            type: 'string',
          },
          {
            name: 'EVENT_VALUE',
            type: ['null', 'float'],
            default: null,
          },
        ],
        version: '1.0',
      }),
    });

    // Schema for items (episodes)
    const itemsSchema = new personalize.CfnSchema(this, 'ItemsSchema', {
      name: `rewind-items-schema-${this.region}`,
      schema: JSON.stringify({
        type: 'record',
        name: 'Items',
        namespace: 'com.amazonaws.personalize.schema',
        fields: [
          {
            name: 'ITEM_ID',
            type: 'string',
          },
          {
            name: 'PODCAST_ID',
            type: 'string',
            categorical: true,
          },
          {
            name: 'GENRE',
            type: 'string',
            categorical: true,
          },
          {
            name: 'DURATION_MINUTES',
            type: 'int',
          },
          {
            name: 'CREATION_TIMESTAMP',
            type: 'long',
          },
          {
            name: 'CATEGORY',
            type: 'string',
            categorical: true,
          },
        ],
        version: '1.0',
      }),
    });

    // Schema for users (optional but helpful)
    const usersSchema = new personalize.CfnSchema(this, 'UsersSchema', {
      name: `rewind-users-schema-${this.region}`,
      schema: JSON.stringify({
        type: 'record',
        name: 'Users',
        namespace: 'com.amazonaws.personalize.schema',
        fields: [
          {
            name: 'USER_ID',
            type: 'string',
          },
          {
            name: 'AGE_GROUP',
            type: 'string',
            categorical: true,
          },
          {
            name: 'PREFERRED_GENRE',
            type: 'string',
            categorical: true,
          },
          {
            name: 'LISTENING_TIME_PREFERENCE',
            type: 'string',
            categorical: true,
          },
        ],
        version: '1.0',
      }),
    });

    // Interactions Dataset (REQUIRED)
    const interactionsDataset = new personalize.CfnDataset(this, 'InteractionsDataset', {
      name: `rewind-interactions-${this.region}`,
      datasetType: 'Interactions',
      datasetGroupArn: datasetGroup.attrDatasetGroupArn,
      schemaArn: interactionsSchema.attrSchemaArn,
    });

    // Items Dataset 
    const itemsDataset = new personalize.CfnDataset(this, 'ItemsDataset', {
      name: `rewind-items-${this.region}`,
      datasetType: 'Items',
      datasetGroupArn: datasetGroup.attrDatasetGroupArn,
      schemaArn: itemsSchema.attrSchemaArn,
    });

    // Users Dataset
    const usersDataset = new personalize.CfnDataset(this, 'UsersDataset', {
      name: `rewind-users-${this.region}`,
      datasetType: 'Users',
      datasetGroupArn: datasetGroup.attrDatasetGroupArn,
      schemaArn: usersSchema.attrSchemaArn,
    });

    // Add dependencies
    interactionsDataset.addDependency(datasetGroup);
    itemsDataset.addDependency(datasetGroup);
    usersDataset.addDependency(datasetGroup);

    // Outputs for use in other stacks
    new cdk.CfnOutput(this, 'DatasetGroupArn', {
      value: datasetGroup.attrDatasetGroupArn,
      description: 'Personalize Dataset Group ARN',
      exportName: 'RewindDatasetGroupArn',
    });

    new cdk.CfnOutput(this, 'PersonalizeDataBucketName', {
      value: this.personalizeDataBucket.bucketName,
      description: 'S3 bucket for Personalize training data',
      exportName: 'RewindPersonalizeDataBucket',
    });

    new cdk.CfnOutput(this, 'PersonalizeRoleArn', {
      value: this.personalizeRole.roleArn,
      description: 'IAM role for Personalize service',
      exportName: 'RewindPersonalizeRoleArn',
    });

    new cdk.CfnOutput(this, 'InteractionsDatasetArn', {
      value: interactionsDataset.attrDatasetArn,
      description: 'Personalize Interactions Dataset ARN',
      exportName: 'RewindInteractionsDatasetArn',
    });

    new cdk.CfnOutput(this, 'ItemsDatasetArn', {
      value: itemsDataset.attrDatasetArn,
      description: 'Personalize Items Dataset ARN',
      exportName: 'RewindItemsDatasetArn',
    });

    new cdk.CfnOutput(this, 'UsersDatasetArn', {
      value: usersDataset.attrDatasetArn,
      description: 'Personalize Users Dataset ARN',
      exportName: 'RewindUsersDatasetArn',
    });

    // Tag all resources
    cdk.Tags.of(this).add('Project', 'Rewind');
    cdk.Tags.of(this).add('Component', 'Personalize');
    cdk.Tags.of(this).add('Environment', process.env.NODE_ENV || 'development');
  }
}