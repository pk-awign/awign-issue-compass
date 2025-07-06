import fetch from 'node-fetch';

export const handler = async function(event, context) {
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
      API_KEY: process.env.WHATSAPP_API_KEY || 'mOxReSysI12sL3CQIBQRVJyuAK', // Use environment variable
      NAMESPACE: process.env.WHATSAPP_NAMESPACE || '74a67158_77ff_47a7_a86e_3b004a21d236', // Use environment variable
      TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME || 'ticke_raised_test', // Use environment variable
      TICKET_CREATION_TEMPLATE: process.env.WHATSAPP_TEMPLATE_NAME || 'ticke_raised_test' // Use same template name for ticket creation
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

    if (action === 'sendTicketCreationNotification') {
      // Send ticket creation notification
      const { ticketData, phoneNumber } = data;
      
      const messageData = {
        to: phoneNumber,
        type: 'template',
        messaging_product: 'whatsapp',
        template: {
          namespace: WHATSAPP_CONFIG.NAMESPACE,
          language: {
            policy: 'deterministic',
            code: 'en'
          },
          name: WHATSAPP_CONFIG.TICKET_CREATION_TEMPLATE,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: ticketData.submittedBy }, // This will be Name from Google Sheet
                { type: 'text', text: ticketData.ticketNumber },
                { type: 'text', text: ticketData.ticketLink }
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
        body: JSON.stringify(messageData)
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
                { type: 'text', text: 'Test User' },
                { type: 'text', text: 'TEST123' },
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

      console.log('WhatsApp API test response:', {
        status: response.status,
        ok: response.ok,
        result: result,
        config: {
          namespace: WHATSAPP_CONFIG.NAMESPACE,
          template: WHATSAPP_CONFIG.TEMPLATE_NAME,
          apiKey: WHATSAPP_CONFIG.API_KEY.substring(0, 8) + '...'
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          connected: response.ok || result.error?.code === 'invalid_phone_number',
          data: result,
          status: response.status,
          config: {
            namespace: WHATSAPP_CONFIG.NAMESPACE,
            template: WHATSAPP_CONFIG.TEMPLATE_NAME
          }
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