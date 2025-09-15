import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Admin {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  vertical_id: string;
  created_at: string;
  verticals: {
    name: string;
  };
}

interface Vertical {
  id: string;
  name: string;
}

interface AdminManagerProps {
  currentVerticalId: string;
}

export function AdminManager({ currentVerticalId }: AdminManagerProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    vertical_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAdmins();
    fetchVerticals();
  }, []);

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from('customers')
      .select(`
        *,
        verticals (name)
      `)
      .eq('role', 'admin')
      .order('created_at', { ascending: false });
    
    if (data) setAdmins(data);
  };

  const fetchVerticals = async () => {
    const { data } = await supabase.from('verticals').select('*');
    if (data) setVerticals(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true
      });

      if (authError) throw authError;

      if (authData.user) {
        // Generate referral code
        const { data: codeData } = await supabase.rpc('generate_referral_code');
        
        // Create admin profile
        const { error: profileError } = await supabase
          .from('customers')
          .insert({
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            referral_code: codeData || 'TEMP',
            vertical_id: formData.vertical_id,
            role: 'admin'
          });

        if (profileError) throw profileError;
        
        toast({
          title: 'Admin created',
          description: 'The admin account has been created successfully.',
        });

        fetchAdmins();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin account?')) return;
    
    try {
      // Delete from customers table (auth user will be cascade deleted)
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', adminId);

      if (error) throw error;
      
      toast({
        title: 'Admin deleted',
        description: 'The admin account has been deleted successfully.',
      });
      
      fetchAdmins();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      vertical_id: ''
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Admin Accounts ({admins.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Admin Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vertical_id">Vertical</Label>
                <Select value={formData.vertical_id} onValueChange={(value) => setFormData({ ...formData, vertical_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vertical" />
                  </SelectTrigger>
                  <SelectContent>
                    {verticals.map((vertical) => (
                      <SelectItem key={vertical.id} value={vertical.id}>
                        {vertical.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Create Admin
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Referral Code</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No admin accounts found
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant={admin.vertical_id === currentVerticalId ? 'default' : 'secondary'}>
                      {admin.verticals.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {admin.referral_code}
                    </code>
                  </TableCell>
                  <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(admin.id)}
                      disabled={admin.id === admin.id} // Prevent self-deletion
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}