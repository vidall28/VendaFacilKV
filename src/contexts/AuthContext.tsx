import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  shopName: string | null;
  logoUrl: string | null;
  shippingPricePerKg: number;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  shopName: null,
  logoUrl: null,
  shippingPricePerKg: 0,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [shippingPricePerKg, setShippingPricePerKg] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchShopName(session.user.id);
          }, 0);
        } else {
          setShopName(null);
          setLogoUrl(null);
          setShippingPricePerKg(0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchShopName(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchShopName = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('shop_name, logo_url, shipping_price_per_kg')
      .eq('id', userId)
      .single();
    
    if (data) {
      setShopName(data.shop_name);
      setLogoUrl(data.logo_url);
      setShippingPricePerKg(data.shipping_price_per_kg || 0);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, shopName, logoUrl, shippingPricePerKg, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
