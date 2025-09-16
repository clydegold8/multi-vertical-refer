import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Vertical {
  id: string;
  name: string;
  created_at: string;
}

export function VerticalManager() {
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVertical, setEditingVertical] = useState<Vertical | null>(null);
  const [formData, setFormData] = useState({
    name: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchVerticals();
  }, []);

  const fetchVerticals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('verticals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setVerticals(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingVertical) {
        // Update existing vertical
        const { error } = await supabase
          .from('verticals')
          .update({ name: formData.name })
          .eq('id', editingVertical.id);

        if (error) throw error;
        
        toast({
          title: 'Vertical updated',
          description: 'The vertical has been updated successfully.',
        });
      } else {
        // Create new vertical
        const { error } = await supabase
          .from('verticals')
          .insert({ name: formData.name });

        if (error) throw error;
        
        toast({
          title: 'Vertical created',
          description: 'The vertical has been created successfully.',
        });
      }

      fetchVerticals();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (vertical: Vertical) => {
    setEditingVertical(vertical);
    setFormData({ name: vertical.name });
    setIsDialogOpen(true);
  };

  const handleDelete = async (verticalId: string) => {
    if (!confirm('Are you sure you want to delete this vertical? All associated services and customers will be affected.')) return;
    
    try {
      const { error } = await supabase
        .from('verticals')
        .delete()
        .eq('id', verticalId);

      if (error) throw error;
      
      toast({
        title: 'Vertical deleted',
        description: 'The vertical has been deleted successfully.',
      });
      
      fetchVerticals();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingVertical(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Service Verticals ({verticals.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create Vertical
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVertical ? 'Edit Vertical' : 'Create New Vertical'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Vertical Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., HVAC Services, Dental Clinic"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingVertical ? 'Update Vertical' : 'Create Vertical'}
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
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {verticals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No verticals found
                </TableCell>
              </TableRow>
            ) : (
              verticals.map((vertical) => (
                <TableRow key={vertical.id}>
                  <TableCell className="font-medium">{vertical.name}</TableCell>
                  <TableCell>{new Date(vertical.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(vertical)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(vertical.id)}
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
    </div>
  );
}