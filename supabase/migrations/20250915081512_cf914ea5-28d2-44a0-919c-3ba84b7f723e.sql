-- Fix the remaining function search path issue
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
$$ LANGUAGE plpgsql SET search_path = public;