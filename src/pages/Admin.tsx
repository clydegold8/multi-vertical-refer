import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Plus, Edit, Trash2, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ServiceManager } from '@/components/admin/ServiceManager';
import { RewardRuleManager } from '@/components/admin/RewardRuleManager';
import { CustomerManager } from '@/components/admin/CustomerManager';
import { AdminManager } from '@/components/admin/AdminManager';
import { VerticalManager } from '@/components/admin/VerticalManager';
import { BookingManager } from '@/components/admin/BookingManager';

interface Vertical {
  id: string;
  name: string;
}

export default function Admin() {
  const { customer, signOut } = useAuth();
  const [vertical, setVertical] = useState<Vertical | null>(null);

  useEffect(() => {
    if (customer) {
      fetchVertical();
    }
  }, [customer]);

  const fetchVertical = async () => {
    if (!customer) return;
    
    const { data } = await supabase
      .from('verticals')
      .select('*')
      .eq('id', customer.vertical_id)
      .single();
    
    if (data) setVertical(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                {vertical?.name} - {customer?.name}
              </p>
            </div>
            <Button onClick={signOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="services" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="rewards">Reward Rules</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="verticals">Verticals</TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>Service Management</CardTitle>
                <CardDescription>
                  Manage services for your {vertical?.name} vertical
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ServiceManager verticalId={customer?.vertical_id || ''} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <Card>
              <CardHeader>
                <CardTitle>Reward Rules</CardTitle>
                <CardDescription>
                  Configure discount rules for your services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RewardRuleManager verticalId={customer?.vertical_id || ''} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>
                  View and manage customers in your vertical
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerManager verticalId={customer?.vertical_id || ''} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking Management</CardTitle>
                <CardDescription>
                  Manage all bookings, approve services, and track status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BookingManager verticalId={customer?.vertical_id || ''} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <CardTitle>Admin Management</CardTitle>
                <CardDescription>
                  Create and manage admin accounts for different verticals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminManager currentVerticalId={customer?.vertical_id || ''} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verticals">
            <Card>
              <CardHeader>
                <CardTitle>Vertical Management</CardTitle>
                <CardDescription>
                  Create and manage service verticals for the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VerticalManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}