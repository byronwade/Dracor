-- =============================================================================
-- Dracor: First Road — Initial Database Schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Utility: auto-update updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Table: profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Table: characters
-- ---------------------------------------------------------------------------
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ancestry TEXT NOT NULL DEFAULT 'dracor',
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  gold INT NOT NULL DEFAULT 0,
  weapon TEXT NOT NULL,
  memory TEXT NOT NULL,
  zone_id TEXT NOT NULL DEFAULT 'ironvale_town',
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  position_z FLOAT NOT NULL DEFAULT 0,
  appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_characters_user_id ON public.characters(user_id);
CREATE INDEX idx_characters_zone_id ON public.characters(zone_id);

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Table: items
-- ---------------------------------------------------------------------------
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  item_type TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  required_level INT NOT NULL DEFAULT 1,
  damage_min INT,
  damage_max INT,
  armor INT,
  sell_price INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_slug ON public.items(slug);
CREATE INDEX idx_items_item_type ON public.items(item_type);

-- ---------------------------------------------------------------------------
-- Table: inventory_items
-- ---------------------------------------------------------------------------
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  slot_index INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_character_id ON public.inventory_items(character_id);

-- ---------------------------------------------------------------------------
-- Table: contracts
-- ---------------------------------------------------------------------------
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  zone_id TEXT NOT NULL,
  required_level INT NOT NULL DEFAULT 1,
  reward_xp INT NOT NULL DEFAULT 0,
  reward_gold INT NOT NULL DEFAULT 0,
  reward_items TEXT[] NOT NULL DEFAULT '{}',
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_slug ON public.contracts(slug);
CREATE INDEX idx_contracts_zone_id ON public.contracts(zone_id);

-- ---------------------------------------------------------------------------
-- Table: character_contracts
-- ---------------------------------------------------------------------------
CREATE TABLE public.character_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_character_contracts_character_id ON public.character_contracts(character_id);
CREATE INDEX idx_character_contracts_status ON public.character_contracts(status);

-- ---------------------------------------------------------------------------
-- Table: world_events
-- ---------------------------------------------------------------------------
CREATE TABLE public.world_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  zone_id TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_world_events_slug ON public.world_events(slug);
CREATE INDEX idx_world_events_status ON public.world_events(status);

-- ---------------------------------------------------------------------------
-- Table: player_deeds
-- ---------------------------------------------------------------------------
CREATE TABLE public.player_deeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  deed_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_deeds_character_id ON public.player_deeds(character_id);
CREATE INDEX idx_player_deeds_deed_type ON public.player_deeds(deed_type);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================

-- profiles: users can read/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- characters: users can CRUD their own characters
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own characters"
  ON public.characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own characters"
  ON public.characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters"
  ON public.characters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own characters"
  ON public.characters FOR DELETE
  USING (auth.uid() = user_id);

-- items: public read access
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items are publicly readable"
  ON public.items FOR SELECT
  USING (true);

-- inventory_items: users can manage their own character's inventory
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory"
  ON public.inventory_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = inventory_items.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own inventory"
  ON public.inventory_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = inventory_items.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own inventory"
  ON public.inventory_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = inventory_items.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own inventory"
  ON public.inventory_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = inventory_items.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- contracts: public read access
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contracts are publicly readable"
  ON public.contracts FOR SELECT
  USING (true);

-- character_contracts: users can manage their own
ALTER TABLE public.character_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own character contracts"
  ON public.character_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_contracts.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own character contracts"
  ON public.character_contracts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_contracts.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own character contracts"
  ON public.character_contracts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = character_contracts.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- world_events: public read access
ALTER TABLE public.world_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "World events are publicly readable"
  ON public.world_events FOR SELECT
  USING (true);

-- player_deeds: users can view/insert their own
ALTER TABLE public.player_deeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deeds"
  ON public.player_deeds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = player_deeds.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own deeds"
  ON public.player_deeds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters
      WHERE characters.id = player_deeds.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- ===========================================================================
-- Seed Data
-- ===========================================================================

-- Starter Items
INSERT INTO public.items (slug, name, description, item_type, rarity, required_level, damage_min, damage_max, sell_price, metadata) VALUES
  ('rusted_blade', 'Rusted Blade', 'A short sword pitted with rust but still sharp enough to cut.', 'weapon', 'common', 1, 3, 6, 5, '{"weaponClass": "blade"}'::jsonb),
  ('roadwarden_bow', 'Roadwarden Bow', 'A simple shortbow carried by frontier patrol scouts.', 'weapon', 'common', 1, 2, 8, 5, '{"weaponClass": "bow"}'::jsonb),
  ('emberwood_staff', 'Emberwood Staff', 'A staff carved from emberwood that hums faintly with residual heat.', 'weapon', 'common', 1, 4, 5, 5, '{"weaponClass": "staff"}'::jsonb),
  ('ironroot_herb', 'Ironroot Herb', 'A tough, fibrous herb with medicinal properties. Grows in shaded forest groves.', 'material', 'common', 1, NULL, NULL, 2, '{}'::jsonb),
  ('ashroot_toolbox', 'Ashroot Toolbox', 'A heavy iron toolbox containing precision smithing instruments.', 'quest', 'common', 1, NULL, NULL, 0, '{"questItem": true}'::jsonb),
  ('wolf_fang', 'Wolf Fang', 'A sharp canine tooth from a Road Wolf. Valued by crafters and alchemists.', 'material', 'common', 1, NULL, NULL, 3, '{}'::jsonb),
  ('simple_health_draught', 'Simple Health Draught', 'A basic healing potion brewed from Ironroot and clean water. Restores a small amount of health.', 'consumable', 'common', 1, NULL, NULL, 5, '{"healAmount": 25}'::jsonb),
  ('spider_silk', 'Spider Silk', 'Strong, flexible silk harvested from mine spiders. Useful for crafting.', 'material', 'common', 1, NULL, NULL, 4, '{}'::jsonb);

-- Starter Contracts
INSERT INTO public.contracts (slug, title, contract_type, summary, description, zone_id, required_level, reward_xp, reward_gold, reward_items, objectives) VALUES
  (
    'clear_wolves',
    'Clear Wolves from the Old Road',
    'hunt',
    'The Road Wolves have grown bold. Thin their numbers.',
    'Road Wolves have been attacking travelers on the Old Road with increasing frequency. The Roadwarden scouts are stretched thin. Clear at least five wolves to make the route safer for merchants and settlers.',
    'old_road',
    1,
    50,
    20,
    '{}',
    '[{"id": "obj_kill_wolves", "description": "Kill Road Wolves", "targetCount": 5, "currentCount": 0}]'::jsonb
  ),
  (
    'ironroot_gathering',
    'Ironroot for the Healer',
    'gather',
    'Sela Fen needs Ironroot herbs from the Wolfpine Woods.',
    'The field healer Sela Fen is running low on Ironroot — a medicinal herb that only grows in the shaded groves of Wolfpine Woods. Gather enough to replenish her supplies before the next wave of injured settlers arrives.',
    'wolfpine_woods',
    2,
    35,
    15,
    '{"simple_health_draught"}',
    '[{"id": "obj_gather_ironroot", "description": "Gather Ironroot Herbs", "targetCount": 8, "currentCount": 0}]'::jsonb
  ),
  (
    'lost_tools',
    'Lost Tools of Ashroot',
    'recover',
    'Recover the missing toolbox from Ashroot Mine.',
    'When the miners fled Ashroot Mine, they left behind a toolbox containing irreplaceable precision instruments. Orin Ash needs them for his forge work. Venture into the mine and bring the toolbox back — but beware of what drove the miners out.',
    'ashroot_mine',
    3,
    75,
    30,
    '{}',
    '[{"id": "obj_recover_toolbox", "description": "Recover the Ashroot Toolbox", "targetCount": 1, "currentCount": 0}]'::jsonb
  );
