import { useState, useEffect } from "react";
import { ArrowLeft, Download, ShoppingCart, TrendingUp, DollarSign, Search, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Sale {
  id: string;
  total: number;
  customer_name: string;
  items: any[];
  created_at: string;
}

const History = () => {
  const { user, shopName, logoUrl } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalSales, setTotalSales] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [monthSales, setMonthSales] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  useEffect(() => {
    if (user) {
      loadSales();
    }
  }, [user]);

  useEffect(() => {
    let filtered = sales;

    // Filtro por texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((sale) => {
        const saleId = sale.id.slice(0, 8).toLowerCase();
        const customerName = sale.customer_name.toLowerCase();
        const saleDate = new Date(sale.created_at).toLocaleDateString("pt-BR");
        
        return (
          saleId.includes(term) ||
          customerName.includes(term) ||
          saleDate.includes(term)
        );
      });
    }

    // Filtro por data
    if (startDate || endDate) {
      filtered = filtered.filter((sale) => {
        const saleDate = new Date(sale.created_at);
        saleDate.setHours(0, 0, 0, 0); // Zera horas para comparar apenas data
        
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // Inclui o dia todo
          return saleDate >= start && saleDate <= end;
        } else if (startDate) {
          const start = new Date(startDate);
          return saleDate >= start;
        } else if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return saleDate <= end;
        }
        return true;
      });
    }

    setFilteredSales(filtered);

    // Calcular estatísticas baseadas nas vendas filtradas
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayTotal = filtered
      .filter((sale) => new Date(sale.created_at) >= today)
      .reduce((sum, sale) => sum + sale.total, 0);

    const monthTotal = filtered
      .filter((sale) => new Date(sale.created_at) >= firstDayOfMonth)
      .reduce((sum, sale) => sum + sale.total, 0);

    setTotalSales(filtered.length);
    setTodaySales(todayTotal);
    setMonthSales(monthTotal);
  }, [searchTerm, startDate, endDate, sales]);

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

  const handleDeleteClick = (sale: Sale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;

    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", saleToDelete.id);

    if (error) {
      toast.error("Erro ao excluir venda");
      return;
    }

    toast.success("Venda excluída com sucesso!");
    setDeleteDialogOpen(false);
    setSaleToDelete(null);
    loadSales(); // Recarrega a lista
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

    // Função JavaScript para download do PDF que será injetada na nova página
    const pdfScript = `
      function downloadPDF() {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = function() {
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF();
          const pageWidth = pdf.internal.pageSize.getWidth();
          const margin = 20;
          let yPosition = 25;
          
          function generatePDFContent() {
            pdf.setFontSize(22);
            pdf.setTextColor(5, 150, 105);
            pdf.setFont(undefined, 'bold');
            pdf.text('${shopName || 'Chapada Orgânica'}', pageWidth / 2, yPosition, { align: 'center' });
            
            yPosition += 12;
            pdf.setFontSize(16);
            pdf.setTextColor(5, 150, 105);
            pdf.text('Nota de Venda', pageWidth / 2, yPosition, { align: 'center' });
            
            yPosition += 10;
            pdf.setDrawColor(240, 240, 240);
            pdf.setLineWidth(1);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            
            yPosition += 15;
            pdf.setFillColor(249, 249, 249);
            pdf.rect(margin, yPosition - 5, pageWidth - 2*margin, 25, 'F');
            pdf.setFillColor(5, 150, 105);
            pdf.rect(margin, yPosition - 5, 3, 25, 'F');
            
            pdf.setFontSize(11);
            pdf.setTextColor(85, 85, 85);
            pdf.setFont(undefined, 'normal');
            pdf.text('Cliente: ${sale.customer_name}', margin + 8, yPosition + 3);
            pdf.text('Data: ${new Date(sale.created_at).toLocaleString('pt-BR')}', margin + 8, yPosition + 10);
            pdf.text('Nota: #${sale.id.slice(0, 8)}', margin + 8, yPosition + 17);
            
            yPosition += 35;
            pdf.setFillColor(5, 150, 105);
            pdf.rect(margin, yPosition, pageWidth - 2*margin, 12, 'F');
            
            pdf.setFontSize(10);
            pdf.setTextColor(255, 255, 255);
            pdf.setFont(undefined, 'bold');
            pdf.text('PRODUTO', margin + 5, yPosition + 8);
            pdf.text('QTD', margin + 70, yPosition + 8);
            pdf.text('PREÇO UNIT.', margin + 100, yPosition + 8);
            pdf.text('SUBTOTAL', margin + 140, yPosition + 8);
            
            yPosition += 12;
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(0, 0, 0);
            
            var items = ${JSON.stringify(sale.items)};
            items.forEach(function(item, index) {
              if (yPosition > 250) {
                pdf.addPage();
                yPosition = 30;
              }
              
              if (index % 2 === 0) {
                pdf.setFillColor(248, 249, 250);
                pdf.rect(margin, yPosition, pageWidth - 2*margin, 10, 'F');
              }
              
              pdf.setFontSize(9);
              pdf.text(item.product_name, margin + 5, yPosition + 7);
              pdf.text(item.quantity + ' ' + item.unit, margin + 70, yPosition + 7);
              pdf.text('R$ ' + item.price.toFixed(2), margin + 100, yPosition + 7);
              pdf.text('R$ ' + item.subtotal.toFixed(2), margin + 140, yPosition + 7);
              
              pdf.setDrawColor(232, 232, 232);
              pdf.setLineWidth(0.2);
              pdf.line(margin, yPosition + 10, pageWidth - margin, yPosition + 10);
              
              yPosition += 10;
            });
            
            // Peso total da nota
            yPosition += 5;
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text('Peso total da nota: ${sale.shipping_weight || 0} kg', margin + 5, yPosition + 5);
            
            // Total da nota
            yPosition += 8;
            pdf.setFillColor(243, 244, 246);
            pdf.rect(margin, yPosition, pageWidth - 2*margin, 15, 'F');
            pdf.setDrawColor(5, 150, 105);
            pdf.setLineWidth(2);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(31, 41, 55);
            pdf.text('TOTAL:', margin + 100, yPosition + 10);
            pdf.text('R$ ${sale.total.toFixed(2)}', margin + 140, yPosition + 10);
            
            ${sale.shipping_fee > 0 ? `
            // Verificar se há espaço para o frete (precisa de ~50 unidades)
            if (yPosition > 230) {
              pdf.addPage();
              yPosition = 30;
            }
            
            // Espaço maior antes do frete
            yPosition += 30;
            
            // Box do frete mais destacado
            pdf.setFillColor(240, 253, 244);
            pdf.rect(margin, yPosition, pageWidth - 2*margin, 18, 'F');
            pdf.setDrawColor(34, 197, 94);
            pdf.setLineWidth(2);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            pdf.line(margin, yPosition + 18, pageWidth - margin, yPosition + 18);
            
            // Texto do frete maior e mais destacado
            pdf.setFontSize(11);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(22, 101, 52);
            pdf.text('Peso do frete: ${sale.shipping_weight || 0} kg', margin + 10, yPosition + 7);
            pdf.setFontSize(12);
            pdf.text('FRETE (adicional):', margin + 10, yPosition + 14);
            pdf.text('+ R$ ${sale.shipping_fee.toFixed(2)}', margin + 140, yPosition + 14);
            ` : ''}
            
            var clientName = '${sale.customer_name}'.replace(/[^a-zA-Z0-9\\s]/g, '').replace(/\\s+/g, '-');
            var date = '${new Date(sale.created_at).toISOString().slice(0, 10)}';
            var fileName = clientName + '-' + date + '-nota-${sale.id.slice(0, 8)}.pdf';
            pdf.save(fileName);
            
            alert('PDF baixado com sucesso!');
          }
          
          ${logoUrl ? `
          var logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          logoImg.onload = function() {
            pdf.addImage(logoImg, 'JPEG', pageWidth/2 - 15, yPosition, 30, 30);
            yPosition += 40;
            generatePDFContent();
          };
          logoImg.onerror = function() {
            generatePDFContent();
          };
          logoImg.src = '${logoUrl}';
          ` : 'generatePDFContent();'}
        };
        document.head.appendChild(script);
      }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Nota de Venda</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              max-width: 800px; 
              margin: 0 auto;
              background-color: #ffffff;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #f0f0f0;
              padding-bottom: 20px;
            }
            .logo { 
              max-width: 120px; 
              max-height: 120px; 
              margin: 0 auto 15px; 
              display: block;
              border-radius: 8px;
            }
            .shop-name { 
              color: #059669; 
              text-align: center; 
              font-size: 1.8em; 
              font-weight: bold; 
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            h1 { 
              color: #059669; 
              text-align: center; 
              font-size: 1.3em; 
              margin: 10px 0 20px 0;
              font-weight: 600;
            }
            .info { 
              margin: 25px 0; 
              color: #555;
              background-color: #f9f9f9;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #059669;
            }
            .info p {
              margin: 5px 0;
              font-size: 14px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 25px;
              background-color: #fff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }
            th { 
              background: linear-gradient(135deg, #059669, #047857);
              color: white; 
              padding: 15px 12px; 
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            th:nth-child(2), th:nth-child(3), th:nth-child(4) {
              text-align: right;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e8e8e8;
              font-size: 14px;
            }
            tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            tr:hover {
              background-color: #f0f8f4;
            }
            td:nth-child(2), td:nth-child(3), td:nth-child(4) {
              text-align: right;
            }
            .total-row { 
              font-weight: bold; 
              font-size: 1.1em; 
              background: linear-gradient(135deg, #f3f4f6, #e5e7eb) !important;
              border-top: 3px solid #059669;
            }
            .total-row td {
              padding: 18px 12px;
              color: #1f2937;
            }
            .shipping-info {
              margin-top: 20px;
              padding: 15px 20px;
              background: linear-gradient(135deg, #f0fdf4, #dcfce7);
              border: 2px solid #22c55e;
              border-radius: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
            }
            .shipping-label {
              font-size: 14px;
              font-weight: 600;
              color: #166534;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .shipping-value {
              font-size: 16px;
              font-weight: bold;
              color: #166534;
            }
            .download-btn {
              margin-top: 30px;
              padding: 14px 28px;
              background: linear-gradient(135deg, #059669, #047857);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              font-weight: 600;
              transition: all 0.3s ease;
              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .download-btn:hover {
              background: linear-gradient(135deg, #047857, #065f46);
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(5, 150, 105, 0.4);
            }
            @media print {
              .download-btn { display: none; }
              body { box-shadow: none; }
              table { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
            <div class="shop-name">${shopName || 'Chapada Orgânica'}</div>
          </div>
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
          ${sale.shipping_fee > 0 ? `
            <div class="shipping-info">
              <span class="shipping-label">Frete (adicional):</span>
              <span class="shipping-value">+ R$ ${sale.shipping_fee.toFixed(2)}</span>
            </div>
          ` : ''}
          <button onclick="downloadPDF()" class="download-btn">
            📄 Baixar PDF
          </button>
          <script>
            ${pdfScript}
          </script>
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
          <CardContent className="p-4 space-y-4">
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Data Inicial</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Data Final</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setSearchTerm("");
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">
                        {sale.customer_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(sale.created_at).toLocaleString("pt-BR")} • Nota #{sale.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link to={`/sale/edit/${sale.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPDF(sale)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(sale)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a venda de <strong>{saleToDelete?.customer_name}</strong>?
                <br />
                <br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default History;
