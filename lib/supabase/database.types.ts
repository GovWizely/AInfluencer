export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      conversations: {
        Row: {
          account_id: string;
          created_at: string;
          external_id: string;
          id: string;
          last_inbound_at: string | null;
          last_message_at: string | null;
          last_message_preview: string | null;
          participant_external_id: string | null;
          participant_handle: string;
          participant_name: string | null;
          read_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          created_at?: string;
          external_id: string;
          id?: string;
          last_inbound_at?: string | null;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          participant_external_id?: string | null;
          participant_handle: string;
          participant_name?: string | null;
          read_at?: string | null;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          external_id?: string;
          id?: string;
          last_inbound_at?: string | null;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          participant_external_id?: string | null;
          participant_handle?: string;
          participant_name?: string | null;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "social_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      instagram_credentials: {
        Row: {
          access_token: string;
          account_id: string;
          expires_at: string;
        };
        ComputedFields: never;
        Insert: {
          access_token: string;
          account_id: string;
          expires_at: string;
        };
        Update: {
          access_token?: string;
          account_id?: string;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instagram_credentials_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "social_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          direction: string;
          external_id: string | null;
          id: string;
          sent_at: string;
          sent_by: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          conversation_id: string;
          direction: string;
          external_id?: string | null;
          id?: string;
          sent_at?: string;
          sent_by: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          direction?: string;
          external_id?: string | null;
          id?: string;
          sent_at?: string;
          sent_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          account_id: string;
          caption: string;
          comment_count: number;
          external_id: string;
          id: string;
          like_count: number;
          posted_at: string;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          caption?: string;
          comment_count?: number;
          external_id: string;
          id?: string;
          like_count?: number;
          posted_at: string;
        };
        Update: {
          account_id?: string;
          caption?: string;
          comment_count?: number;
          external_id?: string;
          id?: string;
          like_count?: number;
          posted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "social_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      social_accounts: {
        Row: {
          bio: string | null;
          created_at: string;
          display_name: string | null;
          external_id: string;
          followers: number;
          handle: string;
          id: string;
          owner_id: string;
          platform: string;
        };
        ComputedFields: never;
        Insert: {
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          external_id: string;
          followers?: number;
          handle: string;
          id?: string;
          owner_id: string;
          platform: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          external_id?: string;
          followers?: number;
          handle?: string;
          id?: string;
          owner_id?: string;
          platform?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      connect_instagram: {
        Args: {
          creator_id: string;
          credential: string;
          expiration: string;
          follower_count: number;
          instagram_handle: string;
          instagram_id: string;
          instagram_name: string;
        };
        Returns: string;
      };
      owns_account: { Args: { target_account_id: string }; Returns: boolean };
      owns_conversation: {
        Args: { target_conversation_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
