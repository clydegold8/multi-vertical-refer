import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, DollarSign, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Booking {
  id: string;
  service_id: string;
  service_price: number;
  discount_estimate: number;
  total_estimate: number;
  booking_date: string | null;
  status: string;
  referral_code: string | null;
  cancellation_count: number;
  created_at: string;
  services: {
    name: string;
    tier: string;
  };
}

export function BookingList() {
  const { customer } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customer) {
      fetchBookings();
    }
  }, [customer]);

  const fetchBookings = async () => {
    if (!customer) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        services (name, tier)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });
    
    if (data) setBookings(data);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'waiting_service': return 'default';
      case 'on_service': return 'default';
      case 'finished': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'waiting_service': return 'Waiting Service';
      case 'on_service': return 'On Service';
      case 'finished': return 'Finished';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const canCancelBooking = (booking: Booking) => {
    return (booking.status === 'pending' || booking.status === 'waiting_service') && booking.cancellation_count < 2;
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    const bookingToCancel = bookings.find(b => b.id === bookingId);
    if (!bookingToCancel) return;
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancellation_count: bookingToCancel.cancellation_count + 1
        })
        .eq('id', bookingId);

      if (error) throw error;
      
      toast({
        title: 'Booking cancelled',
        description: 'Your booking has been cancelled successfully.',
      });
      
      fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRebookService = async (booking: Booking) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          customer_id: customer!.id,
          service_id: booking.service_id,
          service_price: booking.service_price,
          discount_estimate: booking.discount_estimate,
          total_estimate: booking.total_estimate,
          referral_code: booking.referral_code,
          status: 'pending',
          booking_date: new Date().toISOString() // Will be updated when customer selects new date
        });

      if (error) throw error;
      
      toast({
        title: 'Service rebooked',
        description: 'Your service has been booked again. Please set a new date.',
      });
      
      fetchBookings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Your Bookings ({bookings.length})
        </CardTitle>
        <CardDescription>
          Manage your service bookings and track their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No bookings yet</p>
            <p className="text-sm text-muted-foreground">Book a service to see it here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cancellation Notice */}
            <div className="p-3 bg-muted/50 border border-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                ℹ️ You can cancel and rebook each service up to 2 times. Cancellation count resets for new bookings.
              </p>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Booking Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Cancellations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.services.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {booking.services.tier}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {booking.booking_date ? (
                            format(new Date(booking.booking_date), 'MMM dd, yyyy')
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${booking.total_estimate.toFixed(2)}
                        </div>
                        {booking.discount_estimate > 0 && (
                          <p className="text-xs text-success">
                            ${booking.discount_estimate.toFixed(2)} discount applied
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {booking.cancellation_count}/2
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {canCancelBooking(booking) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelBooking(booking.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                          {booking.status === 'cancelled' && booking.cancellation_count < 2 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRebookService(booking)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}