import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  vertical_id: string;
  role: "customer" | "admin";
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  customer: Customer | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    verticalId: string,
    contactNumber: string,
    referralCode?: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomer = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching customer:", error);
        return;
      }

      setCustomer(data);
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  const refreshCustomer = async () => {
    if (user) {
      await fetchCustomer(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Defer customer fetching to prevent deadlock
      if (session?.user) {
        setTimeout(() => {
          fetchCustomer(session.user.id);
        }, 0);
      } else {
        setCustomer(null);
      }

      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchCustomer(session.user.id);
        }, 0);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    verticalId: string,
    contactNumber: string,
    referralCode?: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      // 🔹 1. Create the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });

      if (error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      const user = data.user;
      if (!user) {
        return { error: new Error("User was not created") };
      }

      // 🔹 2. Generate referral code from your RPC
      const { data: codeData, error: codeError } = await supabase.rpc(
        "generate_referral_code"
      );

      if (codeError) {
        console.error("Error generating referral code:", codeError.message);
      }

      // Store referral info in separate field for trigger processing
      const customerData: any = {
        id: user.id, // matches auth.users.id
        name,
        email,
        vertical_id: verticalId,
        role: "customer",
        referral_code: codeData || "TEMP",
        contact_number: contactNumber,
      };

      // Add referral code for trigger processing if provided
      if (referralCode) {
        customerData.referral_code = referralCode;
      }

      const { error: profileError } = await supabase.from("customers").insert(customerData);

      if (profileError) {
        console.error("Error creating customer profile:", profileError.message);
      }

      toast({
        title: "Account Created",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (err: any) {
      toast({
        title: "Sign Up Error",
        description: err.message,
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Sign Out Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const value = {
    user,
    session,
    customer,
    loading,
    signUp,
    signIn,
    signOut,
    refreshCustomer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
