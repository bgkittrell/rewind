# Deployment Setup Guide

This guide walks through setting up the CI/CD pipeline for automatic deployment of the Rewind app when code is pushed to the main branch.

## Prerequisites

- AWS Account with appropriate permissions
- GitHub repository with admin access
- AWS CLI installed and configured locally
- Node.js 18+ installed

## AWS Setup

### 1. Create IAM Role for GitHub Actions

Create an IAM role that GitHub Actions can assume using OpenID Connect (OIDC):

```bash
# Create trust policy for GitHub OIDC
cat > github-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT-ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR-GITHUB-USERNAME/rewind-cursor:*"
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name GitHubActionsRewindRole \
  --assume-role-policy-document file://github-trust-policy.json

# Create and attach policy for deployment permissions
cat > deployment-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "cognito-idp:*",
        "cognito-identity:*",
        "cloudfront:*",
        "iam:*",
        "logs:*",
        "events:*",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name GitHubActionsRewindPolicy \
  --policy-document file://deployment-policy.json

aws iam attach-role-policy \
  --role-name GitHubActionsRewindRole \
  --policy-arn arn:aws:iam::ACCOUNT-ID:policy/GitHubActionsRewindPolicy
```

### 2. Configure OIDC Provider (if not already exists)

```bash
# Check if OIDC provider exists
aws iam list-open-id-connect-providers

# If not exists, create it
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 3. Bootstrap CDK (if not already done)

```bash
# Bootstrap CDK for your account and region
npx cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

## GitHub Setup

### 1. Configure Repository Secrets

Go to your GitHub repository settings and add these secrets:

- `AWS_ROLE_ARN`: `arn:aws:iam::ACCOUNT-ID:role/GitHubActionsRewindRole`

### 2. Enable GitHub Actions

Ensure GitHub Actions are enabled in your repository settings.

### 3. Configure Branch Protection

Set up branch protection rules for the main branch:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to main branch

## Initial Deployment

### 1. Manual First Deployment

Before enabling automated deployments, perform an initial manual deployment:

```bash
# Clone and setup the repository
git clone https://github.com/YOUR-USERNAME/rewind-cursor.git
cd rewind-cursor

# Install dependencies
npm ci

# Build all components
npm run build

# Deploy infrastructure manually
cd infra
npm run deploy

# Note the outputs for environment configuration
```

### 2. Verify Stack Outputs

Ensure all CDK stacks output the required values:

```bash
# Check stack outputs
aws cloudformation describe-stacks --stack-name RewindDataStack --query 'Stacks[0].Outputs'
aws cloudformation describe-stacks --stack-name RewindBackendStack --query 'Stacks[0].Outputs'
aws cloudformation describe-stacks --stack-name RewindFrontendStack --query 'Stacks[0].Outputs'
```

## Environment Configuration

### 1. Production Environment Variables

The deployment pipeline automatically configures these environment variables for the frontend:

- `VITE_API_BASE_URL`: From backend stack output
- `VITE_AWS_REGION`: Set to us-east-1
- `VITE_COGNITO_USER_POOL_ID`: From data stack output
- `VITE_COGNITO_USER_POOL_CLIENT_ID`: From data stack output
- `VITE_COGNITO_IDENTITY_POOL_ID`: From data stack output

### 2. Backend Configuration

Backend environment variables are set by the CDK deployment:

- DynamoDB table names
- Cognito configuration
- AWS region settings

## Testing the Deployment

### 1. Test with a Pull Request

1. Create a feature branch
2. Make a small change
3. Create a pull request to main
4. Verify that validation tests pass

### 2. Test Full Deployment

1. Merge the pull request to main
2. Monitor the GitHub Actions workflow
3. Verify deployment completion
4. Test the deployed application

## Monitoring Deployment

### 1. GitHub Actions Logs

Monitor deployment progress in the Actions tab of your GitHub repository.

### 2. AWS CloudWatch

Monitor AWS resources during and after deployment:

```bash
# View CloudFormation events
aws cloudformation describe-stack-events --stack-name RewindBackendStack

# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/RewindBackendStack"

# View API Gateway metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Troubleshooting

### Common Issues

1. **IAM Permission Errors**
   - Verify the GitHub Actions role has all required permissions
   - Check the trust policy allows your repository

2. **CDK Bootstrap Issues**
   - Ensure CDK is bootstrapped in the correct account/region
   - Verify CDK version compatibility

3. **Frontend Build Failures**
   - Check environment variable configuration
   - Verify all dependencies are properly installed

4. **Health Check Failures**
   - Ensure API endpoints are properly configured
   - Check Lambda function logs for errors

### Debugging Commands

```bash
# Check CDK stack status
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# View detailed stack information
aws cloudformation describe-stacks --stack-name STACK-NAME

# Check Lambda function status
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `RewindBackendStack`)]'

# View S3 bucket contents
aws s3 ls s3://BUCKET-NAME/ --recursive
```

## Security Considerations

### 1. Least Privilege Access

- The GitHub Actions role should have minimal required permissions
- Regularly audit and update IAM policies
- Use AWS IAM Access Analyzer to identify unused permissions

### 2. Secrets Management

- Never commit AWS credentials to the repository
- Use GitHub secrets for sensitive configuration
- Rotate access keys regularly

### 3. Infrastructure Security

- Enable CloudTrail for audit logging
- Configure AWS Config for compliance monitoring
- Use AWS Security Hub for security insights

## Maintenance

### 1. Regular Updates

- Update GitHub Actions versions quarterly
- Update AWS CDK and dependencies monthly
- Review and update IAM policies semi-annually

### 2. Cost Optimization

- Monitor AWS costs monthly
- Review CloudWatch logs retention settings
- Optimize Lambda function memory and timeout settings

### 3. Performance Monitoring

- Set up CloudWatch alarms for key metrics
- Monitor application performance weekly
- Review and optimize CDK configurations quarterly

## Support

For issues with deployment:

1. Check GitHub Actions logs first
2. Review AWS CloudFormation events
3. Consult CloudWatch logs for runtime errors
4. Review this documentation for common solutions

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS IAM OIDC Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)