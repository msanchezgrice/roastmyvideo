// Supabase DB type definitions

export type Json = | string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      // Define your tables here, e.g.:
      // profiles: {
      //   Row: { id: string; username: string; avatar_url?: string };
      //   Insert: { id: string; username: string; avatar_url?: string };
      //   Update: { id?: string; username?: string; avatar_url?: string };
      // };
    };
    Views: {
      // Define your views here
    };
    Functions: {
      // Define your functions here
    };
  };
} 