import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CalendarIcon, DollarSign, Percent, Info, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  tier: string;
  reward_rules: {
    discount_percent: number;
    max_per_month: number;
    expires_after_months: number;
  }[];
}

interface Reward {
  id: string;
  service_id: string;
  discount_percent: number;
  used: boolean;
  expires_at: string;
  created_at: string;
  services: {
    name: string;
  };
}

export default function Booking() {
  const { customer } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [service, setService] = useState<Service | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [selectedReward, setSelectedReward] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<Date>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  const serviceId = searchParams.get('service');
  const referralCode = searchParams.get('ref');

  // Mock service prices based on tier
  const getServicePrice = (tier: string) => {
    switch (tier) {
      case 'basic': return 199.99;
      case 'standard': return 399.99;
      case 'premium': return 799.99;
      default: return 299.99;
    }
  };

  const getDiscountPercent = (service: Service) => {
    return service.reward_rules[0]?.discount_percent || 0;
  };

  useEffect(() => {
    if (serviceId) {
      fetchService();
      fetchRewards();
    } else {
      setLoading(false);
    }
  }, [serviceId]);

  const fetchService = async () => {
    if (!serviceId) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('services')
      .select(`
        *,
        reward_rules (discount_percent, max_per_month, expires_after_months)
      `)
      .eq('id', serviceId)
      .single();
    
    if (data) setService(data);
    setLoading(false);
  };

  const fetchRewards = async () => {
    if (!customer || !serviceId) return;
    
    const { data } = await supabase
      .from('rewards')
      .select(`
        *,
        services (name)
      `)
      .eq('customer_id', customer.id)
      .eq('service_id', serviceId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (data) setRewards(data);
  };

  const handleBooking = async () => {
    if (!service || !customer || !bookingDate) {
      toast({
        title: 'Missing Information',
        description: 'Please select a booking date before proceeding.',
        variant: 'destructive',
      });
      return;
    }
    
    setBooking(true);
    try {
      const servicePrice = getServicePrice(service.tier);
      let discountPercent = referralCode ? getDiscountPercent(service) : 0;
      
      // Apply reward discount if selected
      const selectedRewardData = rewards.find(r => r.id === selectedReward);
      if (selectedRewardData) {
        discountPercent = Math.max(discountPercent, selectedRewardData.discount_percent);
      }
      
      const discountAmount = servicePrice * (discountPercent / 100);
      const totalEstimate = servicePrice - discountAmount;

      const { error } = await supabase
        .from('bookings')
        .insert({
          customer_id: customer.id,
          service_id: service.id,
          service_price: servicePrice,
          discount_estimate: discountAmount,
          total_estimate: totalEstimate,
          referral_code: referralCode,
          status: 'pending',
          booking_date: bookingDate.toISOString()
        });

      if (error) throw error;
      
      // Mark reward as used if selected
      if (selectedRewardData) {
        await supabase
          .from('rewards')
          .update({ used: true })
          .eq('id', selectedRewardData.id);
      }
      
      toast({
        title: 'Booking Created!',
        description: 'Your service has been booked. The technician will contact you soon.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Booking Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-2xl">
          <Button onClick={() => navigate('/dashboard')} variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Service Not Found</CardTitle>
              <CardDescription>The requested service could not be found.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const servicePrice = getServicePrice(service.tier);
  const discountPercent = referralCode ? getDiscountPercent(service) : 0;
  const discountAmount = servicePrice * (discountPercent / 100);
  const totalEstimate = servicePrice - discountAmount;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <Button onClick={() => navigate('/dashboard')} variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Book Service
                </CardTitle>
                <CardDescription>
                  Reserve {service.name} with a local technician
                </CardDescription>
              </div>
              <Badge variant={service.tier === 'premium' ? 'default' : 'secondary'}>
                {service.tier}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Service Details */}
            <div>
              <h3 className="font-semibold mb-2">{service.name}</h3>
              <p className="text-muted-foreground text-sm">
                Professional {service.tier} tier service with guaranteed quality.
                A certified technician in your area will contact you within 24 hours.
              </p>
            </div>

            {/* Referral Info */}
            {referralCode && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="w-4 h-4 text-success" />
                  <span className="font-medium text-success">Referral Discount Applied!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Using referral code: <code className="font-mono">{referralCode}</code>
                </p>
              </div>
            )}

            {/* Pricing Breakdown */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="w-5 h-5" />
                  Pricing Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Service Price</span>
                  <span className="font-medium">${servicePrice.toFixed(2)}</span>
                </div>
                
                {discountAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-success">
                      <span>Referral Discount ({discountPercent}%)</span>
                      <span className="font-medium">-${discountAmount.toFixed(2)}</span>
                    </div>
                    <Separator />
                  </>
                )}
                
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Estimated Total</span>
                  <span>${totalEstimate.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* POS Payment Info */}
            <div className="p-4 bg-muted/50 border border-muted rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Payment at Service Location</h4>
                  <p className="text-sm text-muted-foreground">
                    The final payment will be processed by the technician using their Point-of-Sale (POS) system. 
                    {referralCode && ' Your referral discount will be automatically applied at checkout.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Booking Button */}
            <div className="pt-4">
              <Button 
                onClick={handleBooking} 
                disabled={booking || !customer}
                className="w-full"
                size="lg"
              >
                {booking ? 'Creating Booking...' : 'Book This Service'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}