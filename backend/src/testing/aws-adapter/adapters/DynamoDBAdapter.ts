/**
 * DynamoDB Adapter - Mock Implementation
 *
 * In-memory DynamoDB simulation for integration testing
 */

import { DynamoDBAdapter, DynamoDBRecord, DynamoDBTableConfig, AdapterError } from '../types'

interface InMemoryTable {
  name: string
  primaryKey: string
  sortKey?: string
  indexes: string[]
  data: Map<string, DynamoDBRecord>
}

export class MockDynamoDBAdapter implements DynamoDBAdapter {
  private tables: Map<string, InMemoryTable> = new Map()
  private operations: Array<{ operation: string; tableName: string; timestamp: Date }> = []

  async putItem(tableName: string, item: DynamoDBRecord): Promise<void> {
    const table = this.getTable(tableName)

    // Validate required fields
    if (!item[table.primaryKey]) {
      throw new AdapterError(`Primary key ${table.primaryKey} not found in item`, 'dynamodb', 'putItem')
    }

    if (table.sortKey && !item[table.sortKey]) {
      throw new AdapterError(`Sort key ${table.sortKey} not found in item`, 'dynamodb', 'putItem')
    }

    const key = this.generateKey(table, item)

    table.data.set(key, { ...item })
    this.recordOperation('putItem', tableName)
  }

  async getItem(tableName: string, key: DynamoDBRecord): Promise<DynamoDBRecord | null> {
    const table = this.getTable(tableName)
    const keyString = this.generateKey(table, key)

    this.recordOperation('getItem', tableName)
    return table.data.get(keyString) || null
  }

  async updateItem(
    tableName: string,
    key: DynamoDBRecord,
    updateExpression: string,
    values: DynamoDBRecord,
  ): Promise<void> {
    const table = this.getTable(tableName)
    const keyString = this.generateKey(table, key)
    const existingItem = table.data.get(keyString)

    if (!existingItem) {
      throw new AdapterError(`Item not found for update`, 'dynamodb', 'updateItem')
    }

    // Simple update expression parsing (supports SET operations)
    const updatedItem = { ...existingItem }

    if (updateExpression.includes('SET')) {
      const setClause = updateExpression.split('SET')[1].trim()
      const assignments = setClause.split(',').map(s => s.trim())

      assignments.forEach(assignment => {
        const [field, expression] = assignment.split('=').map(s => s.trim())
        const cleanField = field.replace(/^#/, '') // Remove attribute name prefix

        // Handle arithmetic operations
        if (expression.includes('+')) {
          const [leftOperand, rightOperand] = expression.split('+').map(s => s.trim())
          let leftValue = leftOperand === cleanField ? updatedItem[cleanField] || 0 : leftOperand
          let rightValue = rightOperand.replace(/^:/, '') // Remove value prefix

          if (values[rightValue] !== undefined) {
            rightValue = values[rightValue]
          }

          updatedItem[cleanField] = Number(leftValue) + Number(rightValue)
        } else if (expression.includes('-')) {
          const [leftOperand, rightOperand] = expression.split('-').map(s => s.trim())
          let leftValue = leftOperand === cleanField ? updatedItem[cleanField] || 0 : leftOperand
          let rightValue = rightOperand.replace(/^:/, '') // Remove value prefix

          if (values[rightValue] !== undefined) {
            rightValue = values[rightValue]
          }

          updatedItem[cleanField] = Number(leftValue) - Number(rightValue)
        } else {
          // Simple assignment
          const cleanValueRef = expression.replace(/^:/, '') // Remove value prefix

          if (values[cleanValueRef] !== undefined) {
            updatedItem[cleanField] = values[cleanValueRef]
          }
        }
      })
    }

    table.data.set(keyString, updatedItem)
    this.recordOperation('updateItem', tableName)
  }

  async deleteItem(tableName: string, key: DynamoDBRecord): Promise<void> {
    const table = this.getTable(tableName)
    const keyString = this.generateKey(table, key)

    table.data.delete(keyString)
    this.recordOperation('deleteItem', tableName)
  }

  async scan(tableName: string, filterExpression?: string, values?: DynamoDBRecord): Promise<DynamoDBRecord[]> {
    const table = this.getTable(tableName)
    let items = Array.from(table.data.values())

    if (filterExpression && values) {
      items = items.filter(item => this.evaluateFilterExpression(item, filterExpression, values))
    }

    this.recordOperation('scan', tableName)
    return items
  }

  async query(tableName: string, keyCondition: string, values: DynamoDBRecord): Promise<DynamoDBRecord[]> {
    const table = this.getTable(tableName)
    const items = Array.from(table.data.values())

    // Simple key condition evaluation
    const filteredItems = items.filter(item => this.evaluateKeyCondition(item, keyCondition, values))

    this.recordOperation('query', tableName)
    return filteredItems
  }

  async batchWrite(tableName: string, items: DynamoDBRecord[]): Promise<void> {
    const table = this.getTable(tableName)

    for (const item of items) {
      const key = this.generateKey(table, item)
      table.data.set(key, { ...item })
    }

    this.recordOperation('batchWrite', tableName)
  }

  async createTable(config: DynamoDBTableConfig): Promise<void> {
    if (this.tables.has(config.tableName)) {
      throw new AdapterError(`Table already exists: ${config.tableName}`, 'dynamodb', 'createTable')
    }

    this.tables.set(config.tableName, {
      name: config.tableName,
      primaryKey: config.primaryKey,
      sortKey: config.sortKey,
      indexes: config.indexes || [],
      data: new Map(),
    })

    this.recordOperation('createTable', config.tableName)
  }

  async deleteTable(tableName: string): Promise<void> {
    if (!this.tables.has(tableName)) {
      throw new AdapterError(`Table not found: ${tableName}`, 'dynamodb', 'deleteTable')
    }

    this.tables.delete(tableName)
    this.recordOperation('deleteTable', tableName)
  }

  async clearTable(tableName: string): Promise<void> {
    const table = this.getTable(tableName)
    table.data.clear()
    this.recordOperation('clearTable', tableName)
  }

  // Test utilities
  getTableData(tableName: string): DynamoDBRecord[] {
    const table = this.getTable(tableName)
    return Array.from(table.data.values())
  }

  getOperations(): Array<{ operation: string; tableName: string; timestamp: Date }> {
    return [...this.operations]
  }

  clearOperations(): void {
    this.operations = []
  }

  getTableNames(): string[] {
    return Array.from(this.tables.keys())
  }

  private getTable(tableName: string): InMemoryTable {
    const table = this.tables.get(tableName)
    if (!table) {
      throw new AdapterError(`Table not found: ${tableName}`, 'dynamodb', 'getTable')
    }
    return table
  }

  private generateKey(table: InMemoryTable, item: DynamoDBRecord): string {
    const primaryKeyValue = item[table.primaryKey]
    if (primaryKeyValue === undefined) {
      throw new AdapterError(`Primary key ${table.primaryKey} not found in item`, 'dynamodb', 'generateKey')
    }

    let key = String(primaryKeyValue)

    if (table.sortKey) {
      const sortKeyValue = item[table.sortKey]
      if (sortKeyValue !== undefined) {
        key += `#${String(sortKeyValue)}`
      }
    }

    return key
  }

  private evaluateFilterExpression(item: DynamoDBRecord, filterExpression: string, values: DynamoDBRecord): boolean {
    // Simple filter expression evaluation
    // Supports: attribute_name = :value, attribute_name <> :value, contains(attribute_name, :value)

    if (filterExpression.includes('=') && !filterExpression.includes('<>')) {
      const [field, valueRef] = filterExpression.split('=').map(s => s.trim())
      const cleanField = field.replace(/^#/, '')
      const cleanValueRef = valueRef.replace(/^:/, '')
      return item[cleanField] === values[cleanValueRef]
    }

    if (filterExpression.includes('<>')) {
      const [field, valueRef] = filterExpression.split('<>').map(s => s.trim())
      const cleanField = field.replace(/^#/, '')
      const cleanValueRef = valueRef.replace(/^:/, '')
      return item[cleanField] !== values[cleanValueRef]
    }

    if (filterExpression.includes('contains(')) {
      const match = filterExpression.match(/contains\((.*?),\s*(.*?)\)/)
      if (match) {
        const field = match[1].replace(/^#/, '')
        const valueRef = match[2].replace(/^:/, '')
        const itemValue = String(item[field] || '')
        const searchValue = String(values[valueRef] || '')
        return itemValue.includes(searchValue)
      }
    }

    return true // Default to true for unsupported expressions
  }

  private evaluateKeyCondition(item: DynamoDBRecord, keyCondition: string, values: DynamoDBRecord): boolean {
    // Simple key condition evaluation
    if (keyCondition.includes('=')) {
      const [field, valueRef] = keyCondition.split('=').map(s => s.trim())
      const cleanField = field.replace(/^#/, '')
      const cleanValueRef = valueRef.replace(/^:/, '')
      return item[cleanField] === values[cleanValueRef]
    }

    if (keyCondition.includes('begins_with(')) {
      const match = keyCondition.match(/begins_with\((.*?),\s*(.*?)\)/)
      if (match) {
        const field = match[1].replace(/^#/, '')
        const valueRef = match[2].replace(/^:/, '')
        const itemValue = String(item[field] || '')
        const searchValue = String(values[valueRef] || '')
        return itemValue.startsWith(searchValue)
      }
    }

    return true
  }

  private recordOperation(operation: string, tableName: string): void {
    this.operations.push({
      operation,
      tableName,
      timestamp: new Date(),
    })
  }
}

/**
 * Production DynamoDB Adapter
 *
 * Wrapper for actual AWS DynamoDB client
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'

export class ProductionDynamoDBAdapter implements DynamoDBAdapter {
  private client: DynamoDBDocumentClient

  constructor(client?: DynamoDBClient) {
    const dynamoClient = client || new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
    this.client = DynamoDBDocumentClient.from(dynamoClient)
  }

  async putItem(tableName: string, item: DynamoDBRecord): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: item,
      })
      await this.client.send(command)
    } catch (error) {
      throw new AdapterError(`DynamoDB putItem failed: ${error.message}`, 'dynamodb', 'putItem', error)
    }
  }

  async getItem(tableName: string, key: DynamoDBRecord): Promise<DynamoDBRecord | null> {
    try {
      const command = new GetCommand({
        TableName: tableName,
        Key: key,
      })
      const response = await this.client.send(command)
      return response.Item || null
    } catch (error) {
      throw new AdapterError(`DynamoDB getItem failed: ${error.message}`, 'dynamodb', 'getItem', error)
    }
  }

  async updateItem(
    tableName: string,
    key: DynamoDBRecord,
    updateExpression: string,
    values: DynamoDBRecord,
  ): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: values,
      })
      await this.client.send(command)
    } catch (error) {
      throw new AdapterError(`DynamoDB updateItem failed: ${error.message}`, 'dynamodb', 'updateItem', error)
    }
  }

  async deleteItem(tableName: string, key: DynamoDBRecord): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: key,
      })
      await this.client.send(command)
    } catch (error) {
      throw new AdapterError(`DynamoDB deleteItem failed: ${error.message}`, 'dynamodb', 'deleteItem', error)
    }
  }

  async scan(tableName: string, filterExpression?: string, values?: DynamoDBRecord): Promise<DynamoDBRecord[]> {
    try {
      const command = new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: values,
      })
      const response = await this.client.send(command)
      return response.Items || []
    } catch (error) {
      throw new AdapterError(`DynamoDB scan failed: ${error.message}`, 'dynamodb', 'scan', error)
    }
  }

  async query(tableName: string, keyCondition: string, values: DynamoDBRecord): Promise<DynamoDBRecord[]> {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: values,
      })
      const response = await this.client.send(command)
      return response.Items || []
    } catch (error) {
      throw new AdapterError(`DynamoDB query failed: ${error.message}`, 'dynamodb', 'query', error)
    }
  }

  async batchWrite(tableName: string, items: DynamoDBRecord[]): Promise<void> {
    try {
      const command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: items.map(item => ({
            PutRequest: { Item: item },
          })),
        },
      })
      await this.client.send(command)
    } catch (error) {
      throw new AdapterError(`DynamoDB batchWrite failed: ${error.message}`, 'dynamodb', 'batchWrite', error)
    }
  }

  async createTable(): Promise<void> {
    throw new AdapterError('Table creation not supported in production mode', 'dynamodb', 'createTable')
  }

  async deleteTable(): Promise<void> {
    throw new AdapterError('Table deletion not supported in production mode', 'dynamodb', 'deleteTable')
  }

  async clearTable(): Promise<void> {
    throw new AdapterError('Table clearing not supported in production mode', 'dynamodb', 'clearTable')
  }
}
