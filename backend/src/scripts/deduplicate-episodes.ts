#!/usr/bin/env ts-node

import { DynamoDBClient, ScanCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { Episode } from '../types'

const crypto = require('crypto')

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
const EPISODES_TABLE = process.env.EPISODES_TABLE || 'RewindEpisodes'

interface DeduplicationStats {
  totalEpisodes: number
  duplicatesFound: number
  episodesRemoved: number
  episodesUpdated: number
  errors: number
}

class EpisodeDeduplicator {
  private stats: DeduplicationStats = {
    totalEpisodes: 0,
    duplicatesFound: 0,
    episodesRemoved: 0,
    episodesUpdated: 0,
    errors: 0,
  }

  private generateNaturalKey(episode: Episode): string {
    const normalizedTitle = episode.title.toLowerCase().trim()
    const releaseDate = new Date(episode.releaseDate).toISOString().split('T')[0]
    const keyData = `${normalizedTitle}:${releaseDate}`
    return crypto.createHash('md5').update(keyData).digest('hex')
  }

  async getAllEpisodes(): Promise<Episode[]> {
    console.log('Scanning all episodes...')
    const episodes: Episode[] = []
    let lastEvaluatedKey: any = undefined

    do {
      const params: any = {
        TableName: EPISODES_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
      }

      try {
        const result = await dynamoClient.send(new ScanCommand(params))
        
        if (result.Items) {
          const batchEpisodes = result.Items.map(item => unmarshall(item) as Episode)
          episodes.push(...batchEpisodes)
          console.log(`Found ${episodes.length} episodes so far...`)
        }

        lastEvaluatedKey = result.LastEvaluatedKey
      } catch (error) {
        console.error('Error scanning episodes:', error)
        this.stats.errors++
        break
      }
    } while (lastEvaluatedKey)

    this.stats.totalEpisodes = episodes.length
    console.log(`Total episodes found: ${episodes.length}`)
    return episodes
  }

  async deduplicateEpisodes(episodes: Episode[]): Promise<void> {
    console.log('Starting deduplication process...')
    
    // Group episodes by podcast and natural key
    const episodeGroups = new Map<string, Episode[]>()
    
    for (const episode of episodes) {
      const naturalKey = this.generateNaturalKey(episode)
      const groupKey = `${episode.podcastId}:${naturalKey}`
      
      if (!episodeGroups.has(groupKey)) {
        episodeGroups.set(groupKey, [])
      }
      episodeGroups.get(groupKey)!.push(episode)
    }

    // Process each group
    let processedGroups = 0
    for (const [groupKey, groupEpisodes] of episodeGroups) {
      processedGroups++
      
      if (groupEpisodes.length > 1) {
        console.log(`Processing duplicate group ${processedGroups}/${episodeGroups.size}: ${groupKey} (${groupEpisodes.length} duplicates)`)
        await this.mergeDuplicateEpisodes(groupEpisodes)
        this.stats.duplicatesFound += groupEpisodes.length - 1
      } else {
        // Single episode, just add natural key if missing
        const episode = groupEpisodes[0]
        if (!episode.naturalKey) {
          await this.addNaturalKeyToEpisode(episode)
        }
      }
      
      if (processedGroups % 100 === 0) {
        console.log(`Processed ${processedGroups}/${episodeGroups.size} groups...`)
      }
    }
    
    console.log('Deduplication complete!')
  }

  private async mergeDuplicateEpisodes(duplicates: Episode[]): Promise<void> {
    // Sort by creation date to keep the oldest one (preserve listening history)
    duplicates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    
    const keepEpisode = duplicates[0]
    const removeEpisodes = duplicates.slice(1)
    
    try {
      // Update the kept episode with natural key and latest information
      await this.updateEpisodeWithLatestInfo(keepEpisode, duplicates)
      this.stats.episodesUpdated++
      
      // Remove duplicate episodes
      for (const episode of removeEpisodes) {
        await this.deleteEpisode(episode)
        this.stats.episodesRemoved++
      }
      
      console.log(`  Merged ${duplicates.length} duplicates for: ${keepEpisode.title}`)
    } catch (error) {
      console.error('Error merging duplicates:', error)
      this.stats.errors++
    }
  }

  private async updateEpisodeWithLatestInfo(keepEpisode: Episode, allDuplicates: Episode[]): Promise<void> {
    // Find the most recent episode for latest information
    const latestEpisode = allDuplicates.reduce((latest, current) => 
      new Date(current.createdAt).getTime() > new Date(latest.createdAt).getTime() ? current : latest
    )
    
    const naturalKey = this.generateNaturalKey(keepEpisode)
    const now = new Date().toISOString()
    
    const params = {
      TableName: EPISODES_TABLE,
      Key: marshall({
        podcastId: keepEpisode.podcastId,
        episodeId: keepEpisode.episodeId,
      }),
      UpdateExpression: 'SET naturalKey = :naturalKey, title = :title, description = :description, audioUrl = :audioUrl, duration = :duration, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':naturalKey': naturalKey,
        ':title': latestEpisode.title,
        ':description': latestEpisode.description,
        ':audioUrl': latestEpisode.audioUrl,
        ':duration': latestEpisode.duration,
        ':updatedAt': now,
      }),
    }

    // Add optional fields if they exist
    if (latestEpisode.imageUrl) {
      params.UpdateExpression += ', imageUrl = :imageUrl'
      params.ExpressionAttributeValues = marshall({
        ...unmarshall(params.ExpressionAttributeValues),
        ':imageUrl': latestEpisode.imageUrl,
      })
    }

    if (latestEpisode.guests && latestEpisode.guests.length > 0) {
      params.UpdateExpression += ', guests = :guests'
      params.ExpressionAttributeValues = marshall({
        ...unmarshall(params.ExpressionAttributeValues),
        ':guests': latestEpisode.guests,
      })
    }

    if (latestEpisode.tags && latestEpisode.tags.length > 0) {
      params.UpdateExpression += ', tags = :tags'
      params.ExpressionAttributeValues = marshall({
        ...unmarshall(params.ExpressionAttributeValues),
        ':tags': latestEpisode.tags,
      })
    }

    await dynamoClient.send(new UpdateItemCommand(params))
  }

  private async addNaturalKeyToEpisode(episode: Episode): Promise<void> {
    const naturalKey = this.generateNaturalKey(episode)
    
    const params = {
      TableName: EPISODES_TABLE,
      Key: marshall({
        podcastId: episode.podcastId,
        episodeId: episode.episodeId,
      }),
      UpdateExpression: 'SET naturalKey = :naturalKey',
      ExpressionAttributeValues: marshall({
        ':naturalKey': naturalKey,
      }),
    }

    await dynamoClient.send(new UpdateItemCommand(params))
  }

  private async deleteEpisode(episode: Episode): Promise<void> {
    const params = {
      TableName: EPISODES_TABLE,
      Key: marshall({
        podcastId: episode.podcastId,
        episodeId: episode.episodeId,
      }),
    }

    await dynamoClient.send(new DeleteItemCommand(params))
  }

  printStats(): void {
    console.log('\n=== Deduplication Statistics ===')
    console.log(`Total episodes scanned: ${this.stats.totalEpisodes}`)
    console.log(`Duplicates found: ${this.stats.duplicatesFound}`)
    console.log(`Episodes removed: ${this.stats.episodesRemoved}`)
    console.log(`Episodes updated: ${this.stats.episodesUpdated}`)
    console.log(`Errors: ${this.stats.errors}`)
    console.log(`Final episode count: ${this.stats.totalEpisodes - this.stats.episodesRemoved}`)
  }
}

async function main() {
  console.log('🚀 Starting episode deduplication migration...')
  
  if (!process.env.EPISODES_TABLE) {
    console.error('❌ EPISODES_TABLE environment variable is required')
    process.exit(1)
  }

  const deduplicator = new EpisodeDeduplicator()
  
  try {
    const episodes = await deduplicator.getAllEpisodes()
    await deduplicator.deduplicateEpisodes(episodes)
    deduplicator.printStats()
    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  main()
}

export { EpisodeDeduplicator }