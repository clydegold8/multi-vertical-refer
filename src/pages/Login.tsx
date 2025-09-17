import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

interface Vertical {
  id: string;
  name: string;
}

export default function Login() {
  const { user, customer, signIn, signUp } = useAuth();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  
  // Extract referral code from URL
  const searchParams = new URLSearchParams(location.search);
  const refCode = searchParams.get('ref');

  // Sign In Form
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up Form
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpVertical, setSignUpVertical] = useState('');
  const [signUpContact, setSignUpContact] = useState('');
  const [referralCode, setReferralCode] = useState(refCode || '');
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    fetchVerticals();
  }, []);

  const fetchVerticals = async () => {
    const { data } = await supabase.from('verticals').select('*');
    if (data) setVerticals(data);
  };

  // Redirect if already authenticated
  const from = (location.state as any)?.from?.pathname || (customer?.role === 'admin' ? '/admin' : '/dashboard');
  if (user && customer) {
    return <Navigate to={from} replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn(signInEmail, signInPassword);
    setIsLoading(false);
  };

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpVertical) return;
    if (!validateContact(signUpContact)) return;
    
    setIsLoading(true);
    await signUp(signUpEmail, signUpPassword, signUpName, signUpVertical, signUpContact, referralCode);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Referral Engine</CardTitle>
          <CardDescription>Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Demo accounts:</p>
                <p className="text-xs">HVAC Admin: hvac_admin@email.com / @admin</p>
                <p className="text-xs">Dental Admin: dental_admin@email.com / @admin</p>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              {refCode && (
                <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm text-success font-medium">
                    🎉 You're signing up with referral code: <code className="font-mono">{refCode}</code>
                  </p>
                </div>
              )}
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-contact">Contact Number</Label>
                  <Input
                    id="signup-contact"
                    type="tel"
                    value={signUpContact}
                    onChange={(e) => {
                      setSignUpContact(e.target.value);
                      if (contactError) validateContact(e.target.value);
                    }}
                    placeholder="+1 555 123 4567"
                    required
                  />
                  {contactError && (
                    <p className="text-sm text-destructive">{contactError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-vertical">Service Vertical</Label>
                  <Select value={signUpVertical} onValueChange={setSignUpVertical} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service vertical" />
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
                {refCode && (
                  <div className="space-y-2">
                    <Label htmlFor="referral-code">Referral Code (Optional)</Label>
                    <Input
                      id="referral-code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Enter referral code"
                      className="bg-muted"
                    />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading || !signUpVertical || !signUpContact}>
                  {isLoading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}