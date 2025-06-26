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
      console.log('Attempting to register user:', params.mobileNumber);
      
      // Validate PIN is exactly 4 digits
      if (params.pin.length !== 4 || !/^\d{4}$/.test(params.pin)) {
        return { success: false, error: 'PIN must be exactly 4 digits' };
      }
      
      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('mobile_number', params.mobileNumber)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing user:', checkError);
        return { success: false, error: 'Database error during registration' };
      }

      if (existingUser) {
        console.log('User already exists');
        return { success: false, error: 'Mobile number already registered' };
      }

      // Create new user with 4-digit PIN
      const { data, error } = await supabase
        .from('users')
        .insert({
          mobile_number: params.mobileNumber,
          name: params.name,
          pin: params.pin,
          pin_hash: '', // Keep for compatibility but empty
          city: params.city,
          centre_code: params.centreCode,
          role: 'public_user'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return { success: false, error: error.message };
      }

      console.log('User created successfully:', data);

      const user: User = {
        id: data.id,
        name: data.name,
        role: data.role as User['role'],
        city: data.city,
        centreCode: data.centre_code,
        mobile: data.mobile_number,
        isActive: data.is_active
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
      console.log('Attempting to login user:', identifier);
      
      if (!identifier) {
        return { success: false, error: 'Mobile number or email is required' };
      }

      // Validate PIN is exactly 4 digits
      if (params.pin.length !== 4 || !/^\d{4}$/.test(params.pin)) {
        return { success: false, error: 'PIN must be exactly 4 digits' };
      }

      // Build query based on identifier type
      let query = supabase
        .from('users')
        .select('*')
        .eq('is_active', true);

      // Check if identifier looks like an email or mobile number
      if (identifier.includes('@')) {
        // For now, we don't have email field in users table
        // This is for future compatibility
        return { success: false, error: 'Email login not yet supported' };
      } else {
        query = query.eq('mobile_number', identifier);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error fetching user:', error);
        return { success: false, error: 'Database error during login' };
      }

      if (!data) {
        console.log('User not found for identifier:', identifier);
        return { success: false, error: 'User not found' };
      }

      // Direct PIN comparison (4-digit PIN)
      if (data.pin !== params.pin) {
        console.log('Invalid PIN for user:', data.name);
        return { success: false, error: 'Invalid PIN' };
      }

      console.log('Login successful for user:', data.name);

      const user: User = {
        id: data.id,
        name: data.name,
        role: data.role as User['role'],
        city: data.city,
        centreCode: data.centre_code,
        mobile: data.mobile_number,
        isActive: data.is_active
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
