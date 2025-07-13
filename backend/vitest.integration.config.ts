import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 30000,
    environment: 'node',
    env: {
      AWS_ACCESS_KEY_ID: 'test',
      AWS_SECRET_ACCESS_KEY: 'test',
      AWS_DEFAULT_REGION: 'us-east-1',
      LOCALSTACK_ENDPOINT: 'http://localhost:4566',
      NODE_ENV: 'test'
    }
  }
})