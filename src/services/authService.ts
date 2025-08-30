import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/issue';

interface RegisterUserParams {
  mobileNumber: string;
  name: string;
  pin: string;
  city?: string;
  centreCode?: string;
}

interface LoginParams {
  mobileNumber?: string;
  email?: string;
  pin: string;
}

export class AuthService {
  static async registerUser(params: RegisterUserParams): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('Attempting to register user (secure RPC):', params.mobileNumber);

      // Validate PIN is exactly 4 digits (client-side safeguard)
      if (params.pin.length !== 4 || !/^\d{4}$/.test(params.pin)) {
        return { success: false, error: 'PIN must be exactly 4 digits' };
      }

      // Use secure RPC to perform registration server-side
      const { data, error } = await supabase.rpc('register_user_with_mobile_pin', {
        p_mobile_number: params.mobileNumber,
        p_name: params.name,
        p_pin: params.pin,
        p_city: params.city ?? null,
        p_centre_code: params.centreCode ?? null
      });

      if (error) {
        console.error('Error registering user via RPC:', error);
        return { success: false, error: 'Database error during registration' };
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row || row.success === false) {
        const msg = row?.error_message || 'Registration failed';
        return { success: false, error: msg };
      }

      const user: User = {
        id: row.id,
        name: row.name,
        role: row.role as User['role'],
        city: row.city,
        centreCode: row.centre_code,
        mobile: row.mobile_number,
        isActive: row.is_active
      };

      return { success: true, user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  static async loginUser(params: LoginParams): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const identifier = params.mobileNumber || params.email;
      console.log('Attempting to login user (secure RPC):', identifier);
      
      if (!identifier) {
        return { success: false, error: 'Mobile number or email is required' };
      }

      // Validate PIN is exactly 4 digits
      if (params.pin.length !== 4 || !/^\d{4}$/.test(params.pin)) {
        return { success: false, error: 'PIN must be exactly 4 digits' };
      }

      // Email login not supported yet
      if (identifier.includes('@')) {
        return { success: false, error: 'Email login not yet supported' };
      }

      // Use secure RPC which performs PIN validation server-side (sensitive columns are not exposed)
      const { data, error } = await supabase.rpc('login_with_mobile_pin', {
        p_mobile_number: identifier,
        p_pin: params.pin
      });

      if (error) {
        console.error('Error during secure login RPC:', error);
        return { success: false, error: 'Database error during login' };
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        console.log('Invalid credentials or user not found for:', identifier);
        return { success: false, error: 'Invalid mobile or PIN' };
      }

      const user: User = {
        id: row.id,
        name: row.name,
        role: row.role as User['role'],
        city: row.city,
        centreCode: row.centre_code,
        mobile: row.mobile_number,
        isActive: row.is_active
      };

      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  static async getUserTickets(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('submitted_by_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      return [];
    }
  }
}
