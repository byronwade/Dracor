export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      characters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          ancestry: string;
          level: number;
          xp: number;
          gold: number;
          weapon: string;
          memory: string;
          zone_id: string;
          position_x: number;
          position_y: number;
          position_z: number;
          appearance: Record<string, string>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          ancestry?: string;
          level?: number;
          xp?: number;
          gold?: number;
          weapon: string;
          memory: string;
          zone_id?: string;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          appearance: Record<string, string>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          level?: number;
          xp?: number;
          gold?: number;
          weapon?: string;
          memory?: string;
          zone_id?: string;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          appearance?: Record<string, string>;
          updated_at?: string;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          item_type: string;
          rarity: string;
          required_level: number;
          damage_min: number | null;
          damage_max: number | null;
          armor: number | null;
          sell_price: number;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          item_type: string;
          rarity: string;
          required_level?: number;
          damage_min?: number | null;
          damage_max?: number | null;
          armor?: number | null;
          sell_price?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          description?: string;
          item_type?: string;
          rarity?: string;
          required_level?: number;
          damage_min?: number | null;
          damage_max?: number | null;
          armor?: number | null;
          sell_price?: number;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          character_id: string;
          item_id: string;
          quantity: number;
          slot_index: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          item_id: string;
          quantity?: number;
          slot_index?: number | null;
          created_at?: string;
        };
        Update: {
          quantity?: number;
          slot_index?: number | null;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          contract_type: string;
          summary: string;
          description: string;
          zone_id: string;
          required_level: number;
          reward_xp: number;
          reward_gold: number;
          reward_items: string[];
          objectives: Record<string, unknown>[];
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          contract_type: string;
          summary: string;
          description: string;
          zone_id: string;
          required_level?: number;
          reward_xp?: number;
          reward_gold?: number;
          reward_items?: string[];
          objectives?: Record<string, unknown>[];
          created_at?: string;
        };
        Update: {
          slug?: string;
          title?: string;
          contract_type?: string;
          summary?: string;
          description?: string;
          zone_id?: string;
          required_level?: number;
          reward_xp?: number;
          reward_gold?: number;
          reward_items?: string[];
          objectives?: Record<string, unknown>[];
        };
        Relationships: [];
      };
      character_contracts: {
        Row: {
          id: string;
          character_id: string;
          contract_id: string;
          status: string;
          progress: Record<string, number>;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          character_id: string;
          contract_id: string;
          status?: string;
          progress?: Record<string, number>;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: string;
          progress?: Record<string, number>;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      world_events: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          zone_id: string;
          starts_at: string | null;
          ends_at: string | null;
          status: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          zone_id: string;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          slug?: string;
          title?: string;
          description?: string;
          zone_id?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          status?: string;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      player_deeds: {
        Row: {
          id: string;
          character_id: string;
          deed_type: string;
          title: string;
          description: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          deed_type: string;
          title: string;
          description: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          deed_type?: string;
          title?: string;
          description?: string;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
