const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { action, data } = body;

    // WhatsApp API Configuration
    const WHATSAPP_CONFIG = {
      API_URL: 'https://waba-v2.360dialog.io/messages',
      API_KEY: 'oa6EI0d9qZ4Pm1EKTYrLmHNrAK', // Test API key
      NAMESPACE: '9f732540_5143_4e51_bfc2_36cab955cd7f', // Test namespace
      TEMPLATE_NAME: 'myl_supply_initial_1' // Test template
    };

    if (action === 'sendMessage') {
      // Send WhatsApp message
      const response = await fetch(WHATSAPP_CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'D360-API-KEY': WHATSAPP_CONFIG.API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: response.ok,
          data: result,
          status: response.status
        })
      };
    }

    if (action === 'testConnection') {
      // Test connection with dummy data
      const testMessage = {
        to: '919999999999',
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
                { type: 'text', text: 'Test' },
                { type: 'text', text: 'Test' },
                { type: 'text', text: 'Test' },
                { type: 'text', text: 'https://example.com' }
              ]
            }
          ]
        }
      };

      const response = await fetch(WHATSAPP_CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'D360-API-KEY': WHATSAPP_CONFIG.API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage)
      });

      const result = await response.json();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          connected: response.ok || result.error?.code === 'invalid_phone_number',
          data: result,
          status: response.status
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' })
    };

  } catch (error) {
    console.error('WhatsApp proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}; 