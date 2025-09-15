-- Fix security definer functions by setting search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.app_role AS $$
BEGIN
    RETURN (SELECT role FROM public.customers WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_user_vertical()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT vertical_id FROM public.customers WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;