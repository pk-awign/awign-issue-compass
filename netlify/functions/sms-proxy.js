const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// SMS API Configuration
const SMS_CONFIG = {
  API_URL: 'https://core-api.awign.com/api/v1/sms/to_number',
  ACCESS_TOKEN: process.env.VITE_SMS_ACCESS_TOKEN,
  CLIENT: process.env.VITE_SMS_CLIENT,
  UID: process.env.VITE_SMS_UID,
  CLIENT_ID: process.env.VITE_SMS_CLIENT_ID || 'core',
  SENDER_ID: process.env.VITE_SMS_SENDER_ID || 'IAWIGN',
  CHANNEL: process.env.VITE_SMS_CHANNEL || 'telspiel',
  TICKET_CREATION_TEMPLATE_ID: process.env.VITE_SMS_TICKET_CREATION_TEMPLATE_ID,
  TICKET_UPDATE_TEMPLATE_ID: process.env.VITE_SMS_TICKET_UPDATE_TEMPLATE_ID
};

// Validate required environment variables
if (!SMS_CONFIG.ACCESS_TOKEN || !SMS_CONFIG.CLIENT || !SMS_CONFIG.UID || 
    !SMS_CONFIG.TICKET_CREATION_TEMPLATE_ID || !SMS_CONFIG.TICKET_UPDATE_TEMPLATE_ID) {
  console.error('❌ Missing required SMS environment variables');
}

exports.handler = async (event, context) => {
  // Handle CORS preflight request
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
    const { action, data } = JSON.parse(event.body);

    console.log('📱 [SMS PROXY] Received request:', { action, data });

    if (action === 'sendTicketCreationNotification') {
      return await sendTicketCreationSMS(data);
    } else if (action === 'sendTicketUpdateNotification') {
      return await sendTicketUpdateSMS(data);
    } else if (action === 'testSMS') {
      return await testSMS(data);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    }

  } catch (error) {
    console.error('❌ [SMS PROXY] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};

async function sendTicketCreationSMS(data) {
  try {
    const { mobileNumber, name, ticketNumber, ticketLink } = data;

    const messageData = {
      sms: {
        mobile_number: mobileNumber,
        template_id: SMS_CONFIG.TICKET_CREATION_TEMPLATE_ID,
        message: `Hi ${name},
Your ticket has been raised.

- Ticket Number: ${ticketNumber}
- Tracking Link: ${ticketLink}

Escalation Portal -Awign`,
        sender_id: SMS_CONFIG.SENDER_ID,
        channel: SMS_CONFIG.CHANNEL
      }
    };

    console.log('📱 [SMS PROXY] Sending ticket creation SMS:', {
      mobile_number: mobileNumber,
      template_id: SMS_CONFIG.TICKET_CREATION_TEMPLATE_ID,
      sender_id: SMS_CONFIG.SENDER_ID
    });

    const response = await fetch(SMS_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': SMS_CONFIG.ACCESS_TOKEN,
        'client': SMS_CONFIG.CLIENT,
        'uid': SMS_CONFIG.UID,
        'X-CLIENT_ID': SMS_CONFIG.CLIENT_ID
      },
      body: JSON.stringify(messageData)
    });

    const result = await response.json();

    console.log('📱 [SMS PROXY] SMS API response:', {
      status: response.status,
      ok: response.ok,
      result: result
    });

    return {
      statusCode: response.ok ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: response.ok,
        result: result
      })
    };

  } catch (error) {
    console.error('❌ [SMS PROXY] Error sending ticket creation SMS:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

async function sendTicketUpdateSMS(data) {
  try {
    const { mobileNumber, name, ticketNumber, ticketLink } = data;

    const messageData = {
      sms: {
        mobile_number: mobileNumber,
        template_id: SMS_CONFIG.TICKET_UPDATE_TEMPLATE_ID,
        message: `Hi ${name},
There has been an update on your ticket.

- Ticket Number: ${ticketNumber}
- Track the update here - ${ticketLink}

Escalation Portal -Awign`,
        sender_id: SMS_CONFIG.SENDER_ID,
        channel: SMS_CONFIG.CHANNEL
      }
    };

    console.log('📱 [SMS PROXY] Sending ticket update SMS:', {
      mobile_number: mobileNumber,
      template_id: SMS_CONFIG.TICKET_UPDATE_TEMPLATE_ID,
      sender_id: SMS_CONFIG.SENDER_ID
    });

    const response = await fetch(SMS_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': SMS_CONFIG.ACCESS_TOKEN,
        'client': SMS_CONFIG.CLIENT,
        'uid': SMS_CONFIG.UID,
        'X-CLIENT_ID': SMS_CONFIG.CLIENT_ID
      },
      body: JSON.stringify(messageData)
    });

    const result = await response.json();

    console.log('📱 [SMS PROXY] SMS API response:', {
      status: response.status,
      ok: response.ok,
      result: result
    });

    return {
      statusCode: response.ok ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: response.ok,
        result: result
      })
    };

  } catch (error) {
    console.error('❌ [SMS PROXY] Error sending ticket update SMS:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

async function testSMS(data) {
  try {
    const { mobileNumber } = data;

    const messageData = {
      sms: {
        mobile_number: mobileNumber,
        template_id: SMS_CONFIG.TICKET_CREATION_TEMPLATE_ID,
        message: `Hi Test User,
Your ticket has been raised.

- Ticket Number: TEST123
- Tracking Link: https://awign-invigilation-escalation.netlify.app/track?id=TEST123

Escalation Portal -Awign`,
        sender_id: SMS_CONFIG.SENDER_ID,
        channel: SMS_CONFIG.CHANNEL
      }
    };

    console.log('📱 [SMS PROXY] Testing SMS:', {
      mobile_number: mobileNumber,
      template_id: SMS_CONFIG.TICKET_CREATION_TEMPLATE_ID,
      sender_id: SMS_CONFIG.SENDER_ID
    });

    const response = await fetch(SMS_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': SMS_CONFIG.ACCESS_TOKEN,
        'client': SMS_CONFIG.CLIENT,
        'uid': SMS_CONFIG.UID,
        'X-CLIENT_ID': SMS_CONFIG.CLIENT_ID
      },
      body: JSON.stringify(messageData)
    });

    const result = await response.json();

    console.log('📱 [SMS PROXY] Test SMS API response:', {
      status: response.status,
      ok: response.ok,
      result: result
    });

    return {
      statusCode: response.ok ? 200 : 400,
      headers,
      body: JSON.stringify({
        success: response.ok,
        result: result
      })
    };

  } catch (error) {
    console.error('❌ [SMS PROXY] Error testing SMS:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}
