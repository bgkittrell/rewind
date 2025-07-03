import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import { Construct } from 'constructs'

export interface RewindFrontendStackProps extends cdk.StackProps {
  apiUrl: string
}

export class RewindFrontendStack extends cdk.Stack {
  public readonly bucketName: string
  public readonly distributionDomainName: string

  constructor(scope: Construct, id: string, props: RewindFrontendStackProps) {
    super(scope, id, props)

    // S3 bucket for hosting static website
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `rewind-frontend-${this.account}-${this.region}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    })

    // CloudFront distribution with OAC
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    })

    this.bucketName = websiteBucket.bucketName
    this.distributionDomainName = distribution.distributionDomainName

    // Output values
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucketName,
      description: 'Frontend S3 bucket name',
    })

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distributionDomainName,
      description: 'CloudFront distribution domain name',
    })

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${this.distributionDomainName}`,
      description: 'Website URL',
    })

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    })
  }
}
