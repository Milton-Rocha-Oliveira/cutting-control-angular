import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async signIn(email:string, password:string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signOut() { await this.supabase.auth.signOut(); }

  getUser() { return this.supabase.auth.getUser(); }

  getAccessToken(): string | null {
    // supabase-js v2: getSession returns a Promise resolving to { data: { session } }
    try {
      // synchronous retrieval from local storage as a fallback
      const raw = localStorage.getItem('supabase.auth.token');
      if (raw) {
        // token storage format may vary; try parse
        try {
          const parsed = JSON.parse(raw);
          return parsed?.currentSession?.access_token || parsed?.access_token || null;
        } catch (e) {
          return null;
        }
      }
    } catch (e) {}
    return null;
  }
}
