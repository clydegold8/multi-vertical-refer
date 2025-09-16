import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Ban, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  role: string;
  created_at: string;
}

interface CustomerStats {
  total_customers: number;
  total_referrals: number;
  total_rewards: number;
  active_rewards: number;
}

interface CustomerManagerProps {
  verticalId: string;
}

export function CustomerManager({ verticalId }: CustomerManagerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total_customers: 0,
    total_referrals: 0,
    total_rewards: 0,
    active_rewards: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [verticalId]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('vertical_id', verticalId)
      .eq('role', 'customer')
      .order('created_at', { ascending: false });
    
    if (data) setCustomers(data);
    setLoading(false);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer? This will remove all their referrals, rewards, and bookings.')) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      
      toast({
        title: 'Customer deleted',
        description: 'The customer has been deleted successfully.',
      });
      
      fetchCustomers();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchStats = async () => {
    // Get total customers
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('vertical_id', verticalId)
      .eq('role', 'customer');

    // Get total referrals for this vertical
    const { count: referralCount } = await supabase
      .from('referrals')
      .select('*, referrer:customers!referrer_id(vertical_id)', { count: 'exact', head: true })
      .eq('referrer.vertical_id', verticalId);

    // Get total rewards for this vertical
    const { count: rewardCount } = await supabase
      .from('rewards')
      .select('*, customer:customers(vertical_id)', { count: 'exact', head: true })
      .eq('customer.vertical_id', verticalId);

    // Get active rewards for this vertical
    const { count: activeRewardCount } = await supabase
      .from('rewards')
      .select('*, customer:customers(vertical_id)', { count: 'exact', head: true })
      .eq('customer.vertical_id', verticalId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString());

    setStats({
      total_customers: customerCount || 0,
      total_referrals: referralCount || 0,
      total_rewards: rewardCount || 0,
      active_rewards: activeRewardCount || 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_customers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_referrals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_rewards}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_rewards}</div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({customers.length})</CardTitle>
          <CardDescription>
            All customers registered in your vertical
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Referral Code</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {customer.referral_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.role === 'admin' ? 'default' : 'secondary'}>
                          {customer.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(customer.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="h-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}