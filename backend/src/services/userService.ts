import { DatabaseService, Tables } from './database.js'

export interface User {
  userId: string
  email: string
  name: string
  preferences: Record<string, any>
  createdAt: string
  updatedAt: string
  lastActiveAt: string
}

export class UserService extends DatabaseService {
  constructor() {
    super(Tables.USERS)
  }

  async createUser(userData: Omit<User, 'createdAt' | 'updatedAt' | 'lastActiveAt'>): Promise<User> {
    const now = new Date().toISOString()
    const user: User = {
      ...userData,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    }

    await this.put(user)
    return user
  }

  async getUser(userId: string): Promise<User | undefined> {
    const user = await this.get({ userId })
    return user as User | undefined
  }

  async updateUser(userId: string, updates: Partial<Omit<User, 'userId' | 'createdAt'>>): Promise<User> {
    const now = new Date().toISOString()
    const updateExpression = 'SET updatedAt = :updatedAt'
    const expressionAttributeValues: Record<string, any> = { ':updatedAt': now }

    // Build dynamic update expression
    const updateParts: string[] = []
    if (updates.email) {
      updateParts.push('email = :email')
      expressionAttributeValues[':email'] = updates.email
    }
    if (updates.name) {
      updateParts.push('#name = :name')
      expressionAttributeValues[':name'] = updates.name
    }
    if (updates.preferences) {
      updateParts.push('preferences = :preferences')
      expressionAttributeValues[':preferences'] = updates.preferences
    }
    if (updates.lastActiveAt) {
      updateParts.push('lastActiveAt = :lastActiveAt')
      expressionAttributeValues[':lastActiveAt'] = updates.lastActiveAt
    }

    const finalUpdateExpression = updateParts.length > 0 
      ? `${updateExpression}, ${updateParts.join(', ')}`
      : updateExpression

    const expressionAttributeNames = updates.name ? { '#name': 'name' } : undefined

    const result = await this.update(
      { userId },
      finalUpdateExpression,
      expressionAttributeValues,
      expressionAttributeNames
    )

    return result as User
  }

  async updateLastActive(userId: string): Promise<void> {
    const now = new Date().toISOString()
    await this.update(
      { userId },
      'SET lastActiveAt = :lastActiveAt',
      { ':lastActiveAt': now }
    )
  }

  async deleteUser(userId: string): Promise<void> {
    await this.delete({ userId })
  }
}