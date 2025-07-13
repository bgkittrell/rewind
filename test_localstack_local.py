#!/usr/bin/env python3
"""
Local test script for LocalStack setup verification
Run this script locally to test your LocalStack installation
"""

import boto3
import json
import time
import requests
import sys
from botocore.exceptions import ClientError, NoCredentialsError

# LocalStack configuration
LOCALSTACK_ENDPOINT = "http://localhost:4566"
AWS_REGION = "us-east-1"

def create_boto3_client(service_name):
    """Create a boto3 client for LocalStack"""
    return boto3.client(
        service_name,
        endpoint_url=LOCALSTACK_ENDPOINT,
        region_name=AWS_REGION,
        aws_access_key_id='test',
        aws_secret_access_key='test'
    )

def check_localstack_health():
    """Check if LocalStack is running and healthy"""
    print("🔍 Checking LocalStack health...")
    
    try:
        response = requests.get(f"{LOCALSTACK_ENDPOINT}/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            services = health_data.get('services', {})
            
            print("✅ LocalStack is running!")
            print(f"📋 Available services: {list(services.keys())}")
            
            # Check service status
            for service, status in services.items():
                status_icon = "✅" if status == "available" else "❌"
                print(f"   {status_icon} {service}: {status}")
            
            return True
        else:
            print(f"❌ LocalStack health check failed: HTTP {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to LocalStack: {e}")
        print("💡 Make sure LocalStack is running: localstack start")
        return False

def test_s3():
    """Test S3 operations"""
    print("\n🗃️  Testing S3...")
    
    try:
        s3 = create_boto3_client('s3')
        bucket_name = 'local-test-bucket'
        
        # Create bucket
        s3.create_bucket(Bucket=bucket_name)
        print(f"✅ Created bucket: {bucket_name}")
        
        # Upload file
        test_content = "Hello from LocalStack S3 test!"
        s3.put_object(Bucket=bucket_name, Key='test.txt', Body=test_content)
        print("✅ Uploaded test file")
        
        # Download file
        response = s3.get_object(Bucket=bucket_name, Key='test.txt')
        content = response['Body'].read().decode('utf-8')
        assert content == test_content, f"Content mismatch: {content}"
        print("✅ Downloaded and verified file content")
        
        # List objects
        response = s3.list_objects_v2(Bucket=bucket_name)
        objects = [obj['Key'] for obj in response.get('Contents', [])]
        print(f"✅ Listed objects: {objects}")
        
        # Cleanup
        s3.delete_object(Bucket=bucket_name, Key='test.txt')
        s3.delete_bucket(Bucket=bucket_name)
        print("✅ Cleaned up S3 resources")
        
        return True
        
    except Exception as e:
        print(f"❌ S3 test failed: {e}")
        return False

def test_dynamodb():
    """Test DynamoDB operations"""
    print("\n🗄️  Testing DynamoDB...")
    
    try:
        dynamodb = create_boto3_client('dynamodb')
        table_name = 'local-test-table'
        
        # Create table
        dynamodb.create_table(
            TableName=table_name,
            KeySchema=[{'AttributeName': 'id', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'id', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST'
        )
        print(f"✅ Created table: {table_name}")
        
        # Wait for table to be active
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(TableName=table_name)
        print("✅ Table is active")
        
        # Put item
        dynamodb.put_item(
            TableName=table_name,
            Item={
                'id': {'S': 'test-id'},
                'message': {'S': 'Hello from LocalStack DynamoDB!'},
                'timestamp': {'N': str(int(time.time()))}
            }
        )
        print("✅ Added item to table")
        
        # Get item
        response = dynamodb.get_item(
            TableName=table_name,
            Key={'id': {'S': 'test-id'}}
        )
        item = response.get('Item', {})
        assert 'id' in item, "Item not found"
        print("✅ Retrieved item from table")
        
        # Cleanup
        dynamodb.delete_table(TableName=table_name)
        print("✅ Cleaned up DynamoDB resources")
        
        return True
        
    except Exception as e:
        print(f"❌ DynamoDB test failed: {e}")
        return False

def test_sqs():
    """Test SQS operations"""
    print("\n📬 Testing SQS...")
    
    try:
        sqs = create_boto3_client('sqs')
        queue_name = 'local-test-queue'
        
        # Create queue
        response = sqs.create_queue(QueueName=queue_name)
        queue_url = response['QueueUrl']
        print(f"✅ Created queue: {queue_name}")
        
        # Send message
        message_body = "Hello from LocalStack SQS test!"
        sqs.send_message(QueueUrl=queue_url, MessageBody=message_body)
        print("✅ Sent message to queue")
        
        # Receive message
        response = sqs.receive_message(QueueUrl=queue_url)
        messages = response.get('Messages', [])
        assert len(messages) > 0, "No messages received"
        
        received_message = messages[0]
        assert received_message['Body'] == message_body, "Message body mismatch"
        print("✅ Received and verified message")
        
        # Delete message
        sqs.delete_message(
            QueueUrl=queue_url,
            ReceiptHandle=received_message['ReceiptHandle']
        )
        print("✅ Deleted message")
        
        # Cleanup
        sqs.delete_queue(QueueUrl=queue_url)
        print("✅ Cleaned up SQS resources")
        
        return True
        
    except Exception as e:
        print(f"❌ SQS test failed: {e}")
        return False

def test_lambda():
    """Test Lambda operations"""
    print("\n⚡ Testing Lambda...")
    
    try:
        lambda_client = create_boto3_client('lambda')
        function_name = 'local-test-function'
        
        # Simple Lambda function code
        lambda_code = '''
def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': f'Hello from LocalStack Lambda! Event: {event}'
    }
'''
        
        # Create function
        lambda_client.create_function(
            FunctionName=function_name,
            Runtime='python3.9',
            Role='arn:aws:iam::123456789012:role/lambda-role',
            Handler='index.lambda_handler',
            Code={'ZipFile': lambda_code.encode()},
            Description='Local test Lambda function'
        )
        print(f"✅ Created Lambda function: {function_name}")
        
        # Invoke function
        response = lambda_client.invoke(
            FunctionName=function_name,
            Payload=json.dumps({'test': 'local-data'})
        )
        
        result = json.loads(response['Payload'].read())
        assert result['statusCode'] == 200, f"Unexpected status: {result}"
        print("✅ Invoked Lambda function successfully")
        
        # Cleanup
        lambda_client.delete_function(FunctionName=function_name)
        print("✅ Cleaned up Lambda resources")
        
        return True
        
    except Exception as e:
        print(f"❌ Lambda test failed: {e}")
        return False

def main():
    """Run all LocalStack tests"""
    print("🚀 LocalStack Local Testing Suite")
    print("=" * 50)
    
    # Check if LocalStack is running
    if not check_localstack_health():
        print("\n💡 To start LocalStack, run:")
        print("   localstack start")
        print("\n💡 Or in detached mode:")
        print("   localstack start --detached")
        return 1
    
    # Run service tests
    tests = [
        ("S3", test_s3),
        ("DynamoDB", test_dynamodb),
        ("SQS", test_sqs),
        ("Lambda", test_lambda),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"❌ {test_name} test failed with error: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! LocalStack is working perfectly!")
        print("\n💡 You can now use LocalStack for local AWS development:")
        print("   - Endpoint: http://localhost:4566")
        print("   - Credentials: test/test")
        print("   - Region: us-east-1")
        return 0
    else:
        print("⚠️  Some tests failed. Check the error messages above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())