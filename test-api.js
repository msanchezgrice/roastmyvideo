// Simple test script for the direct-generate API
const fetch = require('node-fetch');

async function testDirectGenerate() {
  try {
    console.log('Sending request to direct-generate API...');
    
    const response = await fetch('http://localhost:3000/api/direct-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrlInput: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Test video
        personas: [
          {
            name: 'TestPerson',
            style: 'Witty and observant',
            constraints: 'Keep it PG',
            backstory: 'A tech enthusiast who loves to comment on videos'
          }
        ],
        speakingPace: 1.0,
        userGuidance: 'Make it funny'
      }),
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error testing direct-generate API:', error);
  }
}

testDirectGenerate(); 