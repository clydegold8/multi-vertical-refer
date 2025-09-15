import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Service {
  id: string;
  name: string;
  tier: string;
}

interface RewardRule {
  id: string;
  service_id: string;
  discount_percent: number;
  max_per_month: number;
  expires_after_months: number;
  services: {
    name: string;
    tier: string;
  };
}

interface RewardRuleManagerProps {
  verticalId: string;
}

export function RewardRuleManager({ verticalId }: RewardRuleManagerProps) {
  const [rewardRules, setRewardRules] = useState<RewardRule[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null);
  const [formData, setFormData] = useState({
    service_id: '',
    discount_percent: 5,
    max_per_month: 5,
    expires_after_months: 12
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRewardRules();
    fetchServices();
  }, [verticalId]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('vertical_id', verticalId);
    
    if (data) setServices(data);
  };

  const fetchRewardRules = async () => {
    const { data } = await supabase
      .from('reward_rules')
      .select(`
        *,
        services (name, tier)
      `)
      .in('service_id', (await supabase
        .from('services')
        .select('id')
        .eq('vertical_id', verticalId)
      ).data?.map(s => s.id) || [])
      .order('created_at', { ascending: false });
    
    if (data) setRewardRules(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRule) {
        const { error } = await supabase
          .from('reward_rules')
          .update(formData)
          .eq('id', editingRule.id);

        if (error) throw error;
        
        toast({
          title: 'Reward rule updated',
          description: 'The reward rule has been updated successfully.',
        });
      } else {
        const { error } = await supabase
          .from('reward_rules')
          .insert(formData);

        if (error) throw error;
        
        toast({
          title: 'Reward rule created',
          description: 'The reward rule has been created successfully.',
        });
      }

      fetchRewardRules();
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

  const handleEdit = (rule: RewardRule) => {
    setEditingRule(rule);
    setFormData({
      service_id: rule.service_id,
      discount_percent: rule.discount_percent,
      max_per_month: rule.max_per_month,
      expires_after_months: rule.expires_after_months
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this reward rule?')) return;
    
    try {
      const { error } = await supabase
        .from('reward_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      
      toast({
        title: 'Reward rule deleted',
        description: 'The reward rule has been deleted successfully.',
      });
      
      fetchRewardRules();
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
      service_id: '',
      discount_percent: 5,
      max_per_month: 5,
      expires_after_months: 12
    });
    setEditingRule(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Reward Rules ({rewardRules.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Reward Rule' : 'Create New Reward Rule'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service_id">Service</Label>
                <Select value={formData.service_id} onValueChange={(value) => setFormData({ ...formData, service_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_percent">Discount Percentage</Label>
                <Input
                  id="discount_percent"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_per_month">Max Rewards Per Month</Label>
                <Input
                  id="max_per_month"
                  type="number"
                  min="1"
                  value={formData.max_per_month}
                  onChange={(e) => setFormData({ ...formData, max_per_month: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_after_months">Expires After (Months)</Label>
                <Input
                  id="expires_after_months"
                  type="number"
                  min="1"
                  value={formData.expires_after_months}
                  onChange={(e) => setFormData({ ...formData, expires_after_months: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingRule ? 'Update' : 'Create'} Rule
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
              <TableHead>Service</TableHead>
              <TableHead>Discount %</TableHead>
              <TableHead>Max/Month</TableHead>
              <TableHead>Expires After</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rewardRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No reward rules found
                </TableCell>
              </TableRow>
            ) : (
              rewardRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.services.name}</div>
                      <div className="text-sm text-muted-foreground">{rule.services.tier}</div>
                    </div>
                  </TableCell>
                  <TableCell>{rule.discount_percent}%</TableCell>
                  <TableCell>{rule.max_per_month}</TableCell>
                  <TableCell>{rule.expires_after_months} months</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(rule.id)}
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