export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      clothes: {
        Row: {
          ai_detected_metadata: Json | null
          brand: string | null
          category: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string
          style: string | null
          texture_maps: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_detected_metadata?: Json | null
          brand?: string | null
          category: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          style?: string | null
          texture_maps?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_detected_metadata?: Json | null
          brand?: string | null
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          style?: string | null
          texture_maps?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "outfit_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          participant1_id: string
          participant2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant1_id: string
          participant2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant1_id?: string
          participant2_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_calendar: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          outfit_id: string
          scheduled_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          outfit_id: string
          scheduled_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          outfit_id?: string
          scheduled_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_calendar_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          likes_count: number
          outfit_id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          likes_count?: number
          outfit_id: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          likes_count?: number
          outfit_id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_comments_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "outfit_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_feedback: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          feedback_type: string
          id: string
          outfit_id: string
          style_context: Json | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          feedback_type: string
          id?: string
          outfit_id: string
          style_context?: Json | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          feedback_type?: string
          id?: string
          outfit_id?: string
          style_context?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_feedback_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_generation_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string
          hit_count: number | null
          id: string
          mood: string | null
          outfit_data: Json
          prompt: string
          user_id: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          mood?: string | null
          outfit_data: Json
          prompt: string
          user_id: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          mood?: string | null
          outfit_data?: Json
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      outfit_likes: {
        Row: {
          created_at: string
          id: string
          outfit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outfit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outfit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_likes_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      outfits: {
        Row: {
          ai_analysis: Json | null
          confidence_score: number | null
          created_at: string
          description: string | null
          generated_image_url: string | null
          id: string
          is_public: boolean
          likes_count: number
          mood: string | null
          prompt: string
          purchase_links: Json | null
          recommended_clothes: Json | null
          styling_tips: Json | null
          title: string
          trend_relevance: number | null
          updated_at: string
          user_id: string
          weather_score: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          generated_image_url?: string | null
          id?: string
          is_public?: boolean
          likes_count?: number
          mood?: string | null
          prompt: string
          purchase_links?: Json | null
          recommended_clothes?: Json | null
          styling_tips?: Json | null
          title: string
          trend_relevance?: number | null
          updated_at?: string
          user_id: string
          weather_score?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          generated_image_url?: string | null
          id?: string
          is_public?: boolean
          likes_count?: number
          mood?: string | null
          prompt?: string
          purchase_links?: Json | null
          recommended_clothes?: Json | null
          styling_tips?: Json | null
          title?: string
          trend_relevance?: number | null
          updated_at?: string
          user_id?: string
          weather_score?: number | null
        }
        Relationships: []
      }
      pinterest_boards: {
        Row: {
          access_token: string
          board_id: string
          board_name: string
          board_url: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          pins_data: Json | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          board_id: string
          board_name: string
          board_url?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          pins_data?: Json | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          board_id?: string
          board_name?: string
          board_url?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          pins_data?: Json | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pinterest_trends_cache: {
        Row: {
          ai_context: string | null
          cached_at: string
          dominant_colors: string[] | null
          expires_at: string
          fetch_count: number | null
          id: string
          pins_data: Json
          query: string
          query_hash: string
          trending_keywords: string[] | null
        }
        Insert: {
          ai_context?: string | null
          cached_at?: string
          dominant_colors?: string[] | null
          expires_at: string
          fetch_count?: number | null
          id?: string
          pins_data: Json
          query: string
          query_hash: string
          trending_keywords?: string[] | null
        }
        Update: {
          ai_context?: string | null
          cached_at?: string
          dominant_colors?: string[] | null
          expires_at?: string
          fetch_count?: number | null
          id?: string
          pins_data?: Json
          query?: string
          query_hash?: string
          trending_keywords?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          body_type: string | null
          created_at: string
          display_name: string | null
          favorite_colors: Json | null
          followers_count: number
          following_count: number
          gender: string | null
          id: string
          location: string | null
          occasion_preferences: Json | null
          privacy_settings: Json | null
          size_information: Json | null
          skin_tone: string | null
          style_preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          body_type?: string | null
          created_at?: string
          display_name?: string | null
          favorite_colors?: Json | null
          followers_count?: number
          following_count?: number
          gender?: string | null
          id?: string
          location?: string | null
          occasion_preferences?: Json | null
          privacy_settings?: Json | null
          size_information?: Json | null
          skin_tone?: string | null
          style_preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          body_type?: string | null
          created_at?: string
          display_name?: string | null
          favorite_colors?: Json | null
          followers_count?: number
          following_count?: number
          gender?: string | null
          id?: string
          location?: string | null
          occasion_preferences?: Json | null
          privacy_settings?: Json | null
          size_information?: Json | null
          skin_tone?: string | null
          style_preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_expired_outfit_cache: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
