export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      custom_personas: {
        Row: {
          backstory: string | null
          constraints: string | null
          created_at: string
          id: string
          name: string
          style: string | null
          tags: string[] | null
          user_id: string | null
          voice_preference: string | null
        }
        Insert: {
          backstory?: string | null
          constraints?: string | null
          created_at?: string
          id?: string
          name: string
          style?: string | null
          tags?: string[] | null
          user_id?: string | null
          voice_preference?: string | null
        }
        Update: {
          backstory?: string | null
          constraints?: string | null
          created_at?: string
          id?: string
          name?: string
          style?: string | null
          tags?: string[] | null
          user_id?: string | null
          voice_preference?: string | null
        }
        Relationships: []
      }
      processed_video_assets: {
        Row: {
          audio_transcript: string | null
          clip_duration_seconds: number | null
          clipped_video_path_r2: string | null
          frame_descriptions: string | null
          frame_paths_r2: Json | null
          id: string
          last_accessed_at: string | null
          processed_at: string | null
          source_video_duration_seconds: number | null
          source_video_identifier: string
        }
        Insert: {
          audio_transcript?: string | null
          clip_duration_seconds?: number | null
          clipped_video_path_r2?: string | null
          frame_descriptions?: string | null
          frame_paths_r2?: Json | null
          id?: string
          last_accessed_at?: string | null
          processed_at?: string | null
          source_video_duration_seconds?: number | null
          source_video_identifier: string
        }
        Update: {
          audio_transcript?: string | null
          clip_duration_seconds?: number | null
          clipped_video_path_r2?: string | null
          frame_descriptions?: string | null
          frame_paths_r2?: Json | null
          id?: string
          last_accessed_at?: string | null
          processed_at?: string | null
          source_video_duration_seconds?: number | null
          source_video_identifier?: string
        }
        Relationships: []
      }
      video_history: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          is_public: boolean | null
          job_id: string | null
          num_speakers: number | null
          personas: Json | null
          source_video_url: string | null
          speaking_pace: number | null
          status: string | null
          thumbnail_url: string | null
          transcript_summary: string | null
          updated_at: string | null
          user_guidance: string | null
          user_id: string | null
          video_r2_url: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          is_public?: boolean | null
          job_id?: string | null
          num_speakers?: number | null
          personas?: Json | null
          source_video_url?: string | null
          speaking_pace?: number | null
          status?: string | null
          thumbnail_url?: string | null
          transcript_summary?: string | null
          updated_at?: string | null
          user_guidance?: string | null
          user_id?: string | null
          video_r2_url?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          is_public?: boolean | null
          job_id?: string | null
          num_speakers?: number | null
          personas?: Json | null
          source_video_url?: string | null
          speaking_pace?: number | null
          status?: string | null
          thumbnail_url?: string | null
          transcript_summary?: string | null
          updated_at?: string | null
          user_guidance?: string | null
          user_id?: string | null
          video_r2_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
