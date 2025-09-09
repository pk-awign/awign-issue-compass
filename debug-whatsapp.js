// Debug script to test WhatsApp API
import fetch from 'node-fetch';

async function testWhatsAppAPI() {
  const WHATSAPP_CONFIG = {
    API_URL: 'https://waba-v2.360dialog.io/messages',
    API_KEY: process.env.WHATSAPP_API_KEY,
    NAMESPACE: process.env.WHATSAPP_NAMESPACE,
    TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME
  };

  // Check if required environment variables are set
  if (!WHATSAPP_CONFIG.API_KEY || !WHATSAPP_CONFIG.NAMESPACE || !WHATSAPP_CONFIG.TEMPLATE_NAME) {
    console.error('❌ Missing required environment variables:');
    console.error('   WHATSAPP_API_KEY:', WHATSAPP_CONFIG.API_KEY ? '✅ Set' : '❌ Missing');
    console.error('   WHATSAPP_NAMESPACE:', WHATSAPP_CONFIG.NAMESPACE ? '✅ Set' : '❌ Missing');
    console.error('   WHATSAPP_TEMPLATE_NAME:', WHATSAPP_CONFIG.TEMPLATE_NAME ? '✅ Set' : '❌ Missing');
    console.error('Please set these environment variables before running the test.');
    return;
  }

  // Test message matching your curl format
  const testMessage = {
    to: '917060700600', // Using the number from your curl
    type: 'template',
    messaging_product: 'whatsapp',
    template: {
      namespace: WHATSAPP_CONFIG.NAMESPACE,
      language: {
        policy: 'deterministic',
        code: 'en'
      },
      name: WHATSAPP_CONFIG.TEMPLATE_NAME,
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: 'Pulkit'
            },
            {
              type: 'text',
              text: 'TEST123'
            },
            {
              type: 'text',
              text: 'https://awign-invigilation-escalation.netlify.app/track?id=TEST123'
            }
          ]
        }
      ]
    }
  };

  console.log('Testing WhatsApp API with config:', {
    API_KEY: WHATSAPP_CONFIG.API_KEY.substring(0, 8) + '...',
    NAMESPACE: WHATSAPP_CONFIG.NAMESPACE,
    TEMPLATE: WHATSAPP_CONFIG.TEMPLATE_NAME
  });

  console.log('Sending message:', JSON.stringify(testMessage, null, 2));

  try {
    const response = await fetch(WHATSAPP_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'D360-API-KEY': WHATSAPP_CONFIG.API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });

    const result = await response.json();

    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ WhatsApp API test successful!');
    } else {
      console.log('❌ WhatsApp API test failed!');
      console.log('Error details:', result);
    }

  } catch (error) {
    console.error('❌ Error testing WhatsApp API:', error);
  }
}

testWhatsAppAPI(); 