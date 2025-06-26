
import { supabase } from '@/integrations/supabase/client';
import { createRandomTickets } from './sampleTickets';

export async function initializeSampleData() {
  console.log('🎯 Checking if sample data initialization is needed...');
  
  try {
    // Check if there are any existing tickets
    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error checking existing tickets:', error);
      return;
    }
    
    // If no tickets exist, create some sample data
    if (count === 0) {
      console.log('📝 No tickets found, creating sample data...');
      await createRandomTickets(15); // Create 15 sample tickets
      console.log('✅ Sample data initialized successfully!');
    } else {
      console.log(`📊 Found ${count} existing tickets, skipping sample data creation`);
    }
  } catch (error) {
    console.error('❌ Error initializing sample data:', error);
  }
}
