import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, DeleteCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
})

export const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
})

// Table names from environment variables
export const Tables = {
  USERS: process.env.USERS_TABLE || 'rewind-users',
  PODCASTS: process.env.PODCASTS_TABLE || 'rewind-podcasts',
  EPISODES: process.env.EPISODES_TABLE || 'rewind-episodes',
  LISTENING_HISTORY: process.env.LISTENING_HISTORY_TABLE || 'rewind-listening-history',
  USER_FAVORITES: process.env.USER_FAVORITES_TABLE || 'rewind-user-favorites',
  USER_FEEDBACK: process.env.USER_FEEDBACK_TABLE || 'rewind-user-feedback',
  SHARES: process.env.SHARES_TABLE || 'rewind-shares',
}

// Base database service class
export class DatabaseService {
  protected tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  async get(key: Record<string, any>) {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: key,
    })
    
    const result = await docClient.send(command)
    return result.Item
  }

  async put(item: Record<string, any>) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    })
    
    await docClient.send(command)
    return item
  }

  async update(key: Record<string, any>, updateExpression: string, expressionAttributeValues: Record<string, any>, expressionAttributeNames?: Record<string, string>) {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'ALL_NEW',
    })
    
    const result = await docClient.send(command)
    return result.Attributes
  }

  async delete(key: Record<string, any>) {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: key,
    })
    
    await docClient.send(command)
  }

  async query(partitionKey: string, partitionValue: any, sortKey?: string, sortValue?: any, indexName?: string) {
    let keyConditionExpression = `#pk = :pk`
    const expressionAttributeNames: Record<string, string> = { '#pk': partitionKey }
    const expressionAttributeValues: Record<string, any> = { ':pk': partitionValue }

    if (sortKey && sortValue !== undefined) {
      keyConditionExpression += ` AND #sk = :sk`
      expressionAttributeNames['#sk'] = sortKey
      expressionAttributeValues[':sk'] = sortValue
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: indexName,
    })
    
    const result = await docClient.send(command)
    return result.Items || []
  }

  async queryWithFilter(
    partitionKey: string, 
    partitionValue: any, 
    sortKey?: string, 
    sortValue?: any, 
    filterExpression?: string,
    filterValues?: Record<string, any>,
    indexName?: string,
    limit?: number,
    lastEvaluatedKey?: Record<string, any>
  ) {
    let keyConditionExpression = `#pk = :pk`
    const expressionAttributeNames: Record<string, string> = { '#pk': partitionKey }
    const expressionAttributeValues: Record<string, any> = { ':pk': partitionValue }

    if (sortKey && sortValue !== undefined) {
      keyConditionExpression += ` AND #sk = :sk`
      expressionAttributeNames['#sk'] = sortKey
      expressionAttributeValues[':sk'] = sortValue
    }

    if (filterValues) {
      Object.assign(expressionAttributeValues, filterValues)
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: keyConditionExpression,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: indexName,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
    
    const result = await docClient.send(command)
    return {
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
      hasMore: !!result.LastEvaluatedKey,
    }
  }

  async scan(limit?: number, lastEvaluatedKey?: Record<string, any>) {
    const command = new ScanCommand({
      TableName: this.tableName,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
    
    const result = await docClient.send(command)
    return {
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
      hasMore: !!result.LastEvaluatedKey,
    }
  }
}