import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Mail, Edit2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isValidPhoneNumber } from 'libphonenumber-js';

export function CustomerProfile() {
  const { customer, refreshCustomer } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_number: ''
  });
  const [contactError, setContactError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        contact_number: (customer as any).contact_number || ''
      });
    }
  }, [customer]);

  const validateContact = (contact: string) => {
    if (!contact) {
      setContactError('Contact number is required');
      return false;
    }
    
    try {
      if (!isValidPhoneNumber(contact)) {
        setContactError('Please enter a valid phone number');
        return false;
      }
      setContactError('');
      return true;
    } catch {
      setContactError('Please enter a valid phone number');
      return false;
    }
  };

  const handleSave = async () => {
    if (!customer) return;
    if (!validateContact(formData.contact_number)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          contact_number: formData.contact_number
        })
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });

      setIsEditing(false);
      await refreshCustomer();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        contact_number: (customer as any).contact_number || ''
      });
    }
    setContactError('');
    setIsEditing(false);
  };

  if (!customer) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Your Profile
            </CardTitle>
            <CardDescription>
              Manage your personal information and contact details
            </CardDescription>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            {isEditing ? (
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{customer.name || 'Not set'}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number</Label>
            {isEditing ? (
              <div>
                <Input
                  id="contact"
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) => {
                    setFormData({ ...formData, contact_number: e.target.value });
                    if (contactError) validateContact(e.target.value);
                  }}
                  placeholder="+1 555 123 4567"
                />
                {contactError && (
                  <p className="text-sm text-destructive mt-1">{contactError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{(customer as any).contact_number || 'Not set'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Email Address</Label>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{customer.email}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Email cannot be changed. Contact support if you need to update your email.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Referral Code</Label>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <code className="font-mono font-semibold">{customer.referral_code}</code>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this code with friends to earn rewards when they sign up.
          </p>
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading || !!contactError}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handleCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}