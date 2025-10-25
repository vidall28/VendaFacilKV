import { useState, useEffect } from "react";
import { ArrowLeft, Download, ShoppingCart, TrendingUp, DollarSign, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";

interface Sale {
  id: string;
  total: number;
  customer_name: string;
  items: any[];
  created_at: string;
}

const History = () => {
  const { user, shopName } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalSales, setTotalSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [monthSales, setMonthSales] = useState(0);

  useEffect(() => {
    if (user) {
      loadSales();
    }
  }, [user]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSales(sales);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = sales.filter((sale) => {
      const saleId = sale.id.slice(0, 8).toLowerCase();
      const customerName = sale.customer_name.toLowerCase();
      const saleDate = new Date(sale.created_at).toLocaleDateString("pt-BR");
      
      return (
        saleId.includes(term) ||
        customerName.includes(term) ||
        saleDate.includes(term)
      );
    });
    
    setFilteredSales(filtered);
  }, [searchTerm, sales]);

  const loadSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar histórico");
      return;
    }

    const salesData = (data || []) as Sale[];
    setSales(salesData);
    setFilteredSales(salesData);

    // Calcular estatísticas
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayTotal = salesData
      .filter((sale) => new Date(sale.created_at) >= today)
      .reduce((sum, sale) => sum + sale.total, 0);

    const monthTotal = salesData
      .filter((sale) => new Date(sale.created_at) >= firstDayOfMonth)
      .reduce((sum, sale) => sum + sale.total, 0);

    setTotalSales(salesData.length);
    setTodaySales(todayTotal);
    setMonthSales(monthTotal);
  };

  const downloadPDF = (sale: Sale) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = sale.items
      .map(
        (item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity} ${item.unit}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">R$ ${item.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">R$ ${item.subtotal.toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nota de Venda</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .shop-name { color: #059669; text-align: center; font-size: 1.8em; font-weight: bold; margin-bottom: 5px; }
            h1 { color: #059669; text-align: center; font-size: 1.2em; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #059669; color: white; padding: 12px; text-align: left; }
            .total-row { font-weight: bold; font-size: 1.2em; background-color: #f3f4f6; }
            .info { margin: 20px 0; color: #6b7280; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="shop-name">${shopName || 'Minha Loja'}</div>
          <h1>Nota de Venda</h1>
          <div class="info">
            <p><strong>Cliente:</strong> ${sale.customer_name}</p>
            <p><strong>Data:</strong> ${new Date(sale.created_at).toLocaleString("pt-BR")}</p>
            <p><strong>Nota:</strong> #${sale.id.slice(0, 8)}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th style="text-align: center;">Quantidade</th>
                <th style="text-align: right;">Preço Unit.</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="padding: 12px; text-align: right;">TOTAL:</td>
                <td style="padding: 12px; text-align: right;">R$ ${sale.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background-color: #059669; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Imprimir
          </button>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Histórico</h1>
          <div className="w-20" />
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="shadow-soft bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-muted">
                  <ShoppingCart className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Total de Vendas</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalSales}</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/20">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Vendas Hoje</span>
              </div>
              <p className="text-3xl font-bold text-primary">
                R$ {todaySales.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft bg-gradient-to-br from-secondary/10 to-secondary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-secondary/20">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                </div>
                <span className="text-sm text-muted-foreground">Total do Mês</span>
              </div>
              <p className="text-3xl font-bold text-secondary">
                R$ {monthSales.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-soft mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nota, cliente ou data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredSales.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="p-8 text-center text-muted-foreground">
                {searchTerm ? "Nenhuma venda encontrada" : "Nenhuma venda registrada"}
              </CardContent>
            </Card>
          ) : (
            filteredSales.map((sale) => (
              <Card key={sale.id} className="shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {sale.customer_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(sale.created_at).toLocaleString("pt-BR")} • Nota #{sale.id.slice(0, 8)}
                    </p>
                  </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadPDF(sale)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sale.items.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between text-sm py-2 border-b last:border-b-0"
                      >
                        <span>
                          {item.product_name} ({item.quantity} {item.unit})
                        </span>
                        <span className="font-medium">
                          R$ {item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 text-lg font-bold border-t-2 border-primary/20">
                      <span>TOTAL:</span>
                      <span className="text-primary">
                        R$ {sale.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
