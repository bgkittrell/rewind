# LocalStack GitHub Actions Testing

This repository demonstrates how to set up and use LocalStack in GitHub Actions for testing AWS services locally in CI/CD pipelines.

## 🚀 Features

- **Comprehensive AWS Service Testing**: Tests S3, DynamoDB, Lambda, and SQS
- **Two Deployment Methods**: Docker service and direct installation
- **AWS CLI Integration**: Demonstrates both boto3 and AWS CLI usage
- **Health Checks**: Proper service startup validation
- **Error Handling**: Robust error handling and cleanup

## 📋 What's Included

### GitHub Actions Workflows

The workflow (`.github/workflows/localstack-test.yml`) includes:

1. **Primary Job (`localstack-tests`)**:
   - Uses LocalStack as a Docker service
   - Runs comprehensive tests for multiple AWS services
   - Tests both Python (boto3) and AWS CLI integration

2. **Alternative Job (`localstack-alternative`)**:
   - Installs LocalStack directly in the runner
   - Demonstrates alternative setup method
   - Useful for more complex LocalStack configurations

### Test Coverage

- **S3**: Bucket operations, file upload/download
- **DynamoDB**: Table creation, item management
- **Lambda**: Function creation, invocation, deletion
- **SQS**: Queue management, message handling
- **Health Checks**: Service availability validation

## � Local Setup

### Prerequisites

- Python 3.11+
- Docker (for LocalStack)
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv localstack-env
   source localstack-env/bin/activate  # On Windows: localstack-env\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Start LocalStack**:
   ```bash
   localstack start
   ```

5. **Run tests locally**:
   ```bash
   # Set AWS credentials for LocalStack
   export AWS_ACCESS_KEY_ID=test
   export AWS_SECRET_ACCESS_KEY=test
   export AWS_DEFAULT_REGION=us-east-1
   
   # Test with AWS CLI
   aws --endpoint-url=http://localhost:4566 s3 mb s3://test-bucket
   aws --endpoint-url=http://localhost:4566 s3 ls
   ```

## 🔄 GitHub Actions Usage

### Triggering Workflows

The workflow runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual trigger via GitHub UI (`workflow_dispatch`)

### Workflow Configuration

#### Docker Service Method (Recommended)

```yaml
services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - 4566:4566
    env:
      DEBUG: 1
      SERVICES: s3,dynamodb,lambda,sqs,sns,cloudformation,logs,events
```

#### Direct Installation Method

```yaml
- name: Install LocalStack
  run: |
    pip install localstack[runtime] awscli boto3 requests

- name: Start LocalStack
  run: |
    localstack start --detached
```

### Environment Variables

The workflow uses these environment variables:

- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`
- `AWS_DEFAULT_REGION=us-east-1`
- `LOCALSTACK_ENDPOINT=http://localhost:4566`

## 📝 Configuration Options

### LocalStack Services

To enable specific services, modify the `SERVICES` environment variable:

```yaml
env:
  SERVICES: s3,dynamodb,lambda,sqs,sns,cloudformation,logs,events,apigateway,cloudwatch
```

### Custom Endpoint

For different LocalStack configurations:

```yaml
env:
  LOCALSTACK_ENDPOINT: http://localhost:4566
  EDGE_PORT: 4566
```

## 🧪 Testing Examples

### Python (boto3) Example

```python
import boto3

# Create S3 client
s3_client = boto3.client(
    's3',
    endpoint_url='http://localhost:4566',
    aws_access_key_id='test',
    aws_secret_access_key='test',
    region_name='us-east-1'
)

# Create bucket
s3_client.create_bucket(Bucket='test-bucket')

# Upload file
s3_client.put_object(Bucket='test-bucket', Key='test.txt', Body='Hello World!')
```

### AWS CLI Example

```bash
# Configure AWS CLI
aws configure set aws_access_key_id test
aws configure set aws_secret_access_key test
aws configure set default.region us-east-1

# Use with LocalStack
aws --endpoint-url=http://localhost:4566 s3 mb s3://test-bucket
aws --endpoint-url=http://localhost:4566 s3 cp file.txt s3://test-bucket/
```

## � Debugging

### Check LocalStack Health

```bash
curl http://localhost:4566/health
```

### View LocalStack Logs

```bash
localstack logs
```

### GitHub Actions Debugging

The workflow includes debugging steps:

```yaml
- name: Verify LocalStack services
  run: |
    curl -s http://localhost:4566/health | jq .
    curl -s http://localhost:4566/health | jq '.services'
```

## 🏗️ Integration with Your Project

### For Application Testing

1. **Add LocalStack to your test dependencies**:
   ```bash
   pip install localstack[runtime]
   ```

2. **Configure your application for LocalStack**:
   ```python
   import os
   
   AWS_ENDPOINT_URL = os.getenv('AWS_ENDPOINT_URL', 'http://localhost:4566')
   AWS_REGION = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
   ```

3. **Create test fixtures**:
   ```python
   import pytest
   import boto3
   
   @pytest.fixture
   def s3_client():
       return boto3.client(
           's3',
           endpoint_url='http://localhost:4566',
           aws_access_key_id='test',
           aws_secret_access_key='test',
           region_name='us-east-1'
       )
   ```

### For Infrastructure Testing

Use LocalStack to test:
- CloudFormation templates
- Terraform configurations
- CDK applications
- SAM applications

## 📚 Additional Resources

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [LocalStack GitHub Repository](https://github.com/localstack/localstack)
- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [Boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass in GitHub Actions
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## � Troubleshooting

### Common Issues

1. **LocalStack not starting**: Check Docker daemon is running
2. **Connection refused**: Wait longer for LocalStack to start
3. **Service not available**: Check the `SERVICES` environment variable
4. **Permission errors**: Ensure proper AWS credentials are set

### Getting Help

- Check the [LocalStack Discussions](https://github.com/localstack/localstack/discussions)
- Review [GitHub Actions documentation](https://docs.github.com/en/actions)
- Open an issue in this repository for specific problems
