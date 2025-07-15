// Test script for the refresh endpoint
// This can be pasted into the browser console on the Rewind app

window.testRefreshEndpoint = async function testRefreshEndpoint() {
  console.log('Testing refresh endpoint...')

  try {
    // Replace with actual episode and podcast IDs from your app
    const testData = {
      episodeId: '3b5d8b9b-4a6f-4e2d-8c1b-2f3a4b5c6d7e',
      podcastId: '1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b',
    }

    const response = await fetch('https://bds33eqtv5.execute-api.us-east-1.amazonaws.com/prod/episodes/refresh-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('idToken') || 'your-token-here'}`,
      },
      body: JSON.stringify(testData),
    })

    const result = await response.json()
    console.log('Response:', result)

    if (response.ok) {
      console.log('✅ Refresh endpoint is working!')
    } else {
      console.log('❌ Refresh endpoint returned an error:', result)
    }
  } catch (error) {
    console.error('❌ Error calling refresh endpoint:', error)
  }
}

// Instructions:
// 1. Open the Rewind app in your browser
// 2. Make sure you're logged in
// 3. Open the browser console (F12)
// 4. Copy and paste this entire script
// 5. Run: testRefreshEndpoint()

console.log('Test script loaded. Run testRefreshEndpoint() to test the refresh endpoint.')
