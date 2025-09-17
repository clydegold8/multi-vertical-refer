-- Add contact_number field to customers table
ALTER TABLE public.customers 
ADD COLUMN contact_number text DEFAULT '+1-555-0000';

-- Add cancellation_count field to bookings table for tracking rebooking limits
ALTER TABLE public.bookings 
ADD COLUMN cancellation_count integer NOT NULL DEFAULT 0;

-- Update booking_date to be nullable so we can set it from frontend
ALTER TABLE public.bookings 
ALTER COLUMN booking_date DROP DEFAULT,
ALTER COLUMN booking_date SET DEFAULT NULL;

-- Create function to automatically create rewards when someone signs up with referral code
CREATE OR REPLACE FUNCTION public.create_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
    referrer_customer_id uuid;
    reward_rule record;
BEGIN
    -- Check if this customer was referred by someone
    IF NEW.referral_code IS NOT NULL AND NEW.referral_code != '' THEN
        -- Find the referring customer
        SELECT id INTO referrer_customer_id 
        FROM public.customers 
        WHERE referral_code = NEW.referral_code 
        AND vertical_id = NEW.vertical_id;
        
        IF referrer_customer_id IS NOT NULL THEN
            -- Get reward rules for services in this vertical
            FOR reward_rule IN 
                SELECT rr.*, s.id as service_id
                FROM public.reward_rules rr
                JOIN public.services s ON s.id = rr.service_id
                WHERE s.vertical_id = NEW.vertical_id
            LOOP
                -- Create reward for the referrer
                INSERT INTO public.rewards (
                    customer_id,
                    service_id,
                    discount_percent,
                    expires_at
                ) VALUES (
                    referrer_customer_id,
                    reward_rule.service_id,
                    reward_rule.discount_percent,
                    now() + interval '1 month' * reward_rule.expires_after_months
                );
            END LOOP;
            
            -- Create referral record
            INSERT INTO public.referrals (
                referrer_id,
                referee_id,
                service_id
            ) VALUES (
                referrer_customer_id,
                NEW.id,
                (SELECT id FROM public.services WHERE vertical_id = NEW.vertical_id LIMIT 1)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic reward creation
CREATE TRIGGER on_customer_signup_with_referral
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.create_referral_reward();