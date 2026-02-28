import { ShoppingCart, Package, History, LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { shopName, signOut } = useAuth();
  
  const menuItems = [
    {
      title: "Nova Venda",
      description: "Iniciar uma nova venda",
      icon: ShoppingCart,
      path: "/venda",
      gradient: "from-primary to-primary/80",
    },
    {
      title: "Produtos",
      description: "Gerenciar produtos",
      icon: Package,
      path: "/produtos",
      gradient: "from-secondary to-secondary/80",
    },
    {
      title: "Histórico",
      description: "Ver vendas anteriores",
      icon: History,
      path: "/historico",
      gradient: "from-accent to-accent/80",
    },
    {
      title: "Configurações",
      description: "Configurar sua loja",
      icon: Settings,
      path: "/configuracoes",
      gradient: "from-muted-foreground to-muted-foreground/80",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            {shopName || "Sistema de Vendas"}
          </h1>
          <p className="text-xl text-muted-foreground">
            Gerencie suas vendas de forma rápida e eficiente
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}>
                <Card className="group cursor-pointer h-full shadow-soft hover:shadow-medium transition-all duration-300 hover:scale-105">
                  <CardHeader className="text-center">
                    <div className={`mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{item.title}</CardTitle>
                    <CardDescription className="text-base">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center pb-6">
                    <span className="text-sm text-primary font-medium group-hover:underline">
                      Acessar →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
