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
      ai_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      ai_cost_logs: {
        Row: {
          cost_usd: number
          created_at: string
          feature_key: string | null
          id: string
          log_id: string | null
          model: string | null
          organization_id: string | null
          provider_slug: string | null
          tokens_in: number
          tokens_out: number
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          feature_key?: string | null
          id?: string
          log_id?: string | null
          model?: string | null
          organization_id?: string | null
          provider_slug?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          feature_key?: string | null
          id?: string
          log_id?: string | null
          model?: string | null
          organization_id?: string | null
          provider_slug?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_cost_logs_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "ai_error_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_cost_logs_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "ai_request_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_cost_logs_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "ai_usage_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_fallback_rules: {
        Row: {
          created_at: string
          enabled: boolean
          fallback_provider_ids: Json
          feature_key: string
          id: string
          trigger: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          fallback_provider_ids?: Json
          feature_key: string
          id?: string
          trigger: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          fallback_provider_ids?: Json
          feature_key?: string
          id?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_feature_mapping: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          fallback_chain: Json
          feature_key: string
          id: string
          label: string
          primary_model: string | null
          primary_provider_id: string | null
          routing_strategy: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          fallback_chain?: Json
          feature_key: string
          id?: string
          label: string
          primary_model?: string | null
          primary_provider_id?: string | null
          routing_strategy?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          fallback_chain?: Json
          feature_key?: string
          id?: string
          label?: string
          primary_model?: string | null
          primary_provider_id?: string | null
          routing_strategy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feature_mapping_primary_provider_id_fkey"
            columns: ["primary_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          category: string
          context_window: number | null
          cost_input_per_1k: number
          cost_output_per_1k: number
          created_at: string
          enabled: boolean
          id: string
          is_default: boolean
          label: string | null
          max_tokens: number | null
          name: string
          provider_id: string
          status: string
          supports_json_mode: boolean
          supports_streaming: boolean
          temperature: number | null
          top_p: number | null
          updated_at: string
        }
        Insert: {
          category?: string
          context_window?: number | null
          cost_input_per_1k?: number
          cost_output_per_1k?: number
          created_at?: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          label?: string | null
          max_tokens?: number | null
          name: string
          provider_id: string
          status?: string
          supports_json_mode?: boolean
          supports_streaming?: boolean
          temperature?: number | null
          top_p?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          context_window?: number | null
          cost_input_per_1k?: number
          cost_output_per_1k?: number
          created_at?: string
          enabled?: boolean
          id?: string
          is_default?: boolean
          label?: string | null
          max_tokens?: number | null
          name?: string
          provider_id?: string
          status?: string
          supports_json_mode?: boolean
          supports_streaming?: boolean
          temperature?: number | null
          top_p?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          system_prompt: string | null
          updated_at: string
          user_template: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          system_prompt?: string | null
          updated_at?: string
          user_template?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          system_prompt?: string | null
          updated_at?: string
          user_template?: string | null
        }
        Relationships: []
      }
      ai_provider_health: {
        Row: {
          checked_at: string
          error: string | null
          id: string
          latency_ms: number | null
          ok: boolean
          provider_id: string
        }
        Insert: {
          checked_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok: boolean
          provider_id: string
        }
        Update: {
          checked_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok?: boolean
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_health_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          api_key_encrypted: string | null
          base_url: string | null
          created_at: string
          daily_token_limit: number | null
          default_model: string | null
          enabled: boolean
          frequency_penalty: number | null
          health_status: string
          id: string
          is_default: boolean
          key_expires_at: string | null
          key_rotated_at: string | null
          last_error: string | null
          last_health_check: string | null
          last_latency_ms: number | null
          last_test_message: string | null
          last_tested_at: string | null
          last_used_at: string | null
          max_tokens: number | null
          monthly_budget: number | null
          name: string
          organization_id: string | null
          presence_penalty: number | null
          priority: number
          project_id: string | null
          provider_type: string
          region: string | null
          retry_attempts: number
          seed: number | null
          slug: string
          status: string
          supports_embedding: boolean
          supports_image_gen: boolean
          supports_json_mode: boolean
          supports_moderation: boolean
          supports_reasoning: boolean
          supports_speech: boolean
          supports_streaming: boolean
          supports_vision: boolean
          system_prompt: string | null
          temperature: number | null
          timeout_ms: number
          top_p: number | null
          updated_at: string
          weight: number
        }
        Insert: {
          api_key_encrypted?: string | null
          base_url?: string | null
          created_at?: string
          daily_token_limit?: number | null
          default_model?: string | null
          enabled?: boolean
          frequency_penalty?: number | null
          health_status?: string
          id?: string
          is_default?: boolean
          key_expires_at?: string | null
          key_rotated_at?: string | null
          last_error?: string | null
          last_health_check?: string | null
          last_latency_ms?: number | null
          last_test_message?: string | null
          last_tested_at?: string | null
          last_used_at?: string | null
          max_tokens?: number | null
          monthly_budget?: number | null
          name: string
          organization_id?: string | null
          presence_penalty?: number | null
          priority?: number
          project_id?: string | null
          provider_type?: string
          region?: string | null
          retry_attempts?: number
          seed?: number | null
          slug: string
          status?: string
          supports_embedding?: boolean
          supports_image_gen?: boolean
          supports_json_mode?: boolean
          supports_moderation?: boolean
          supports_reasoning?: boolean
          supports_speech?: boolean
          supports_streaming?: boolean
          supports_vision?: boolean
          system_prompt?: string | null
          temperature?: number | null
          timeout_ms?: number
          top_p?: number | null
          updated_at?: string
          weight?: number
        }
        Update: {
          api_key_encrypted?: string | null
          base_url?: string | null
          created_at?: string
          daily_token_limit?: number | null
          default_model?: string | null
          enabled?: boolean
          frequency_penalty?: number | null
          health_status?: string
          id?: string
          is_default?: boolean
          key_expires_at?: string | null
          key_rotated_at?: string | null
          last_error?: string | null
          last_health_check?: string | null
          last_latency_ms?: number | null
          last_test_message?: string | null
          last_tested_at?: string | null
          last_used_at?: string | null
          max_tokens?: number | null
          monthly_budget?: number | null
          name?: string
          organization_id?: string | null
          presence_penalty?: number | null
          priority?: number
          project_id?: string | null
          provider_type?: string
          region?: string | null
          retry_attempts?: number
          seed?: number | null
          slug?: string
          status?: string
          supports_embedding?: boolean
          supports_image_gen?: boolean
          supports_json_mode?: boolean
          supports_moderation?: boolean
          supports_reasoning?: boolean
          supports_speech?: boolean
          supports_streaming?: boolean
          supports_vision?: boolean
          system_prompt?: string | null
          temperature?: number | null
          timeout_ms?: number
          top_p?: number | null
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      ai_request_logs: {
        Row: {
          book_id: string | null
          created_at: string
          error: string | null
          estimated_cost: number
          id: string
          model: string | null
          prompt_key: string | null
          provider_id: string | null
          provider_slug: string | null
          response_time_ms: number | null
          status: string
          tokens_in: number
          tokens_out: number
          user_id: string | null
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          error?: string | null
          estimated_cost?: number
          id?: string
          model?: string | null
          prompt_key?: string | null
          provider_id?: string | null
          provider_slug?: string | null
          response_time_ms?: number | null
          status: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Update: {
          book_id?: string | null
          created_at?: string
          error?: string | null
          estimated_cost?: number
          id?: string
          model?: string | null
          prompt_key?: string | null
          provider_id?: string | null
          provider_slug?: string | null
          response_time_ms?: number | null
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_request_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_routing_rules: {
        Row: {
          active: boolean
          created_at: string
          filters: Json
          id: string
          name: string
          priority: number
          strategy: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          filters?: Json
          id?: string
          name: string
          priority?: number
          strategy?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          priority?: number
          strategy?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_limits: {
        Row: {
          created_at: string
          daily_requests: number | null
          daily_tokens: number | null
          enabled: boolean
          id: string
          monthly_cost_usd: number | null
          monthly_requests: number | null
          monthly_tokens: number | null
          scope: string
          scope_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_requests?: number | null
          daily_tokens?: number | null
          enabled?: boolean
          id?: string
          monthly_cost_usd?: number | null
          monthly_requests?: number | null
          monthly_tokens?: number | null
          scope: string
          scope_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_requests?: number | null
          daily_tokens?: number | null
          enabled?: boolean
          id?: string
          monthly_cost_usd?: number | null
          monthly_requests?: number | null
          monthly_tokens?: number | null
          scope?: string
          scope_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          category: string
          content: string
          created_at: string
          excerpt: string | null
          faq: Json
          featured_image_url: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          faq?: Json
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          faq?: Json
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      book_chapters: {
        Row: {
          book_id: string
          created_at: string
          id: string
          narrative: string
          position: number
          quotes: Json
          timeline: Json
          title: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          narrative?: string
          position: number
          quotes?: Json
          timeline?: Json
          title?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          narrative?: string
          position?: number
          quotes?: Json
          timeline?: Json
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_exports: {
        Row: {
          book_id: string
          created_at: string
          filename: string
          id: string
          kind: Database["public"]["Enums"]["export_kind"]
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          filename: string
          id?: string
          kind: Database["public"]["Enums"]["export_kind"]
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          filename?: string
          id?: string
          kind?: Database["public"]["Enums"]["export_kind"]
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_exports_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_manuscripts: {
        Row: {
          book_id: string
          created_at: string
          ending: string
          generated_at: string | null
          id: string
          introduction: string
          theme: Database["public"]["Enums"]["book_theme"]
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          ending?: string
          generated_at?: string | null
          id?: string
          introduction?: string
          theme?: Database["public"]["Enums"]["book_theme"]
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          ending?: string
          generated_at?: string | null
          id?: string
          introduction?: string
          theme?: Database["public"]["Enums"]["book_theme"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_manuscripts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          country: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          id: string
          name: string
          nickname: string | null
          progress: number
          relationship: string | null
          status: Database["public"]["Enums"]["book_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          name: string
          nickname?: string | null
          progress?: number
          relationship?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          name?: string
          nickname?: string | null
          progress?: number
          relationship?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          notes: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          status: string
          subject: string
          template_key: string | null
          to_email: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          status: string
          subject: string
          template_key?: string | null
          to_email: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          subject?: string
          template_key?: string | null
          to_email?: string
          variables?: Json | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          html_body: string
          id: string
          key: string
          name: string
          subject: string
          text_body: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          html_body: string
          id?: string
          key: string
          name: string
          subject: string
          text_body?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          html_body?: string
          id?: string
          key?: string
          name?: string
          subject?: string
          text_body?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      gateway_settings: {
        Row: {
          created_at: string
          gateway_id: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          gateway_id: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          gateway_id?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gateway_settings_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_qa: {
        Row: {
          answer: string
          book_id: string
          created_at: string
          id: string
          position: number
          question: string
          topic: string
          updated_at: string
        }
        Insert: {
          answer?: string
          book_id: string
          created_at?: string
          id?: string
          position: number
          question: string
          topic: string
          updated_at?: string
        }
        Update: {
          answer?: string
          book_id?: string
          created_at?: string
          id?: string
          position?: number
          question?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_qa_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_topics: {
        Row: {
          book_id: string
          completed_at: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["topic_status"]
          topic: string
          updated_at: string
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["topic_status"]
          topic: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["topic_status"]
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_topics_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          cancel_url: string | null
          country_restriction: string[]
          created_at: string
          credentials_encrypted: string | null
          currency: string
          description: string | null
          display_order: number
          enabled: boolean
          id: string
          last_webhook_at: string | null
          logo_url: string | null
          mode: Database["public"]["Enums"]["gateway_mode"]
          name: string
          payment_instructions: string | null
          slug: string
          status: string
          success_url: string | null
          updated_at: string
          webhook_secret_encrypted: string | null
          webhook_verified: boolean
        }
        Insert: {
          cancel_url?: string | null
          country_restriction?: string[]
          created_at?: string
          credentials_encrypted?: string | null
          currency?: string
          description?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          last_webhook_at?: string | null
          logo_url?: string | null
          mode?: Database["public"]["Enums"]["gateway_mode"]
          name: string
          payment_instructions?: string | null
          slug: string
          status?: string
          success_url?: string | null
          updated_at?: string
          webhook_secret_encrypted?: string | null
          webhook_verified?: boolean
        }
        Update: {
          cancel_url?: string | null
          country_restriction?: string[]
          created_at?: string
          credentials_encrypted?: string | null
          currency?: string
          description?: string | null
          display_order?: number
          enabled?: boolean
          id?: string
          last_webhook_at?: string | null
          logo_url?: string | null
          mode?: Database["public"]["Enums"]["gateway_mode"]
          name?: string
          payment_instructions?: string | null
          slug?: string
          status?: string
          success_url?: string | null
          updated_at?: string
          webhook_secret_encrypted?: string | null
          webhook_verified?: boolean
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          created_at: string
          gateway_slug: string | null
          id: string
          level: string
          message: string
          meta: Json
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          gateway_slug?: string | null
          id?: string
          level?: string
          message: string
          meta?: Json
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          gateway_slug?: string | null
          id?: string
          level?: string
          message?: string
          meta?: Json
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          coupon_code: string | null
          created_at: string
          currency: string
          description: string | null
          discount_amount: number | null
          external_id: string | null
          gateway_id: string | null
          gateway_slug: string | null
          id: string
          metadata: Json
          referral_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          discount_amount?: number | null
          external_id?: string | null
          gateway_id?: string | null
          gateway_slug?: string | null
          id?: string
          metadata?: Json
          referral_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          coupon_code?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          discount_amount?: number | null
          external_id?: string | null
          gateway_id?: string | null
          gateway_slug?: string | null
          id?: string
          metadata?: Json
          referral_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          book_id: string
          caption: string | null
          category: Database["public"]["Enums"]["photo_category"]
          created_at: string
          filename: string
          height: number | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          book_id: string
          caption?: string | null
          category: Database["public"]["Enums"]["photo_category"]
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          book_id?: string
          caption?: string | null
          category?: Database["public"]["Enums"]["photo_category"]
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_user_id: string
          reward_amount: number | null
          reward_coupon_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id: string
          reward_amount?: number | null
          reward_coupon_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string
          reward_amount?: number | null
          reward_coupon_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_reward_coupon_id_fkey"
            columns: ["reward_coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_logs: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_id: string | null
          id: string
          meta: Json
          reason: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          meta?: Json
          reason?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          meta?: Json
          reason?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
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
      webhook_logs: {
        Row: {
          error: string | null
          event_type: string | null
          gateway_id: string | null
          gateway_slug: string
          headers: Json | null
          id: string
          payload: Json | null
          processed: boolean
          received_at: string
          verified: boolean
        }
        Insert: {
          error?: string | null
          event_type?: string | null
          gateway_id?: string | null
          gateway_slug: string
          headers?: Json | null
          id?: string
          payload?: Json | null
          processed?: boolean
          received_at?: string
          verified?: boolean
        }
        Update: {
          error?: string | null
          event_type?: string | null
          gateway_id?: string | null
          gateway_slug?: string
          headers?: Json | null
          id?: string
          payload?: Json | null
          processed?: boolean
          received_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_error_logs: {
        Row: {
          book_id: string | null
          created_at: string | null
          error: string | null
          id: string | null
          model: string | null
          prompt_key: string | null
          provider_id: string | null
          provider_slug: string | null
          response_time_ms: number | null
          user_id: string | null
        }
        Insert: {
          book_id?: string | null
          created_at?: string | null
          error?: string | null
          id?: string | null
          model?: string | null
          prompt_key?: string | null
          provider_id?: string | null
          provider_slug?: string | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Update: {
          book_id?: string | null
          created_at?: string | null
          error?: string | null
          id?: string | null
          model?: string | null
          prompt_key?: string | null
          provider_id?: string | null
          provider_slug?: string | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_request_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          book_id: string | null
          created_at: string | null
          estimated_cost: number | null
          id: string | null
          model: string | null
          prompt_key: string | null
          provider_id: string | null
          provider_slug: string | null
          response_time_ms: number | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
        }
        Insert: {
          book_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string | null
          model?: string | null
          prompt_key?: string | null
          provider_id?: string | null
          provider_slug?: string | null
          response_time_ms?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Update: {
          book_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          id?: string | null
          model?: string | null
          prompt_key?: string | null
          provider_id?: string | null
          provider_slug?: string | null
          response_time_ms?: number | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_request_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      book_status: "draft" | "in_progress" | "completed"
      book_theme:
        | "classic"
        | "vintage"
        | "modern"
        | "leather_journal"
        | "family_album"
        | "timeline_split"
        | "heritage"
        | "luxury_minimal"
        | "scrapbook"
        | "coffee_table"
        | "magazine"
        | "storybook"
      discount_type: "percent" | "fixed"
      export_kind: "pdf" | "docx" | "print_pdf"
      gateway_mode: "sandbox" | "live"
      photo_category:
        | "baby"
        | "school"
        | "wedding"
        | "career"
        | "family"
        | "retirement"
      topic_status: "not_started" | "in_progress" | "completed"
      transaction_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
        | "cancelled"
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
    Enums: {
      app_role: ["admin", "user"],
      book_status: ["draft", "in_progress", "completed"],
      book_theme: [
        "classic",
        "vintage",
        "modern",
        "leather_journal",
        "family_album",
        "timeline_split",
        "heritage",
        "luxury_minimal",
        "scrapbook",
        "coffee_table",
        "magazine",
        "storybook",
      ],
      discount_type: ["percent", "fixed"],
      export_kind: ["pdf", "docx", "print_pdf"],
      gateway_mode: ["sandbox", "live"],
      photo_category: [
        "baby",
        "school",
        "wedding",
        "career",
        "family",
        "retirement",
      ],
      topic_status: ["not_started", "in_progress", "completed"],
      transaction_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
        "cancelled",
      ],
    },
  },
} as const
