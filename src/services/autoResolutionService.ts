import { supabase } from '../integrations/supabase/client';

export class AutoResolutionService {
  /**
   * Check and auto-resolve user dependency tickets that have been in that status for 7+ days
   * This should be called by a scheduled job (e.g., daily cron job)
   */
  static async checkAndAutoResolveUserDependencyTickets(): Promise<{ resolved: number; errors: string[] }> {
    const result = { resolved: 0, errors: [] as string[] };
    
    try {
      // Call the database function to auto-resolve tickets
      const { data, error } = await supabase.rpc('auto_resolve_user_dependency_tickets');
      
      if (error) {
        console.error('Error calling auto-resolve function:', error);
        result.errors.push(`Database function error: ${error.message}`);
        return result;
      }
      
      result.resolved = data || 0;
      console.log(`Auto-resolved ${result.resolved} user dependency tickets`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in auto-resolution service:', error);
      result.errors.push(`Service error: ${errorMessage}`);
    }
    
    return result;
  }

  /**
   * Get count of tickets that will be auto-resolved soon (within next 24 hours)
   */
  static async getTicketsAutoResolvingSoon(): Promise<number> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'user_dependency')
        .lt('user_dependency_started_at', sevenDaysAgo.toISOString())
        .eq('deleted', false);
      
      if (error) {
        console.error('Error getting auto-resolving tickets count:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error in getTicketsAutoResolvingSoon:', error);
      return 0;
    }
  }

  /**
   * Get tickets in user dependency status with their dependency start time
   */
  static async getUserDependencyTickets(): Promise<Array<{
    id: string;
    ticketNumber: string;
    userDependencyStartedAt: string;
    daysInDependency: number;
    willAutoResolveIn: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, ticket_number, user_dependency_started_at')
        .eq('status', 'user_dependency')
        .eq('deleted', false)
        .order('user_dependency_started_at', { ascending: true });
      
      if (error) {
        console.error('Error getting user dependency tickets:', error);
        return [];
      }
      
      return (data || []).map(ticket => {
        const startDate = new Date(ticket.user_dependency_started_at);
        const now = new Date();
        const daysInDependency = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const willAutoResolveIn = Math.max(0, 7 - daysInDependency);
        
        return {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          userDependencyStartedAt: ticket.user_dependency_started_at,
          daysInDependency,
          willAutoResolveIn
        };
      });
    } catch (error) {
      console.error('Error in getUserDependencyTickets:', error);
      return [];
    }
  }
}
