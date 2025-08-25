const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Verify the request is from an authorized source (you can add more security here)
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // You can add additional token validation here
  // For now, we'll use a simple environment variable check
  if (token !== process.env.AUTO_RESOLVE_SECRET) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid token' })
    };
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the auto-resolve function
    const { data, error } = await supabase.rpc('auto_resolve_user_dependency_tickets');
    
    if (error) {
      console.error('Error calling auto-resolve function:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Database function error', 
          details: error.message 
        })
      };
    }

    const resolvedCount = data || 0;
    
    console.log(`Auto-resolved ${resolvedCount} user dependency tickets`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        resolved: resolvedCount,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error in auto-resolve function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
