import { supabase } from '../integrations/supabase/client';

export class AutoResolutionService {
  /**
   * Check and auto-resolve user dependency tickets that have been in that status for 72+ hours
   * Only closes tickets if the last comment is from an internal person.
   * If user has responded (last comment is external), ticket remains open.
   * This should be called by a scheduled job (e.g., hourly or daily cron job)
   */
  static async checkAndAutoResolveUserDependencyTickets(): Promise<{ resolved: number; errors: string[] }> {
    const result = { resolved: 0, errors: [] as string[] };
    
    try {
      const { data, error } = await supabase.rpc('auto_resolve_user_dependency_tickets');
      
      if (error) {
        console.error('Error calling auto-resolve function:', error);
        result.errors.push(`Database error: ${error.message}`);
        return result;
      }
      
      result.resolved = data || 0;
      console.log(`Auto-resolved ${result.resolved} user dependency tickets`);
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in auto-resolution service:', error);
      result.errors.push(`Service error: ${errorMessage}`);
    }
    
    return result;
  }

  /**
   * One-time cleanup function for past tickets in user_dependency status
   * Closes all tickets that have been in user_dependency for more than 72 hours
   * (regardless of when they entered this status), but only if last comment is from internal person
   */
  static async cleanupPastUserDependencyTickets(): Promise<{ resolved: number; errors: string[] }> {
    const result = { resolved: 0, errors: [] as string[] };
    
    try {
      const { data, error } = await supabase.rpc('cleanup_past_user_dependency_tickets');
      
      if (error) {
        console.error('Error calling cleanup function:', error);
        result.errors.push(`Database error: ${error.message}`);
        return result;
      }
      
      result.resolved = (data as number) || 0;
      console.log(`Cleanup resolved ${result.resolved} past user dependency tickets`);
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in cleanup service:', error);
      result.errors.push(`Service error: ${errorMessage}`);
    }
    
    return result;
  }

  /**
   * Get count of tickets that will be auto-resolved soon (within next 24 hours)
   * Updated to use 72 hours threshold
   */
  static async getTicketsAutoResolvingSoon(): Promise<number> {
    try {
      const seventyTwoHoursAgo = new Date();
      seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);
      
      const { count, error } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'user_dependency')
        .lt('user_dependency_started_at', seventyTwoHoursAgo.toISOString())
        .eq('deleted', false) as any;
      
      if (error) {
        console.error('Error getting auto-resolving tickets count:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error: any) {
      console.error('Error in getTicketsAutoResolvingSoon:', error);
      return 0;
    }
  }

  /**
   * Get tickets in user dependency status with their dependency start time
   * Updated to use 72 hours threshold and user_dependency_started_at field
   */
  static async getUserDependencyTickets(): Promise<Array<{
    id: string;
    ticketNumber: string;
    userDependencyStartedAt: string;
    hoursInDependency: number;
    willAutoResolveIn: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, ticket_number, user_dependency_started_at, created_at')
        .eq('status', 'user_dependency')
        .eq('deleted', false)
        .order('user_dependency_started_at', { ascending: true });
      
      if (error) {
        console.error('Error getting user dependency tickets:', error);
        return [];
      }
      
      return (data || []).map(ticket => {
        const startDate = ticket.user_dependency_started_at 
          ? new Date(ticket.user_dependency_started_at)
          : (ticket.created_at ? new Date(ticket.created_at) : new Date());
        const now = new Date();
        const hoursInDependency = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
        const willAutoResolveIn = Math.max(0, 72 - hoursInDependency);
        
        return {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          userDependencyStartedAt: ticket.user_dependency_started_at || ticket.created_at || new Date().toISOString(),
          hoursInDependency,
          willAutoResolveIn
        };
      });
    } catch (error: any) {
      console.error('Error in getUserDependencyTickets:', error);
      return [];
    }
  }
}
