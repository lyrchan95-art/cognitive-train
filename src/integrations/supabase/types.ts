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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      archetypes: {
        Row: {
          accent: string
          created_at: string
          data: Json
          headline: string
          icon: string
          name: string
          published: boolean
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
        }
        Insert: {
          accent: string
          created_at?: string
          data: Json
          headline: string
          icon: string
          name: string
          published?: boolean
          slug: string
          sort_order?: number
          tagline: string
          updated_at?: string
        }
        Update: {
          accent?: string
          created_at?: string
          data?: Json
          headline?: string
          icon?: string
          name?: string
          published?: boolean
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_archetypes: {
        Row: {
          archetype_slug: string
          article_id: string
        }
        Insert: {
          archetype_slug: string
          article_id: string
        }
        Update: {
          archetype_slug?: string
          article_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_archetypes_archetype_slug_fkey"
            columns: ["archetype_slug"]
            isOneToOne: false
            referencedRelation: "archetypes"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "article_archetypes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_likes: {
        Row: {
          article_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          archived_at: string | null
          body: string
          category: string
          created_at: string
          excerpt: string
          hero_image_url: string | null
          id: string
          published: boolean
          read_minutes: number
          slug: string
          sort_order: number
          tags: string[]
          title: string
          tldr: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          body: string
          category: string
          created_at?: string
          excerpt: string
          hero_image_url?: string | null
          id?: string
          published?: boolean
          read_minutes?: number
          slug: string
          sort_order?: number
          tags?: string[]
          title: string
          tldr?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          body?: string
          category?: string
          created_at?: string
          excerpt?: string
          hero_image_url?: string | null
          id?: string
          published?: boolean
          read_minutes?: number
          slug?: string
          sort_order?: number
          tags?: string[]
          title?: string
          tldr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          change_kind: string
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          snapshot: Json
          version: number
        }
        Insert: {
          change_kind: string
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          snapshot: Json
          version: number
        }
        Update: {
          change_kind?: string
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: []
      }
      daily_briefings: {
        Row: {
          action_done_at: string | null
          ai_validation: string | null
          archetype_slug: string
          briefing_date: string
          content: string
          created_at: string
          evening_prompt: string | null
          focus: string
          id: string
          micro_action: string
          read_at: string | null
          reflection: string | null
          reflection_done_at: string | null
          toxicity_alert: string | null
          user_id: string
        }
        Insert: {
          action_done_at?: string | null
          ai_validation?: string | null
          archetype_slug: string
          briefing_date?: string
          content: string
          created_at?: string
          evening_prompt?: string | null
          focus: string
          id?: string
          micro_action: string
          read_at?: string | null
          reflection?: string | null
          reflection_done_at?: string | null
          toxicity_alert?: string | null
          user_id: string
        }
        Update: {
          action_done_at?: string | null
          ai_validation?: string | null
          archetype_slug?: string
          briefing_date?: string
          content?: string
          created_at?: string
          evening_prompt?: string | null
          focus?: string
          id?: string
          micro_action?: string
          read_at?: string | null
          reflection?: string | null
          reflection_done_at?: string | null
          toxicity_alert?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lab_datasets: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          id: string
          name: string
          recipe: string
          row_count: number
          snapshot: Json
          suppressed_cells: number
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by: string
          id?: string
          name: string
          recipe: string
          row_count?: number
          snapshot?: Json
          suppressed_cells?: number
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          recipe?: string
          row_count?: number
          snapshot?: Json
          suppressed_cells?: number
        }
        Relationships: []
      }
      lab_insights: {
        Row: {
          created_at: string
          created_by: string
          finding: string
          follow_up: string
          hypothesis: string
          id: string
          linked_article_ids: string[]
          run_id: string
          tags: string[]
        }
        Insert: {
          created_at?: string
          created_by: string
          finding?: string
          follow_up?: string
          hypothesis?: string
          id?: string
          linked_article_ids?: string[]
          run_id: string
          tags?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string
          finding?: string
          follow_up?: string
          hypothesis?: string
          id?: string
          linked_article_ids?: string[]
          run_id?: string
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "lab_insights_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "model_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_share_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          run_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          run_id: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          run_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_share_links_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "model_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      model_runs: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          dataset_id: string | null
          dataset_snapshot: Json | null
          error: string | null
          finished_at: string | null
          id: string
          metrics: Json
          model_key: string
          progress: number
          progress_label: string | null
          promotion_state: string
          results: Json
          started_at: string | null
          status: string
          version: number
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by: string
          dataset_id?: string | null
          dataset_snapshot?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          metrics?: Json
          model_key: string
          progress?: number
          progress_label?: string | null
          promotion_state?: string
          results?: Json
          started_at?: string | null
          status?: string
          version?: number
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          dataset_id?: string | null
          dataset_snapshot?: Json | null
          error?: string | null
          finished_at?: string | null
          id?: string
          metrics?: Json
          model_key?: string
          progress?: number
          progress_label?: string | null
          promotion_state?: string
          results?: Json
          started_at?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_runs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "lab_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_days: {
        Row: {
          action_prompt: string
          content: string
          created_at: string
          day_number: number
          id: string
          pathway_id: string
          quiz_answer_index: number
          quiz_options: Json
          quiz_question: string
          read_minutes: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          action_prompt: string
          content: string
          created_at?: string
          day_number: number
          id?: string
          pathway_id: string
          quiz_answer_index?: number
          quiz_options?: Json
          quiz_question?: string
          read_minutes?: number
          subtitle?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_prompt?: string
          content?: string
          created_at?: string
          day_number?: number
          id?: string
          pathway_id?: string
          quiz_answer_index?: number
          quiz_options?: Json
          quiz_question?: string
          read_minutes?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathway_days_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "pathways"
            referencedColumns: ["id"]
          },
        ]
      }
      pathway_progress: {
        Row: {
          completed_at: string
          day_number: number
          id: string
          journal_entry: string | null
          pathway_id: string
          quiz_correct: boolean
          user_id: string
          xp_awarded: number
        }
        Insert: {
          completed_at?: string
          day_number: number
          id?: string
          journal_entry?: string | null
          pathway_id: string
          quiz_correct?: boolean
          user_id: string
          xp_awarded?: number
        }
        Update: {
          completed_at?: string
          day_number?: number
          id?: string
          journal_entry?: string | null
          pathway_id?: string
          quiz_correct?: boolean
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "pathway_progress_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "pathways"
            referencedColumns: ["id"]
          },
        ]
      }
      pathways: {
        Row: {
          archetype_slug: string
          certificate_title: string | null
          created_at: string
          description: string
          difficulty: string
          duration_days: number
          hero_image_url: string | null
          icon: string
          id: string
          published: boolean
          required_streak: number
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          archetype_slug: string
          certificate_title?: string | null
          created_at?: string
          description: string
          difficulty?: string
          duration_days?: number
          hero_image_url?: string | null
          icon?: string
          id?: string
          published?: boolean
          required_streak?: number
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          archetype_slug?: string
          certificate_title?: string | null
          created_at?: string
          description?: string
          difficulty?: string
          duration_days?: number
          hero_image_url?: string | null
          icon?: string
          id?: string
          published?: boolean
          required_streak?: number
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathways_archetype_slug_fkey"
            columns: ["archetype_slug"]
            isOneToOne: false
            referencedRelation: "archetypes"
            referencedColumns: ["slug"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      research_articles: {
        Row: {
          abstract: string
          authors: string | null
          body: string
          category: string
          citation: string | null
          created_at: string
          hero_image_url: string | null
          id: string
          published: boolean
          published_date: string
          read_minutes: number
          slug: string
          sort_order: number
          source_url: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          abstract: string
          authors?: string | null
          body: string
          category?: string
          citation?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          published?: boolean
          published_date?: string
          read_minutes?: number
          slug: string
          sort_order?: number
          source_url?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          abstract?: string
          authors?: string | null
          body?: string
          category?: string
          citation?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          published?: boolean
          published_date?: string
          read_minutes?: number
          slug?: string
          sort_order?: number
          source_url?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_publishes: {
        Row: {
          action: string
          created_at: string
          created_by: string
          entity_id: string
          entity_title: string
          entity_type: string
          error: string | null
          executed_at: string | null
          id: string
          scheduled_for: string
          status: string
        }
        Insert: {
          action?: string
          created_at?: string
          created_by: string
          entity_id: string
          entity_title?: string
          entity_type: string
          error?: string | null
          executed_at?: string | null
          id?: string
          scheduled_for: string
          status?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_title?: string
          entity_type?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          scheduled_for?: string
          status?: string
        }
        Relationships: []
      }
      user_archetype: {
        Row: {
          archetype_slug: string
          confidence: number
          dimension_scores: Json
          responses: Json
          taken_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archetype_slug: string
          confidence: number
          dimension_scores: Json
          responses: Json
          taken_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archetype_slug?: string
          confidence?: number
          dimension_scores?: Json
          responses?: Json
          taken_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_archetype_archetype_slug_fkey"
            columns: ["archetype_slug"]
            isOneToOne: false
            referencedRelation: "archetypes"
            referencedColumns: ["slug"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          last_check_in: string | null
          longest_streak: number
          total_articles_read: number
          total_briefings_read: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_check_in?: string | null
          longest_streak?: number
          total_articles_read?: number
          total_briefings_read?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_check_in?: string | null
          longest_streak?: number
          total_articles_read?: number
          total_briefings_read?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workplace_audits: {
        Row: {
          autonomy: number
          created_at: string
          id: string
          psychological_safety: number
          purpose: number
          recognition: number
          responses: Json
          taken_at: string
          toxicity_score: number
          user_id: string
          workload: number
        }
        Insert: {
          autonomy: number
          created_at?: string
          id?: string
          psychological_safety: number
          purpose: number
          recognition: number
          responses: Json
          taken_at?: string
          toxicity_score: number
          user_id: string
          workload: number
        }
        Update: {
          autonomy?: number
          created_at?: string
          id?: string
          psychological_safety?: number
          purpose?: number
          recognition?: number
          responses?: Json
          taken_at?: string
          toxicity_score?: number
          user_id?: string
          workload?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_content_editor: { Args: { _user_id: string }; Returns: boolean }
      is_lab_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "data_scientist"
        | "content_editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "data_scientist",
        "content_editor",
      ],
    },
  },
} as const
