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
  signOut: async () => { },
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
    // onAuthStateChange já entrega o estado inicial da sessão como primeiro evento,
    // portanto não é necessário chamar getSession() separadamente.
    // Múltiplas chamadas de getSession() + listeners duplicados causam loop de refresh (429).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // TOKEN_REFRESH_FAILED = o client falhou em refrescar (ex: 429 ou token inválido).
        // Nesse caso, limpamos o estado e redirecionamos para o login —
        // evitando que o Supabase continue tentando refrescar em loop.
        if (event === 'TOKEN_REFRESH_FAILED') {
          setSession(null);
          setUser(null);
          setShopName(null);
          setLogoUrl(null);
          setShippingPricePerKg(0);
          // Remove tokens stale do localStorage para que na próxima visita
          // o client não tente refrescar um token já inválido.
          Object.keys(localStorage)
            .filter((k) => k.startsWith('sb-'))
            .forEach((k) => localStorage.removeItem(k));
          navigate('/auth');
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchShopName(session.user.id);
        } else {
          setShopName(null);
          setLogoUrl(null);
          setShippingPricePerKg(0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

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
