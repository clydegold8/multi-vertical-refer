-- Enable RLS on customers table (fixing linter warning)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers table
CREATE POLICY "Users can view their own profile"
ON public.customers
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.customers
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins can view customers in their vertical"
ON public.customers  
FOR SELECT
USING (
  get_current_user_role() = 'admin' AND 
  vertical_id = get_current_user_vertical()
);

CREATE POLICY "System can create customer profiles"
ON public.customers
FOR INSERT
WITH CHECK (true);

-- Create bookings table for the booking system
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  service_price DECIMAL(10,2) NOT NULL,
  discount_estimate DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_estimate DECIMAL(10,2) NOT NULL,
  referral_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for bookings
CREATE POLICY "Users can view their own bookings"
ON public.bookings
FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "Users can create their own bookings"
ON public.bookings  
FOR INSERT
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update their own bookings"
ON public.bookings
FOR UPDATE  
USING (customer_id = auth.uid());

CREATE POLICY "Admins can view bookings in their vertical"
ON public.bookings
FOR SELECT
USING (
  get_current_user_role() = 'admin' AND 
  service_id IN (
    SELECT id FROM public.services 
    WHERE vertical_id = get_current_user_vertical()
  )
);

-- Add trigger for bookings updated_at
CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();