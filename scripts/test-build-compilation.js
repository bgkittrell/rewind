#!/usr/bin/env node

/**
 * TypeScript Compilation Test
 * Tests that TypeScript can compile without errors across all packages
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🔧 Testing TypeScript compilation...\n')

const packages = [
  { name: 'Frontend', dir: 'frontend', command: 'tsc', args: ['--noEmit'] },
  { name: 'Backend', dir: 'backend', command: 'tsc', args: ['--noEmit'] },
  { name: 'Infrastructure', dir: 'infra', command: 'tsc', args: ['--noEmit'] }
]

async function testCompilation(pkg) {
  return new Promise((resolve) => {
    console.log(`📦 Testing ${pkg.name} compilation...`)
    
    const child = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, '..', pkg.dir),
      stdio: 'pipe'
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`  ✅ ${pkg.name} compilation successful`)
        resolve({ success: true, package: pkg.name })
      } else {
        console.log(`  ❌ ${pkg.name} compilation failed`)
        if (stderr) {
          console.log(`  Error: ${stderr.substring(0, 200)}...`)
        }
        resolve({ success: false, package: pkg.name, error: stderr })
      }
    })

    // Set timeout for compilation
    setTimeout(() => {
      child.kill()
      console.log(`  ⏰ ${pkg.name} compilation timed out`)
      resolve({ success: false, package: pkg.name, error: 'Timeout' })
    }, 60000) // 60 seconds timeout
  })
}

async function runAllTests() {
  const results = []
  
  for (const pkg of packages) {
    const result = await testCompilation(pkg)
    results.push(result)
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 COMPILATION TEST RESULTS')
  console.log('='.repeat(50))

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)

  if (failed > 0) {
    console.log('\nFailed packages:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.package}: ${r.error || 'Unknown error'}`)
    })
  }

  if (failed === 0) {
    console.log('\n🎉 All TypeScript compilation tests passed!')
    process.exit(0)
  } else {
    console.log(`\n⚠️  ${failed} compilation tests failed.`)
    process.exit(1)
  }
}

runAllTests().catch(error => {
  console.error('💥 Test runner error:', error)
  process.exit(1)
})