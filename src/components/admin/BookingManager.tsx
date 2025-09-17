import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, User, Phone, Mail, Trash2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Booking {
  id: string;
  customer_id: string;
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
  customers: {
    name: string;
    email: string;
    contact_number: string;
  };
}

interface BookingStats {
  total_bookings: number;
  pending_bookings: number;
  active_bookings: number;
  completed_bookings: number;
}

interface BookingManagerProps {
  verticalId: string;
}

export function BookingManager({ verticalId }: BookingManagerProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    total_bookings: 0,
    pending_bookings: 0,
    active_bookings: 0,
    completed_bookings: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, [verticalId]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        services (name, tier),
        customers (name, email, contact_number)
      `)
      .eq('services.vertical_id', verticalId)
      .order('created_at', { ascending: false });
    
    if (data) setBookings(data);
    setLoading(false);
  };

  const fetchStats = async () => {
    // Get total bookings for this vertical
    const { count: totalCount } = await supabase
      .from('bookings')
      .select('*, services!inner(vertical_id)', { count: 'exact', head: true })
      .eq('services.vertical_id', verticalId);

    // Get pending bookings
    const { count: pendingCount } = await supabase
      .from('bookings')
      .select('*, services!inner(vertical_id)', { count: 'exact', head: true })
      .eq('services.vertical_id', verticalId)
      .eq('status', 'pending');

    // Get active bookings (waiting_service + on_service)
    const { count: activeCount } = await supabase
      .from('bookings')
      .select('*, services!inner(vertical_id)', { count: 'exact', head: true })
      .eq('services.vertical_id', verticalId)
      .in('status', ['confirmed']);

    // Get completed bookings
    const { count: completedCount } = await supabase
      .from('bookings')
      .select('*, services!inner(vertical_id)', { count: 'exact', head: true })
      .eq('services.vertical_id', verticalId)
      .eq('status', 'done');

    setStats({
      total_bookings: totalCount || 0,
      pending_bookings: pendingCount || 0,
      active_bookings: activeCount || 0,
      completed_bookings: completedCount || 0
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'done': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'done': return 'Done';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)

      if (error) throw error;
      
      toast({
        title: 'Booking updated',
        description: `Booking status changed to ${getStatusLabel(newStatus)}.`,
      });
      
      fetchBookings();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    await handleStatusChange(bookingId, 'confirmed');
  };

  const handleCompleteBooking = async (bookingId: string) => {
    await handleStatusChange(bookingId, 'done');
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return;
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)
        .select();

      if (error) throw error;
      
      toast({
        title: 'Booking deleted',
        description: 'The booking has been deleted successfully.',
      });
      
      fetchBookings();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_bookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_bookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_bookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed_bookings}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings Management ({bookings.length})</CardTitle>
          <CardDescription>
            Manage all bookings in your vertical - approve, complete, and track status
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
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Booking Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No bookings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{booking.customers.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span>{booking.customers.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{booking.customers.contact_number}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.services.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {booking.services.tier}
                            </Badge>
                            {booking.referral_code && (
                              <p className="text-xs text-success mt-1">
                                Ref: {booking.referral_code}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {booking.booking_date ? (
                              format(new Date(booking.booking_date), 'MMM dd, yyyy')
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={booking.status}
                            onValueChange={(value) => handleStatusChange(booking.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                               <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ${booking.total_estimate.toFixed(2)}
                          </div>
                          {booking.discount_estimate > 0 && (
                            <p className="text-xs text-success">
                              ${booking.discount_estimate.toFixed(2)} discount
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {booking.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveBooking(booking.id)}
                                className="text-success border-success hover:bg-success/10"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            {(booking.status === 'confirmed' || booking.status === 'on_service') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteBooking(booking.id)}
                                className="text-success border-success hover:bg-success/10"
                              >
                                Complete
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteBooking(booking.id)}
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