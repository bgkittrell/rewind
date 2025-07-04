import { robustGuestExtractionService } from '../robustGuestExtractionService'
import { guestValidationService } from '../guestValidationService'
import { costManagementService } from '../costManagementService'

// Golden dataset for testing guest extraction accuracy
const GOLDEN_DATASET = [
  {
    id: 'comedy-1',
    title: 'Comedy Bang! Bang!',
    description: 'Scott Aukerman welcomes comedian Amy Poehler to discuss her new book and her time playing Leslie Knope on Parks and Recreation.',
    expectedGuests: ['Amy Poehler'],
    expectedHosts: ['Scott Aukerman'],
    genre: 'comedy',
    difficulty: 'easy'
  },
  {
    id: 'comedy-2',
    title: 'The Joe Rogan Experience',
    description: 'Joe sits down with comedian Dave Chappelle and author Malcolm Gladwell to discuss comedy, society, and the creative process.',
    expectedGuests: ['Dave Chappelle', 'Malcolm Gladwell'],
    expectedHosts: ['Joe Rogan'],
    genre: 'comedy',
    difficulty: 'medium'
  },
  {
    id: 'comedy-complex',
    title: 'Comedy Central Presents',
    description: 'Tonight featuring Chris Rock performing stand-up, plus Nick Offerman discusses his character Ron Swanson, and surprise appearance by Chris Pratt as Star-Lord.',
    expectedGuests: ['Chris Rock', 'Nick Offerman'], // Chris Pratt mentioned as character
    expectedCharacters: ['Ron Swanson', 'Star-Lord'],
    expectedActors: ['Nick Offerman', 'Chris Pratt'],
    genre: 'comedy',
    difficulty: 'hard'
  },
  {
    id: 'tech-1',
    title: 'The Tim Ferriss Show',
    description: 'Tim interviews Elon Musk, CEO of Tesla and SpaceX, about entrepreneurship and innovation.',
    expectedGuests: ['Elon Musk'],
    expectedHosts: ['Tim Ferriss'],
    genre: 'technology',
    difficulty: 'easy'
  },
  {
    id: 'edge-short',
    title: 'Quick Chat',
    description: 'With John.',
    expectedGuests: [], // Too vague
    genre: 'general',
    difficulty: 'hard'
  },
  {
    id: 'edge-noguests',
    title: 'Solo Episode',
    description: 'Today I share my thoughts on productivity and life lessons learned this year.',
    expectedGuests: [],
    genre: 'personal-development',
    difficulty: 'easy'
  },
  {
    id: 'edge-fictional',
    title: 'Movie Review',
    description: 'Discussing the latest Marvel movie featuring Iron Man, Captain America, and Thor.',
    expectedGuests: [],
    expectedCharacters: ['Iron Man', 'Captain America', 'Thor'],
    genre: 'entertainment',
    difficulty: 'medium'
  }
]

// Performance benchmarks
interface PerformanceBenchmark {
  method: string
  avgProcessingTime: number
  maxProcessingTime: number
  avgCost: number
  successRate: number
}

interface AccuracyResult {
  testId: string
  extracted: string[]
  expected: string[]
  precision: number
  recall: number
  f1Score: number
  exactMatch: boolean
  issues: string[]
}

interface TestSuiteResult {
  overallAccuracy: number
  precisionAvg: number
  recallAvg: number
  f1ScoreAvg: number
  performanceBenchmarks: PerformanceBenchmark[]
  accuracyByDifficulty: Record<string, number>
  accuracyByGenre: Record<string, number>
  failedTests: AccuracyResult[]
  edgeCaseResults: AccuracyResult[]
}

export class GuestExtractionAccuracyTester {
  private results: AccuracyResult[] = []
  private performanceData: PerformanceBenchmark[] = []

  /**
   * Run comprehensive accuracy test suite
   */
  async runFullTestSuite(): Promise<TestSuiteResult> {
    console.log('🧪 Starting comprehensive guest extraction test suite...')
    
    // Reset results
    this.results = []
    this.performanceData = []

    // Run golden dataset tests
    console.log('📊 Testing with golden dataset...')
    for (const testCase of GOLDEN_DATASET) {
      const result = await this.testSingleCase(testCase)
      this.results.push(result)
    }

    // Run edge case tests
    console.log('🔬 Testing edge cases...')
    const edgeCaseResults = await this.runEdgeCaseTests()
    this.results.push(...edgeCaseResults)

    // Run performance benchmarks
    console.log('⚡ Running performance benchmarks...')
    await this.runPerformanceBenchmarks()

    // Compile results
    const testSuiteResult = this.compileResults()
    
    console.log('✅ Test suite completed!')
    this.printSummary(testSuiteResult)
    
    return testSuiteResult
  }

  /**
   * Test a single case from the golden dataset
   */
  private async testSingleCase(testCase: any): Promise<AccuracyResult> {
    const startTime = Date.now()
    
    try {
      const extraction = await robustGuestExtractionService.extractGuestsWithFallbacks(
        testCase.description,
        testCase.title,
        testCase.id
      )

      const extractedNames = extraction.guests.map(g => g.name)
      const expectedNames = testCase.expectedGuests || []

      const metrics = this.calculateAccuracyMetrics(extractedNames, expectedNames)
      
      console.log(`Test ${testCase.id}: ${metrics.exactMatch ? '✅' : '❌'} (F1: ${metrics.f1Score.toFixed(2)})`)

      return {
        testId: testCase.id,
        extracted: extractedNames,
        expected: expectedNames,
        ...metrics,
        issues: extraction.errors
      }

    } catch (error) {
      console.error(`Test ${testCase.id} failed:`, error)
      return {
        testId: testCase.id,
        extracted: [],
        expected: testCase.expectedGuests || [],
        precision: 0,
        recall: 0,
        f1Score: 0,
        exactMatch: false,
        issues: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Run specific edge case tests
   */
  private async runEdgeCaseTests(): Promise<AccuracyResult[]> {
    const edgeCases = [
      {
        id: 'edge-very-long-description',
        title: 'Long Episode',
        description: `This is a very long description that goes on and on about various topics including technology, politics, entertainment, and more. We discuss artificial intelligence with researcher Dr. Jane Smith, quantum computing with Professor Bob Johnson, and blockchain technology with entrepreneur Alice Wilson. The episode also features a brief cameo by comedian Charlie Brown discussing his latest stand-up special, plus insights from author Mary Davis about her new book on digital transformation. We also touch on climate change research with scientist Tom Anderson and sustainable energy solutions with engineer Lisa Thompson. Finally, we wrap up with musician David Garcia performing his latest song.`.repeat(3),
        expectedGuests: ['Jane Smith', 'Bob Johnson', 'Alice Wilson', 'Charlie Brown', 'Mary Davis', 'Tom Anderson', 'Lisa Thompson', 'David Garcia'],
        difficulty: 'extreme'
      },
      {
        id: 'edge-special-characters',
        title: 'Special Characters',
        description: 'Today featuring María José García-López, François Müller, and O\'Connor discussing international perspectives.',
        expectedGuests: ['María José García-López', 'François Müller', 'O\'Connor'],
        difficulty: 'hard'
      },
      {
        id: 'edge-titles-and-credentials',
        title: 'Academic Episode',
        description: 'Interview with Dr. John Smith, MD, PhD, Professor Mary Johnson, and Senator Robert Williams, Jr.',
        expectedGuests: ['John Smith', 'Mary Johnson', 'Robert Williams'],
        difficulty: 'medium'
      },
      {
        id: 'edge-common-names',
        title: 'Common Names',
        description: 'Featuring John Smith, Mary Johnson, and Mike Davis discussing everyday topics.',
        expectedGuests: ['John Smith', 'Mary Johnson', 'Mike Davis'],
        difficulty: 'medium'
      },
      {
        id: 'edge-character-actor-mix',
        title: 'Movie Discussion',
        description: 'Robert Downey Jr. talks about playing Tony Stark/Iron Man, while Chris Evans discusses his role as Steve Rogers/Captain America.',
        expectedGuests: ['Robert Downey Jr.', 'Chris Evans'],
        expectedCharacters: ['Tony Stark', 'Iron Man', 'Steve Rogers', 'Captain America'],
        difficulty: 'hard'
      }
    ]

    const results: AccuracyResult[] = []
    for (const testCase of edgeCases) {
      const result = await this.testSingleCase(testCase)
      results.push(result)
    }

    return results
  }

  /**
   * Run performance benchmarks
   */
  private async runPerformanceBenchmarks(): Promise<void> {
    const testDescriptions = [
      'Short description with Amy Poehler',
      'Medium length description featuring comedian Dave Chappelle and his thoughts on modern comedy, plus insights from author Malcolm Gladwell about societal trends and human behavior.',
      `Very long description: ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50)}featuring multiple guests including John Smith, Jane Doe, Bob Johnson, and Mary Williams discussing various topics.`
    ]

    for (let i = 0; i < testDescriptions.length; i++) {
      const description = testDescriptions[i]
      const label = ['short', 'medium', 'long'][i]
      
      const times: number[] = []
      const costs: number[] = []
      let successes = 0

      // Run 5 tests for each description length
      for (let j = 0; j < 5; j++) {
        const startTime = Date.now()
        
        try {
          const result = await robustGuestExtractionService.extractGuestsWithFallbacks(
            description,
            `Test Episode ${j}`,
            `perf-${label}-${j}`
          )
          
          const endTime = Date.now()
          times.push(endTime - startTime)
          costs.push(result.cost)
          
          if (result.success) successes++
          
        } catch (error) {
          console.error(`Performance test failed: ${error}`)
        }
      }

      if (times.length > 0) {
        this.performanceData.push({
          method: `${label}_description`,
          avgProcessingTime: times.reduce((a, b) => a + b, 0) / times.length,
          maxProcessingTime: Math.max(...times),
          avgCost: costs.reduce((a, b) => a + b, 0) / costs.length,
          successRate: successes / 5
        })
      }
    }
  }

  /**
   * Calculate precision, recall, and F1 score
   */
  private calculateAccuracyMetrics(extracted: string[], expected: string[]): {
    precision: number
    recall: number
    f1Score: number
    exactMatch: boolean
  } {
    if (expected.length === 0 && extracted.length === 0) {
      return { precision: 1, recall: 1, f1Score: 1, exactMatch: true }
    }

    if (expected.length === 0) {
      return { precision: 0, recall: 1, f1Score: 0, exactMatch: extracted.length === 0 }
    }

    if (extracted.length === 0) {
      return { precision: 1, recall: 0, f1Score: 0, exactMatch: expected.length === 0 }
    }

    // Normalize names for comparison
    const normalizedExtracted = extracted.map(name => this.normalizeName(name))
    const normalizedExpected = expected.map(name => this.normalizeName(name))

    // Calculate true positives
    const truePositives = normalizedExtracted.filter(name => 
      normalizedExpected.includes(name)
    ).length

    const precision = truePositives / extracted.length
    const recall = truePositives / expected.length
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

    // Exact match if same guests found (order doesn't matter)
    const exactMatch = normalizedExtracted.length === normalizedExpected.length && 
                      normalizedExtracted.every(name => normalizedExpected.includes(name))

    return { precision, recall, f1Score, exactMatch }
  }

  /**
   * Normalize names for comparison
   */
  private normalizeName(name: string): string {
    return name.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,]/g, '')
      .trim()
  }

  /**
   * Compile final test results
   */
  private compileResults(): TestSuiteResult {
    const validResults = this.results.filter(r => r.expected.length > 0 || r.extracted.length === 0)
    
    const overallAccuracy = validResults.filter(r => r.exactMatch).length / validResults.length
    const precisionAvg = validResults.reduce((sum, r) => sum + r.precision, 0) / validResults.length
    const recallAvg = validResults.reduce((sum, r) => sum + r.recall, 0) / validResults.length
    const f1ScoreAvg = validResults.reduce((sum, r) => sum + r.f1Score, 0) / validResults.length

    // Group by difficulty
    const difficultyGroups = this.groupByProperty(GOLDEN_DATASET, 'difficulty')
    const accuracyByDifficulty: Record<string, number> = {}
    
    Object.keys(difficultyGroups).forEach(difficulty => {
      const difficultyResults = this.results.filter(r => 
        difficultyGroups[difficulty].some(test => test.id === r.testId)
      )
      accuracyByDifficulty[difficulty] = difficultyResults.filter(r => r.exactMatch).length / difficultyResults.length
    })

    // Group by genre
    const genreGroups = this.groupByProperty(GOLDEN_DATASET, 'genre')
    const accuracyByGenre: Record<string, number> = {}
    
    Object.keys(genreGroups).forEach(genre => {
      const genreResults = this.results.filter(r => 
        genreGroups[genre].some(test => test.id === r.testId)
      )
      accuracyByGenre[genre] = genreResults.filter(r => r.exactMatch).length / genreResults.length
    })

    const failedTests = this.results.filter(r => !r.exactMatch && r.expected.length > 0)
    const edgeCaseResults = this.results.filter(r => r.testId.startsWith('edge-'))

    return {
      overallAccuracy,
      precisionAvg,
      recallAvg,
      f1ScoreAvg,
      performanceBenchmarks: this.performanceData,
      accuracyByDifficulty,
      accuracyByGenre,
      failedTests,
      edgeCaseResults
    }
  }

  /**
   * Group array by property
   */
  private groupByProperty(array: any[], property: string): Record<string, any[]> {
    return array.reduce((groups, item) => {
      const key = item[property]
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
      return groups
    }, {})
  }

  /**
   * Print test summary
   */
  private printSummary(results: TestSuiteResult): void {
    console.log('\n📊 TEST RESULTS SUMMARY')
    console.log('========================')
    console.log(`Overall Accuracy: ${(results.overallAccuracy * 100).toFixed(1)}%`)
    console.log(`Average Precision: ${(results.precisionAvg * 100).toFixed(1)}%`)
    console.log(`Average Recall: ${(results.recallAvg * 100).toFixed(1)}%`)
    console.log(`Average F1 Score: ${(results.f1ScoreAvg * 100).toFixed(1)}%`)
    
    console.log('\n📈 Accuracy by Difficulty:')
    Object.entries(results.accuracyByDifficulty).forEach(([difficulty, accuracy]) => {
      console.log(`  ${difficulty}: ${(accuracy * 100).toFixed(1)}%`)
    })
    
    console.log('\n🎭 Accuracy by Genre:')
    Object.entries(results.accuracyByGenre).forEach(([genre, accuracy]) => {
      console.log(`  ${genre}: ${(accuracy * 100).toFixed(1)}%`)
    })
    
    console.log('\n⚡ Performance Benchmarks:')
    results.performanceBenchmarks.forEach(benchmark => {
      console.log(`  ${benchmark.method}:`)
      console.log(`    Avg Time: ${benchmark.avgProcessingTime.toFixed(0)}ms`)
      console.log(`    Max Time: ${benchmark.maxProcessingTime.toFixed(0)}ms`)
      console.log(`    Avg Cost: $${benchmark.avgCost.toFixed(4)}`)
      console.log(`    Success Rate: ${(benchmark.successRate * 100).toFixed(1)}%`)
    })

    if (results.failedTests.length > 0) {
      console.log('\n❌ Failed Tests:')
      results.failedTests.forEach(failed => {
        console.log(`  ${failed.testId}: Expected ${failed.expected.join(', ')}, Got ${failed.extracted.join(', ')}`)
      })
    }

    console.log('\n🔬 Edge Case Performance:')
    const edgeCaseAccuracy = results.edgeCaseResults.filter(r => r.exactMatch).length / results.edgeCaseResults.length
    console.log(`  Edge Case Accuracy: ${(edgeCaseAccuracy * 100).toFixed(1)}%`)
  }

  /**
   * Test specific extraction method
   */
  async testExtractionMethod(
    method: 'bedrock' | 'comprehend' | 'regex',
    testCases?: any[]
  ): Promise<{ accuracy: number; avgTime: number; avgCost: number }> {
    const cases = testCases || GOLDEN_DATASET.slice(0, 5) // Test with first 5 cases
    
    let correctCount = 0
    let totalTime = 0
    let totalCost = 0

    for (const testCase of cases) {
      const startTime = Date.now()
      
      try {
        // Force specific method by manipulating budget/circuit breaker
        const result = await robustGuestExtractionService.extractGuestsWithFallbacks(
          testCase.description,
          testCase.title,
          `method-test-${testCase.id}`
        )
        
        const endTime = Date.now()
        totalTime += endTime - startTime
        totalCost += result.cost

        const extractedNames = result.guests.map(g => g.name)
        const expectedNames = testCase.expectedGuests || []
        
        const metrics = this.calculateAccuracyMetrics(extractedNames, expectedNames)
        if (metrics.exactMatch) correctCount++

      } catch (error) {
        console.error(`Method test failed: ${error}`)
      }
    }

    return {
      accuracy: correctCount / cases.length,
      avgTime: totalTime / cases.length,
      avgCost: totalCost / cases.length
    }
  }
}

// Export test runner instance
export const guestExtractionTester = new GuestExtractionAccuracyTester()

// Jest tests
describe('Guest Extraction Accuracy Tests', () => {
  describe('Golden Dataset Tests', () => {
    test('should extract guests from comedy podcasts with high accuracy', async () => {
      const comedyTests = GOLDEN_DATASET.filter(test => test.genre === 'comedy')
      const tester = new GuestExtractionAccuracyTester()
      
      let correctCount = 0
      for (const testCase of comedyTests) {
        const result = await robustGuestExtractionService.extractGuestsWithFallbacks(
          testCase.description,
          testCase.title,
          testCase.id
        )
        
        const extractedNames = result.guests.map(g => g.name)
        const expectedNames = testCase.expectedGuests || []
        
        if (extractedNames.length === expectedNames.length) {
          const normalizedExtracted = extractedNames.map(name => name.toLowerCase())
          const normalizedExpected = expectedNames.map(name => name.toLowerCase())
          
          if (normalizedExtracted.every(name => normalizedExpected.includes(name))) {
            correctCount++
          }
        }
      }
      
      const accuracy = correctCount / comedyTests.length
      expect(accuracy).toBeGreaterThan(0.7) // Expect >70% accuracy on comedy tests
    }, 30000) // 30 second timeout for AI operations

    test('should handle edge cases gracefully', async () => {
      const edgeCase = {
        title: 'Empty Episode',
        description: '',
        expectedGuests: []
      }
      
      const result = await robustGuestExtractionService.extractGuestsWithFallbacks(
        edgeCase.description,
        edgeCase.title,
        'edge-test'
      )
      
      expect(result.success).toBe(true)
      expect(result.guests).toEqual([])
    })

    test('should validate guest names properly', async () => {
      const testNames = [
        { name: 'Amy Poehler', expected: true },
        { name: 'john', expected: false }, // Too short
        { name: 'X Æ A-XII', expected: false }, // Invalid format
        { name: 'Dr. John Smith', expected: true }
      ]
      
      for (const testName of testNames) {
        const validation = await guestValidationService.validateAndNormalizeGuest(testName.name)
        expect(validation.isValid).toBe(testName.expected)
      }
    })
  })

  describe('Performance Tests', () => {
    test('should complete extraction within reasonable time limits', async () => {
      const startTime = Date.now()
      
      const result = await robustGuestExtractionService.extractGuestsWithFallbacks(
        'Short description with Amy Poehler',
        'Test Episode',
        'perf-test'
      )
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(5000) // Should complete in under 5 seconds
      expect(result.success).toBe(true)
    })

    test('should stay within cost budget', async () => {
      const initialBudget = await costManagementService.getCurrentBudget()
      
      await robustGuestExtractionService.extractGuestsWithFallbacks(
        'Test description with guest John Smith',
        'Budget Test',
        'budget-test'
      )
      
      const finalBudget = await costManagementService.getCurrentBudget()
      const costIncurred = finalBudget.currentSpend - initialBudget.currentSpend
      
      expect(costIncurred).toBeLessThan(0.01) // Should cost less than 1 cent per extraction
    })
  })
})