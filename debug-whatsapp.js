// Debug script to test WhatsApp API
import fetch from 'node-fetch';

async function testWhatsAppAPI() {
  const WHATSAPP_CONFIG = {
    API_URL: 'https://waba-v2.360dialog.io/messages',
    API_KEY: 'mOxReSysI12sL3CQIBQRVJyuAK',
    NAMESPACE: '74a67158_77ff_47a7_a86e_3b004a21d236',
    TEMPLATE_NAME: 'ticke_raised_test'
  };

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
              text: 'https://awign-invigilation-escalation.netlify.app/track/TEST123'
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