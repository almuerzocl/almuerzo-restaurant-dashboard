-- Create payment_options table
CREATE TABLE IF NOT EXISTS payment_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('cash', 'card', 'app', 'promotion')),
    discount_percentage INTEGER DEFAULT 0,
    institution_id UUID, -- For bank affiliations
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    valid_days TEXT[], -- Array of days e.g. ['Monday', 'Friday']
    service_scope TEXT[], -- e.g. ['takeaway', 'reservation']
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active payment options"
    ON payment_options FOR SELECT USING (is_active = true);
CREATE POLICY "Restaurant admins can manage their own options"
    ON payment_options FOR ALL USING (restaurant_id IS NULL OR restaurant_id IN (SELECT restaurant_id FROM user_profiles WHERE id = auth.uid()));

-- Create restaurant_global_discounts table
CREATE TABLE IF NOT EXISTS restaurant_global_discounts (
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    discount_id UUID REFERENCES payment_options(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (restaurant_id, discount_id)
);

ALTER TABLE restaurant_global_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Restaurant admins can manage their opt-ins"
    ON restaurant_global_discounts FOR ALL USING (restaurant_id IN (SELECT restaurant_id FROM user_profiles WHERE id = auth.uid()));

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';
