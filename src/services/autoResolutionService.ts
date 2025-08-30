import { supabase } from '@/integrations/supabase/client';
import { Issue } from '@/types/issue';
import { toast } from 'sonner';

interface AutoResolutionResult {
  success: boolean;
  ticketsProcessed: number;
  errors: string[];
}

export class AutoResolutionService {
  static async autoResolveUserDependencyTickets(): Promise<AutoResolutionResult> {
    const result: AutoResolutionResult = {
      success: false,
      ticketsProcessed: 0,
      errors: []
    };
    
    try {
      // Call the database function to auto-resolve tickets
      const { data, error } = await supabase.rpc('auto_resolve_user_dependency_tickets' as any);
      
      if (error) {
        console.error('Error calling auto-resolve function:', error);
        result.errors.push(`Database function error: ${error.message}`);
        return result;
      }
      
      result.ticketsProcessed = data || 0;
      result.success = true;
      
      console.log(`✅ Auto-resolved ${result.ticketsProcessed} user dependency tickets`);
      
      if (result.ticketsProcessed > 0) {
        toast.success(`Auto-resolved ${result.ticketsProcessed} tickets that were in user dependency for more than 7 days`);
      } else {
        toast.info('No tickets found that need auto-resolution');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error in autoResolveUserDependencyTickets:', error);
      result.errors.push(`Service error: ${error}`);
      return result;
    }
  }

  static async getTicketsPendingAutoResolution(): Promise<Issue[]> {
    try {
      console.log('🔍 Getting tickets pending auto-resolution...');
      
      // Get tickets in user_dependency status (user_dependency_started_at column may not exist yet)
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'user_dependency')
        .eq('deleted', false) as any;

      if (error) {
        console.error('❌ Error fetching tickets pending auto-resolution:', error);
        return [];
      }
      
      return (data || []).map((ticket: any) => {
        const submittedDate = new Date(ticket.submitted_at);
        const now = new Date();
        const daysInDependency = Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
        const willAutoResolveIn = Math.max(0, 7 - daysInDependency);
        
        return {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          status: ticket.status as Issue['status'],
          issueDescription: ticket.issue_description,
          city: ticket.city,
          centreCode: ticket.centre_code,
          severity: ticket.severity as Issue['severity'],
          submittedAt: submittedDate,
          // Additional info for display
          daysInDependency,
          willAutoResolveIn
        } as Issue & { daysInDependency: number; willAutoResolveIn: number };
      });
    } catch (error) {
      console.error('❌ Error in getTicketsPendingAutoResolution:', error);
      return [];
    }
  }

  static async checkSystemHealth(): Promise<{
    databaseConnected: boolean;
    functionsAvailable: boolean;
    errors: string[];
  }> {
    const health = {
      databaseConnected: false,
      functionsAvailable: false,
      errors: [] as string[]
    };

    try {
      // Test database connection
      const { data, error } = await supabase.from('tickets').select('id').limit(1);
      if (error) {
        health.errors.push(`Database error: ${error.message}`);
      } else {
        health.databaseConnected = true;
      }

      // Test function availability
      const { error: funcError } = await supabase.rpc('auto_resolve_user_dependency_tickets' as any);
      if (funcError && !funcError.message.includes('no rows')) {
        health.errors.push(`Function error: ${funcError.message}`);
      } else {
        health.functionsAvailable = true;
      }
    } catch (error) {
      health.errors.push(`System error: ${error}`);
    }

    return health;
  }
}