import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Gift, Share2, LogOut, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

export default function Dashboard() {
  const { customer, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customer) {
      fetchServices();
      fetchRewards();
    }
  }, [customer]);

  const fetchServices = async () => {
    if (!customer) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('services')
      .select(`
        *,
        reward_rules (discount_percent, max_per_month, expires_after_months)
      `)
      .eq('vertical_id', customer.vertical_id);
    
    if (data) setServices(data);
    setLoading(false);
  };

  const fetchRewards = async () => {
    if (!customer) return;
    
    const { data } = await supabase
      .from('rewards')
      .select(`
        *,
        services (name)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });
    
    if (data) setRewards(data);
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/signup?ref=${customer?.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    toast({
      title: 'Referral link copied!',
      description: 'Share this link with friends to earn rewards.',
    });
  };

  const handleBookService = (serviceId: string) => {
    navigate(`/booking?service=${serviceId}`);
  };

  const useReward = async (rewardId: string) => {
    const { error } = await supabase
      .from('rewards')
      .update({ used: true })
      .eq('id', rewardId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to use reward.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Reward used!',
        description: 'Your discount has been applied.',
      });
      fetchRewards();
    }
  };

  const unusedRewards = rewards.filter(r => !r.used && new Date(r.expires_at) > new Date());
  const usedRewards = rewards.filter(r => r.used);
  const expiredRewards = rewards.filter(r => !r.used && new Date(r.expires_at) <= new Date());

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {customer?.name}</h1>
              <p className="text-muted-foreground">Your referral dashboard</p>
            </div>
            <Button onClick={signOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Referral Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Your Referral Code
            </CardTitle>
            <CardDescription>
              Share your referral code with friends and earn rewards when they book services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <code className="text-lg font-mono font-semibold flex-1">
                {customer?.referral_code}
              </code>
              <Button onClick={copyReferralLink} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Services Section */}
        <Card>
          <CardHeader>
            <CardTitle>Available Services</CardTitle>
            <CardDescription>
              Services you can refer friends to and book yourself
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <div key={service.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{service.name}</h3>
                      <Badge variant="secondary">
                        {service.tier}
                      </Badge>
                    </div>
                    {service.reward_rules.map((rule, index) => (
                      <div key={index} className="mb-3 text-sm text-muted-foreground">
                        <p>Earn {rule.discount_percent}% discount per referral</p>
                        <p>Max {rule.max_per_month} rewards/month</p>
                        <p>Expires after {rule.expires_after_months} months</p>
                      </div>
                    ))}
                    <Button 
                      onClick={() => handleBookService(service.id)}
                      className="w-full mt-2"
                      size="sm"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Service
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rewards Section */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Active Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Active Rewards ({unusedRewards.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {unusedRewards.length === 0 ? (
                <p className="text-muted-foreground text-sm">No active rewards</p>
              ) : (
                unusedRewards.map((reward) => (
                  <div key={reward.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{reward.services.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {reward.discount_percent}% discount
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(reward.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => useReward(reward.id)}
                        className="bg-success hover:bg-success/90"
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Used Rewards */}
          <Card>
            <CardHeader>
              <CardTitle>Used Rewards ({usedRewards.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {usedRewards.length === 0 ? (
                <p className="text-muted-foreground text-sm">No used rewards</p>
              ) : (
                usedRewards.slice(0, 5).map((reward) => (
                  <div key={reward.id} className="p-3 border rounded-lg opacity-60">
                    <p className="font-medium">{reward.services.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {reward.discount_percent}% discount - Used
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Expired Rewards */}
          <Card>
            <CardHeader>
              <CardTitle>Expired Rewards ({expiredRewards.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {expiredRewards.length === 0 ? (
                <p className="text-muted-foreground text-sm">No expired rewards</p>
              ) : (
                expiredRewards.slice(0, 5).map((reward) => (
                  <div key={reward.id} className="p-3 border rounded-lg opacity-40">
                    <p className="font-medium">{reward.services.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {reward.discount_percent}% discount - Expired
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}