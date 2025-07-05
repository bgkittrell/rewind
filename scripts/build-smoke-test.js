#!/usr/bin/env node

/**
 * Build Smoke Tests for Rewind App
 * Simple script to detect build errors and critical functionality issues
 */

const path = require('path')
const fs = require('fs')

console.log('🔍 Running build smoke tests...\n')

// Test 1: Check that critical files exist
console.log('📁 Testing file structure...')
const criticalFiles = [
  // Frontend files
  'frontend/package.json',
  'frontend/src/main.tsx',
  'frontend/src/services/api.ts',
  'frontend/src/components/Header.tsx',
  'frontend/src/components/EpisodeCard.tsx',
  'frontend/src/routes/home.tsx',
  
  // Backend files
  'backend/package.json',
  'backend/src/handlers/authHandler.ts',
  'backend/src/handlers/episodeHandler.ts',
  'backend/src/handlers/podcastHandler.ts',
  'backend/src/utils/response.ts',
  
  // Infrastructure files
  'infra/package.json',
  'infra/lib/rewind-backend-stack.ts',
]

let fileTestsPassed = 0
let fileTestsFailed = 0

criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file)
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`)
    fileTestsPassed++
  } else {
    console.log(`  ❌ ${file} - MISSING`)
    fileTestsFailed++
  }
})

console.log(`\n📁 File structure: ${fileTestsPassed} passed, ${fileTestsFailed} failed\n`)

// Test 2: Check package.json dependencies
console.log('📦 Testing package dependencies...')

function testPackageJson(packagePath, requiredDeps) {
  try {
    const fullPath = path.join(__dirname, '..', packagePath)
    const packageContent = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
    const allDeps = { ...packageContent.dependencies, ...packageContent.devDependencies }
    
    let passed = 0
    let failed = 0
    
    requiredDeps.forEach(dep => {
      if (allDeps[dep]) {
        console.log(`  ✅ ${dep}`)
        passed++
      } else {
        console.log(`  ❌ ${dep} - MISSING from ${packagePath}`)
        failed++
      }
    })
    
    return { passed, failed }
  } catch (error) {
    console.log(`  ❌ Failed to read ${packagePath}: ${error.message}`)
    return { passed: 0, failed: requiredDeps.length }
  }
}

// Frontend dependencies
console.log('\n  Frontend dependencies:')
const frontendResult = testPackageJson('frontend/package.json', [
  'react',
  'react-dom',
  'react-router',
  'aws-amplify',
  'vitest',
  'typescript'
])

// Backend dependencies
console.log('\n  Backend dependencies:')
const backendResult = testPackageJson('backend/package.json', [
  '@aws-sdk/client-dynamodb',
  '@aws-sdk/client-cognito-identity-provider',
  '@aws-sdk/client-cloudwatch-logs',
  'typescript',
  'vitest'
])

// Infrastructure dependencies
console.log('\n  Infrastructure dependencies:')
const infraResult = testPackageJson('infra/package.json', [
  'aws-cdk-lib',
  'constructs',
  'typescript'
])

const totalDepsPassed = frontendResult.passed + backendResult.passed + infraResult.passed
const totalDepsFailed = frontendResult.failed + backendResult.failed + infraResult.failed

console.log(`\n📦 Dependencies: ${totalDepsPassed} passed, ${totalDepsFailed} failed\n`)

// Test 3: Check TypeScript configuration
console.log('🔧 Testing TypeScript configuration...')

const tsConfigPaths = [
  'frontend/tsconfig.json',
  'backend/tsconfig.json',
  'infra/tsconfig.json'
]

let tsConfigPassed = 0
let tsConfigFailed = 0

tsConfigPaths.forEach(configPath => {
  try {
    const fullPath = path.join(__dirname, '..', configPath)
    const content = fs.readFileSync(fullPath, 'utf8')
    const config = JSON.parse(content)
    
    if (config.compilerOptions && config.compilerOptions.target) {
      console.log(`  ✅ ${configPath}`)
      tsConfigPassed++
    } else {
      console.log(`  ❌ ${configPath} - Invalid configuration`)
      tsConfigFailed++
    }
  } catch (error) {
    console.log(`  ❌ ${configPath} - ${error.message}`)
    tsConfigFailed++
  }
})

console.log(`\n🔧 TypeScript configs: ${tsConfigPassed} passed, ${tsConfigFailed} failed\n`)

// Test 4: Check environment configuration
console.log('🌍 Testing environment configuration...')

const envFiles = [
  'frontend/.env.example',
  'frontend/src/vite-env.d.ts'
]

let envTestsPassed = 0
let envTestsFailed = 0

envFiles.forEach(envFile => {
  const fullPath = path.join(__dirname, '..', envFile)
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${envFile}`)
    envTestsPassed++
  } else {
    console.log(`  ❌ ${envFile} - MISSING`)
    envTestsFailed++
  }
})

// Check vite-env.d.ts has required interface
try {
  const viteEnvPath = path.join(__dirname, '..', 'frontend/src/vite-env.d.ts')
  const viteEnvContent = fs.readFileSync(viteEnvPath, 'utf8')
  
  if (viteEnvContent.includes('ImportMetaEnv') && viteEnvContent.includes('VITE_API_BASE_URL')) {
    console.log(`  ✅ vite-env.d.ts has proper type definitions`)
    envTestsPassed++
  } else {
    console.log(`  ❌ vite-env.d.ts missing required type definitions`)
    envTestsFailed++
  }
} catch (error) {
  console.log(`  ❌ Failed to validate vite-env.d.ts: ${error.message}`)
  envTestsFailed++
}

console.log(`\n🌍 Environment: ${envTestsPassed} passed, ${envTestsFailed} failed\n`)

// Test 5: Check build scripts
console.log('🔨 Testing build scripts...')

const buildScripts = [
  { package: 'frontend/package.json', script: 'build' },
  { package: 'backend/package.json', script: 'build' },
  { package: 'infra/package.json', script: 'build' }
]

let buildScriptsPassed = 0
let buildScriptsFailed = 0

buildScripts.forEach(({ package: pkg, script }) => {
  try {
    const fullPath = path.join(__dirname, '..', pkg)
    const packageContent = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
    
    if (packageContent.scripts && packageContent.scripts[script]) {
      console.log(`  ✅ ${pkg} has ${script} script`)
      buildScriptsPassed++
    } else {
      console.log(`  ❌ ${pkg} missing ${script} script`)
      buildScriptsFailed++
    }
  } catch (error) {
    console.log(`  ❌ Failed to check ${pkg}: ${error.message}`)
    buildScriptsFailed++
  }
})

console.log(`\n🔨 Build scripts: ${buildScriptsPassed} passed, ${buildScriptsFailed} failed\n`)

// Summary
const totalPassed = fileTestsPassed + totalDepsPassed + tsConfigPassed + envTestsPassed + buildScriptsPassed
const totalFailed = fileTestsFailed + totalDepsFailed + tsConfigFailed + envTestsFailed + buildScriptsFailed

console.log('=' * 50)
console.log('📊 SMOKE TEST RESULTS')
console.log('=' * 50)
console.log(`✅ Total Passed: ${totalPassed}`)
console.log(`❌ Total Failed: ${totalFailed}`)

if (totalFailed === 0) {
  console.log('\n🎉 All smoke tests passed! Build looks healthy.')
  process.exit(0)
} else {
  console.log(`\n⚠️  ${totalFailed} tests failed. Please review the issues above.`)
  process.exit(1)
}