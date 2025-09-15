-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'admin');

-- Create tier enum  
CREATE TYPE public.service_tier AS ENUM ('simple', 'medium', 'complex');

-- Create verticals table
CREATE TABLE public.verticals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tier public.service_tier NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reward_rules table
CREATE TABLE public.reward_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    max_per_month INTEGER NOT NULL CHECK (max_per_month > 0),
    expires_after_months INTEGER NOT NULL CHECK (expires_after_months > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table (acts as profiles table)
CREATE TABLE public.customers (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    referral_code TEXT NOT NULL UNIQUE,
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referrals table
CREATE TABLE public.referrals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    reward_id UUID, -- will be set when reward is created
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT no_self_referral CHECK (referrer_id != referee_id)
);

-- Create rewards table
CREATE TABLE public.rewards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update referrals table to reference rewards
ALTER TABLE public.referrals ADD CONSTRAINT fk_referrals_reward_id 
    FOREIGN KEY (reward_id) REFERENCES public.rewards(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.app_role AS $$
BEGIN
    RETURN (SELECT role FROM public.customers WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create function to get current user vertical
CREATE OR REPLACE FUNCTION public.get_current_user_vertical()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT vertical_id FROM public.customers WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create RLS policies for verticals
CREATE POLICY "Anyone can view verticals" ON public.verticals FOR SELECT USING (true);
CREATE POLICY "Admins can manage verticals" ON public.verticals FOR ALL USING (public.get_current_user_role() = 'admin');

-- Create RLS policies for services
CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admins can manage services in their vertical" ON public.services 
    FOR ALL USING (public.get_current_user_role() = 'admin' AND vertical_id = public.get_current_user_vertical());

-- Create RLS policies for reward_rules
CREATE POLICY "Anyone can view reward rules" ON public.reward_rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage reward rules in their vertical" ON public.reward_rules 
    FOR ALL USING (
        public.get_current_user_role() = 'admin' AND 
        service_id IN (SELECT id FROM public.services WHERE vertical_id = public.get_current_user_vertical())
    );

-- Create RLS policies for customers
CREATE POLICY "Users can view their own profile" ON public.customers FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.customers FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.customers FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can view customers in their vertical" ON public.customers 
    FOR SELECT USING (public.get_current_user_role() = 'admin' AND vertical_id = public.get_current_user_vertical());
CREATE POLICY "Admins can manage customers in their vertical" ON public.customers 
    FOR ALL USING (public.get_current_user_role() = 'admin' AND vertical_id = public.get_current_user_vertical());

-- Create RLS policies for referrals
CREATE POLICY "Users can view their referrals" ON public.referrals 
    FOR SELECT USING (referrer_id = auth.uid() OR referee_id = auth.uid());
CREATE POLICY "Users can create referrals" ON public.referrals 
    FOR INSERT WITH CHECK (referrer_id = auth.uid());
CREATE POLICY "Admins can view referrals in their vertical" ON public.referrals 
    FOR SELECT USING (
        public.get_current_user_role() = 'admin' AND 
        (referrer_id IN (SELECT id FROM public.customers WHERE vertical_id = public.get_current_user_vertical()) OR
         referee_id IN (SELECT id FROM public.customers WHERE vertical_id = public.get_current_user_vertical()))
    );

-- Create RLS policies for rewards
CREATE POLICY "Users can view their rewards" ON public.rewards FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users can update their rewards" ON public.rewards FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "System can create rewards" ON public.rewards FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view rewards in their vertical" ON public.rewards 
    FOR SELECT USING (
        public.get_current_user_role() = 'admin' AND 
        customer_id IN (SELECT id FROM public.customers WHERE vertical_id = public.get_current_user_vertical())
    );

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 8));
        SELECT COUNT(*) INTO exists_count FROM public.customers WHERE referral_code = code;
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_verticals_updated_at BEFORE UPDATE ON public.verticals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reward_rules_updated_at BEFORE UPDATE ON public.reward_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data
-- Verticals
INSERT INTO public.verticals (id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'HVAC'),
    ('66666666-6666-6666-6666-666666666666', 'Dental Clinic');

-- HVAC Services
INSERT INTO public.services (id, vertical_id, name, tier) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'AC Cleaning', 'simple'),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Duct Installation', 'medium'),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Full System Replacement', 'complex');

-- Dental Services  
INSERT INTO public.services (id, vertical_id, name, tier) VALUES
    ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', 'Teeth Cleaning', 'simple'),
    ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', 'Teeth Whitening', 'medium'),
    ('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', 'Dental Implant', 'complex');

-- HVAC Reward Rules
INSERT INTO public.reward_rules (service_id, discount_percent, max_per_month, expires_after_months) VALUES
    ('22222222-2222-2222-2222-222222222222', 5, 5, 12),
    ('33333333-3333-3333-3333-333333333333', 10, 5, 12),
    ('44444444-4444-4444-4444-444444444444', 20, 5, 12);

-- Dental Reward Rules
INSERT INTO public.reward_rules (service_id, discount_percent, max_per_month, expires_after_months) VALUES
    ('77777777-7777-7777-7777-777777777777', 5, 5, 12),
    ('88888888-8888-8888-8888-888888888888', 10, 5, 12),
    ('99999999-9999-9999-9999-999999999999', 20, 5, 12);