import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Gift, Shield, TrendingUp } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-8 h-8 text-primary-foreground" />
            <h1 className="text-2xl font-bold text-primary-foreground">Referral Engine</h1>
          </div>
          <Link to="/login">
            <Button variant="secondary">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-primary-foreground mb-6">
            Turn Your Network Into Rewards
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Refer friends to services you love and earn discounts. Our multi-vertical platform 
            rewards you for every successful referral with tiered discounts that never expire.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-8 md:grid-cols-3 mb-16">
          <Card className="bg-white/10 border-white/20 text-primary-foreground">
            <CardHeader>
              <Share2 className="w-12 h-12 mb-4 text-primary-foreground" />
              <CardTitle>Easy Referrals</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                Share your unique referral code with friends and family
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-primary-foreground/80">
                Get a personalized referral code that tracks all your successful referrals 
                across multiple service verticals.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-primary-foreground">
            <CardHeader>
              <TrendingUp className="w-12 h-12 mb-4 text-primary-foreground" />
              <CardTitle>Tiered Rewards</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                Earn 5%-20% discounts based on service complexity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-primary-foreground/80">
                Simple services earn 5%, medium complexity services earn 10%, 
                and complex services reward you with 20% discounts.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-primary-foreground">
            <CardHeader>
              <Shield className="w-12 h-12 mb-4 text-primary-foreground" />
              <CardTitle>Abuse Protection</CardTitle>
              <CardDescription className="text-primary-foreground/70">
                Fair system with built-in security measures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-primary-foreground/80">
                No self-referrals, monthly limits, and expiring rewards ensure 
                a fair and sustainable referral ecosystem.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Service Verticals */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-primary-foreground mb-8">
            Available Service Verticals
          </h3>
          <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-primary-foreground">HVAC Services</CardTitle>
                <CardDescription className="text-primary-foreground/70">
                  AC Cleaning • Duct Installation • System Replacement
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-primary-foreground">Dental Clinic</CardTitle>
                <CardDescription className="text-primary-foreground/70">
                  Teeth Cleaning • Teeth Whitening • Dental Implants
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-white/20">
        <div className="text-center text-primary-foreground/60">
          <p>&copy; 2024 Referral Engine. Built with React and Supabase.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
