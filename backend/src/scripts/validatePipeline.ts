#!/usr/bin/env node
import { validateGuestExtractionPipeline } from '../utils/guestExtractionValidation'

/**
 * Production validation script for guest extraction pipeline
 * Usage: npm run validate-pipeline
 */
async function main() {
  console.log('🔍 Starting Guest Extraction Pipeline Validation')
  console.log('='.repeat(60))

  try {
    const report = await validateGuestExtractionPipeline()

    console.log('\n📊 VALIDATION REPORT')
    console.log('='.repeat(60))
    console.log(`Test ID: ${report.testId}`)
    console.log(`Timestamp: ${report.timestamp}`)
    console.log(`Episode ID: ${report.episodeId}`)
    console.log(`Duration: ${report.durationMs}ms`)
    console.log(`Overall Success: ${report.overallSuccess ? '✅' : '❌'}`)
    console.log(`Completed Steps: ${report.completedSteps}/${report.totalSteps}`)

    console.log('\n🔍 STEP-BY-STEP RESULTS')
    console.log('='.repeat(60))

    report.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌'
      console.log(`${icon} Step ${index + 1}: ${result.step}`)
      console.log(`   Message: ${result.message}`)
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`)
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      console.log(`   Timestamp: ${result.timestamp}`)
      console.log('')
    })

    if (report.overallSuccess) {
      console.log('🎉 VALIDATION SUCCESSFUL - Guest extraction pipeline is operational!')
      process.exit(0)
    } else {
      console.log('💥 VALIDATION FAILED - Guest extraction pipeline has issues!')
      process.exit(1)
    }
  } catch (error) {
    console.error('💥 VALIDATION SCRIPT ERROR:', error)
    process.exit(1)
  }
}

main().catch(console.error)
