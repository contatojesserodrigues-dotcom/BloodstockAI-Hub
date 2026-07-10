-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create enum types
CREATE TYPE public.user_plan AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.report_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE public.analysis_type AS ENUM ('pedigree', 'performance', 'mating', 'broodmare', 'market');

-- User roles table (for admin access)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table with subscription data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    plan user_plan NOT NULL DEFAULT 'basic',
    credits_remaining INTEGER DEFAULT 0,
    plan_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Horses table
CREATE TABLE public.horses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT,
    year_of_birth INTEGER,
    sex TEXT,
    sire TEXT,
    dam TEXT,
    dam_sire TEXT,
    breeder TEXT,
    owner TEXT,
    pedigree_data JSONB,
    performance_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.horses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view horses" ON public.horses
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage horses" ON public.horses
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Races table
CREATE TABLE public.races (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE,
    race_date DATE NOT NULL,
    track TEXT NOT NULL,
    distance INTEGER,
    position INTEGER,
    time_seconds DECIMAL,
    prize_money DECIMAL,
    race_type TEXT,
    conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view races" ON public.races
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage races" ON public.races
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Sales table
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,
    auction_house TEXT,
    sale_price DECIMAL,
    currency TEXT DEFAULT 'EUR',
    buyer TEXT,
    seller TEXT,
    sale_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sales" ON public.sales
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage sales" ON public.sales
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Stallions table
CREATE TABLE public.stallions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id UUID REFERENCES public.horses(id) ON DELETE CASCADE,
    stud_fee DECIMAL,
    stud_fee_currency TEXT DEFAULT 'EUR',
    farm TEXT,
    success_rate DECIMAL,
    total_progeny INTEGER DEFAULT 0,
    winners INTEGER DEFAULT 0,
    stakes_winners INTEGER DEFAULT 0,
    standing_location TEXT,
    statistics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stallions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stallions" ON public.stallions
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage stallions" ON public.stallions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PDF uploads table
CREATE TABLE public.pdf_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    status report_status DEFAULT 'pending',
    extracted_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.pdf_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uploads" ON public.pdf_uploads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads" ON public.pdf_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all uploads" ON public.pdf_uploads
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Analysis reports table
CREATE TABLE public.analysis_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    horse_id UUID REFERENCES public.horses(id) ON DELETE SET NULL,
    analysis_type analysis_type NOT NULL,
    status report_status DEFAULT 'pending',
    input_data JSONB NOT NULL,
    result_data JSONB,
    pdf_url TEXT,
    pedigree_score DECIMAL,
    performance_score DECIMAL,
    market_value_estimate DECIMAL,
    roi_projection TEXT,
    recommendations TEXT[],
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.analysis_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reports" ON public.analysis_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports" ON public.analysis_reports
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Matings analysis table
CREATE TABLE public.matings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    stallion_id UUID REFERENCES public.horses(id) ON DELETE CASCADE,
    mare_id UUID REFERENCES public.horses(id) ON DELETE CASCADE,
    compatibility_score DECIMAL,
    genetic_analysis JSONB,
    success_probability DECIMAL,
    estimated_value DECIMAL,
    recommendations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.matings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matings" ON public.matings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create matings" ON public.matings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Broodmare plans table
CREATE TABLE public.broodmare_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    mare_id UUID REFERENCES public.horses(id) ON DELETE CASCADE,
    recommended_stallions JSONB,
    breeding_goals TEXT,
    analysis_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.broodmare_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own broodmare plans" ON public.broodmare_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create broodmare plans" ON public.broodmare_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Activity logs table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert logs" ON public.activity_logs
    FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_horses_name ON public.horses(name);
CREATE INDEX idx_races_horse_id ON public.races(horse_id);
CREATE INDEX idx_races_date ON public.races(race_date);
CREATE INDEX idx_sales_horse_id ON public.sales(horse_id);
CREATE INDEX idx_stallions_horse_id ON public.stallions(horse_id);
CREATE INDEX idx_pdf_uploads_user_id ON public.pdf_uploads(user_id);
CREATE INDEX idx_analysis_reports_user_id ON public.analysis_reports(user_id);
CREATE INDEX idx_matings_user_id ON public.matings(user_id);
CREATE INDEX idx_broodmare_plans_user_id ON public.broodmare_plans(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_horses_updated_at BEFORE UPDATE ON public.horses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stallions_updated_at BEFORE UPDATE ON public.stallions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, email, plan, credits_remaining)
    VALUES (
        NEW.id,
        NEW.id,
        NEW.email,
        'basic',
        3
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();