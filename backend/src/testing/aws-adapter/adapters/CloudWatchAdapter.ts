/**
 * CloudWatch Adapter - Mock Implementation
 *
 * In-memory CloudWatch metrics simulation for integration testing
 */

import { CloudWatchAdapter, CloudWatchMetric, AdapterError } from '../types'

interface StoredMetric extends CloudWatchMetric {
  id: string
  timestamp: Date
}

export class MockCloudWatchAdapter implements CloudWatchAdapter {
  private metrics: Map<string, StoredMetric[]> = new Map()
  private alarms: Map<string, any> = new Map()
  private operations: Array<{ operation: string; timestamp: Date; details: any }> = []

  async putMetricData(metrics: CloudWatchMetric[]): Promise<void> {
    for (const metric of metrics) {
      const metricKey = `${metric.namespace}/${metric.metricName}`
      const storedMetric: StoredMetric = {
        ...metric,
        id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: metric.timestamp || new Date(),
      }

      if (!this.metrics.has(metricKey)) {
        this.metrics.set(metricKey, [])
      }

      this.metrics.get(metricKey)!.push(storedMetric)
    }

    this.recordOperation('putMetricData', { metricCount: metrics.length })
  }

  async getMetricStatistics(namespace: string, metricName: string, startTime: Date, endTime: Date): Promise<number[]> {
    const metricKey = `${namespace}/${metricName}`
    const metrics = this.metrics.get(metricKey) || []

    const filteredMetrics = metrics.filter(metric => metric.timestamp >= startTime && metric.timestamp <= endTime)

    this.recordOperation('getMetricStatistics', {
      namespace,
      metricName,
      count: filteredMetrics.length,
    })

    return filteredMetrics.map(metric => metric.value)
  }

  async createAlarm(alarmName: string, config: any): Promise<void> {
    if (this.alarms.has(alarmName)) {
      throw new AdapterError(`Alarm already exists: ${alarmName}`, 'cloudwatch', 'createAlarm')
    }

    this.alarms.set(alarmName, {
      ...config,
      alarmName,
      state: 'OK',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    this.recordOperation('createAlarm', { alarmName, config })
  }

  async deleteAlarm(alarmName: string): Promise<void> {
    if (!this.alarms.has(alarmName)) {
      throw new AdapterError(`Alarm not found: ${alarmName}`, 'cloudwatch', 'deleteAlarm')
    }

    this.alarms.delete(alarmName)
    this.recordOperation('deleteAlarm', { alarmName })
  }

  // Test utilities
  getMetrics(namespace?: string, metricName?: string): StoredMetric[] {
    if (namespace && metricName) {
      const metricKey = `${namespace}/${metricName}`
      return this.metrics.get(metricKey) || []
    }

    if (namespace) {
      const results: StoredMetric[] = []
      for (const [key, metrics] of this.metrics.entries()) {
        if (key.startsWith(namespace + '/')) {
          results.push(...metrics)
        }
      }
      return results
    }

    const allMetrics: StoredMetric[] = []
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics)
    }
    return allMetrics
  }

  getAlarms(): any[] {
    return Array.from(this.alarms.values())
  }

  getAlarm(alarmName: string): any {
    return this.alarms.get(alarmName)
  }

  getOperations(): Array<{ operation: string; timestamp: Date; details: any }> {
    return [...this.operations]
  }

  clearMetrics(): void {
    this.metrics.clear()
    this.operations = []
  }

  clearAlarms(): void {
    this.alarms.clear()
  }

  // Simulate alarm state changes
  simulateAlarmStateChange(alarmName: string, newState: 'OK' | 'ALARM' | 'INSUFFICIENT_DATA'): void {
    const alarm = this.alarms.get(alarmName)
    if (alarm) {
      alarm.state = newState
      alarm.updatedAt = new Date()
      this.recordOperation('alarmStateChange', { alarmName, newState })
    }
  }

  // Generate common metrics for testing
  generateGuestExtractionMetrics(): CloudWatchMetric[] {
    return [
      {
        metricName: 'ExtractionSuccess',
        namespace: 'Rewind/GuestExtraction',
        value: 1,
        unit: 'Count',
        dimensions: { ProcessorType: 'Lambda' },
      },
      {
        metricName: 'ExtractionLatency',
        namespace: 'Rewind/GuestExtraction',
        value: 250,
        unit: 'Milliseconds',
        dimensions: { ProcessorType: 'Lambda' },
      },
      {
        metricName: 'BedrockTokensUsed',
        namespace: 'Rewind/GuestExtraction',
        value: 1500,
        unit: 'Count',
        dimensions: { ModelId: 'claude-3-haiku' },
      },
    ]
  }

  private recordOperation(operation: string, details: any): void {
    this.operations.push({
      operation,
      timestamp: new Date(),
      details,
    })
  }
}

/**
 * Production CloudWatch Adapter
 *
 * Wrapper for actual AWS CloudWatch client
 */
import {
  CloudWatchClient,
  PutMetricDataCommand,
  GetMetricStatisticsCommand,
  PutMetricAlarmCommand,
  DeleteAlarmsCommand,
} from '@aws-sdk/client-cloudwatch'

export class ProductionCloudWatchAdapter implements CloudWatchAdapter {
  private client: CloudWatchClient

  constructor(client?: CloudWatchClient) {
    this.client = client || new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' })
  }

  async putMetricData(metrics: CloudWatchMetric[]): Promise<void> {
    try {
      // Group metrics by namespace (CloudWatch requirement)
      const metricsByNamespace = new Map<string, CloudWatchMetric[]>()

      for (const metric of metrics) {
        if (!metricsByNamespace.has(metric.namespace)) {
          metricsByNamespace.set(metric.namespace, [])
        }
        metricsByNamespace.get(metric.namespace)!.push(metric)
      }

      // Send metrics for each namespace
      for (const [namespace, namespaceMetrics] of metricsByNamespace) {
        const metricData = namespaceMetrics.map(metric => ({
          MetricName: metric.metricName,
          Value: metric.value,
          Unit: metric.unit,
          Dimensions: metric.dimensions
            ? Object.entries(metric.dimensions).map(([name, value]) => ({
                Name: name,
                Value: value,
              }))
            : undefined,
          Timestamp: metric.timestamp,
        }))

        const command = new PutMetricDataCommand({
          Namespace: namespace,
          MetricData: metricData,
        })

        await this.client.send(command)
      }
    } catch (error) {
      throw new AdapterError(`CloudWatch putMetricData failed: ${error.message}`, 'cloudwatch', 'putMetricData', error)
    }
  }

  async getMetricStatistics(namespace: string, metricName: string, startTime: Date, endTime: Date): Promise<number[]> {
    try {
      const command = new GetMetricStatisticsCommand({
        Namespace: namespace,
        MetricName: metricName,
        StartTime: startTime,
        EndTime: endTime,
        Period: 300, // 5 minutes
        Statistics: ['Average', 'Sum', 'Maximum', 'Minimum'],
      })

      const response = await this.client.send(command)

      return (response.Datapoints || [])
        .map(dp => dp.Average || dp.Sum || dp.Maximum || dp.Minimum || 0)
        .filter(value => value !== undefined)
    } catch (error) {
      throw new AdapterError(
        `CloudWatch getMetricStatistics failed: ${error.message}`,
        'cloudwatch',
        'getMetricStatistics',
        error,
      )
    }
  }

  async createAlarm(alarmName: string, config: any): Promise<void> {
    try {
      const command = new PutMetricAlarmCommand({
        AlarmName: alarmName,
        AlarmDescription: config.description,
        MetricName: config.metricName,
        Namespace: config.namespace,
        Statistic: config.statistic || 'Average',
        Period: config.period || 300,
        EvaluationPeriods: config.evaluationPeriods || 1,
        Threshold: config.threshold,
        ComparisonOperator: config.comparisonOperator || 'GreaterThanThreshold',
        AlarmActions: config.alarmActions,
        OKActions: config.okActions,
        TreatMissingData: config.treatMissingData || 'notBreaching',
        Dimensions: config.dimensions
          ? Object.entries(config.dimensions).map(([name, value]) => ({
              Name: name,
              Value: value as string,
            }))
          : undefined,
      })

      await this.client.send(command)
    } catch (error) {
      throw new AdapterError(`CloudWatch createAlarm failed: ${error.message}`, 'cloudwatch', 'createAlarm', error)
    }
  }

  async deleteAlarm(alarmName: string): Promise<void> {
    try {
      const command = new DeleteAlarmsCommand({
        AlarmNames: [alarmName],
      })

      await this.client.send(command)
    } catch (error) {
      throw new AdapterError(`CloudWatch deleteAlarm failed: ${error.message}`, 'cloudwatch', 'deleteAlarm', error)
    }
  }
}
