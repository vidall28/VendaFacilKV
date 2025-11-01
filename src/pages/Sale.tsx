import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Download } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";

interface Product {
  id: string;
  name: string;
  price: number;
  unit: "kg" | "un";
}

interface SaleItem {
  product: Product;
  quantity: number;
  subtotal: number;
  weight: number; // Peso em kg (para produtos em kg = quantity, para un = peso informado)
}

const Sale = () => {
  const { user, shopName, logoUrl, shippingPricePerKg } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [itemWeight, setItemWeight] = useState(""); // Peso do item em UN
  const [items, setItems] = useState<SaleItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [shippingWeight, setShippingWeight] = useState("");

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() && !selectedProduct) {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredProducts([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, products, selectedProduct]);

  // Atualizar peso do frete automaticamente quando itens mudarem
  useEffect(() => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    setShippingWeight(totalWeight.toFixed(2));
  }, [items]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user?.id)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar produtos");
      return;
    }

    setProducts((data || []) as Product[]);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setShowSuggestions(false);
    setQuantity("");
  };

  const handleAddItem = () => {
    if (!selectedProduct || !quantity) {
      toast.error("Selecione um produto e informe a quantidade");
      return;
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    // Para produtos em UN, validar se o peso foi informado
    if (selectedProduct.unit === "un" && !itemWeight) {
      toast.error("Informe o peso total deste item para calcular o frete");
      return;
    }

    // Para produtos em UN, validar se o peso é válido
    if (selectedProduct.unit === "un") {
      const weight = parseFloat(itemWeight);
      if (isNaN(weight) || weight <= 0) {
        toast.error("Peso deve ser maior que zero");
        return;
      }
    }

    const subtotal = selectedProduct.price * qty;
    
    // Calcular peso: para KG = quantidade, para UN = peso informado
    const itemWeightValue = selectedProduct.unit === "kg" 
      ? qty 
      : parseFloat(itemWeight);

    setItems([
      ...items,
      {
        product: selectedProduct,
        quantity: qty,
        subtotal,
        weight: itemWeightValue,
      },
    ]);

    setSearchTerm("");
    setSelectedProduct(null);
    setQuantity("");
    setItemWeight("");
    toast.success("Produto adicionado!");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateTotalWeight = () => {
    return items.reduce((sum, item) => sum + item.weight, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal(); // Frete não incluído no total (sempre à parte)
  };

  const calculateShippingFee = () => {
    const weight = parseFloat(shippingWeight) || 0;
    return weight * shippingPricePerKg;
  };

  const handleFinishSale = async () => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }

    const saleData = {
      total: calculateTotal(),
      customer_name: customerName.trim(),
      user_id: user?.id,
      shipping_fee: calculateShippingFee(),
      shipping_weight: parseFloat(shippingWeight) || 0,
      items: items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit: item.product.unit,
        price: item.product.price,
        subtotal: item.subtotal,
      })),
    };

    const { data, error } = await supabase
      .from("sales")
      .insert([saleData])
      .select()
      .single();

    if (error) {
      toast.error("Erro ao finalizar venda");
      return;
    }

    toast.success("Venda finalizada!");
    // Restaura o fluxo original: abre nova página com layout antigo mas com botão PDF
    openPDFPage(data);
    navigate("/historico");
  };

  const downloadPDF = (sale: any) => {
    const pdf = new jsPDF();
    
    // Configurações do PDF
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 30;
    
    // Cabeçalho
    pdf.setFontSize(20);
    pdf.setTextColor(5, 150, 105); // Verde
    pdf.text(shopName || 'Minha Loja', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    pdf.setFontSize(16);
    pdf.text('Nota de Venda', pageWidth / 2, yPosition, { align: 'center' });
    
    // Informações da venda
    yPosition += 20;
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Cliente: ${sale.customer_name}`, margin, yPosition);
    
    yPosition += 8;
    pdf.text(`Data: ${new Date(sale.created_at).toLocaleString('pt-BR')}`, margin, yPosition);
    
    yPosition += 8;
    pdf.text(`Nota: #${sale.id.slice(0, 8)}`, margin, yPosition);
    
    // Linha separadora
    yPosition += 15;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    
    // Cabeçalho da tabela
    yPosition += 15;
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.text('Produto', margin, yPosition);
    pdf.text('Qtd', margin + 80, yPosition);
    pdf.text('Preço Unit.', margin + 110, yPosition);
    pdf.text('Subtotal', margin + 150, yPosition);
    
    // Linha do cabeçalho
    yPosition += 3;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    
    // Itens da venda
    yPosition += 10;
    pdf.setFont(undefined, 'normal');
    
    sale.items.forEach((item: any) => {
      if (yPosition > 250) { // Nova página se necessário
        pdf.addPage();
        yPosition = 30;
      }
      
      pdf.text(item.product_name, margin, yPosition);
      pdf.text(`${item.quantity} ${item.unit}`, margin + 80, yPosition);
      pdf.text(`R$ ${item.price.toFixed(2)}`, margin + 110, yPosition);
      pdf.text(`R$ ${item.subtotal.toFixed(2)}`, margin + 150, yPosition);
      
      yPosition += 8;
    });
    
    // Frete (se houver)
    if (sale.shipping_fee > 0) {
      yPosition += 5;
      pdf.setFont(undefined, 'bold');
      pdf.text('Frete:', margin + 110, yPosition);
      pdf.text(`R$ ${sale.shipping_fee.toFixed(2)}`, margin + 150, yPosition);
      yPosition += 8;
    }
    
    // Total
    yPosition += 10;
    pdf.line(margin + 100, yPosition - 5, pageWidth - margin, yPosition - 5);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('TOTAL:', margin + 110, yPosition);
    pdf.text(`R$ ${sale.total.toFixed(2)}`, margin + 150, yPosition);
    
    // Download do PDF
    const clientName = sale.customer_name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
    const date = new Date(sale.created_at).toISOString().slice(0, 10);
    const fileName = `${clientName}-${date}-nota-${sale.id.slice(0, 8)}.pdf`;
    pdf.save(fileName);
    
    toast.success('PDF baixado com sucesso!');
  };

  const openPDFPage = (sale: any) => {
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
            
            yPosition += 5;
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
            yPosition += 20;
            pdf.setFillColor(240, 253, 244);
            pdf.rect(margin, yPosition, pageWidth - 2*margin, 12, 'F');
            pdf.setDrawColor(34, 197, 94);
            pdf.setLineWidth(1.5);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(22, 101, 52);
            pdf.text('Frete (adicional):', margin + 80, yPosition + 8);
            pdf.text('+ R$ ${sale.shipping_fee.toFixed(2)}', margin + 140, yPosition + 8);
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
          <h1 className="text-3xl font-bold text-foreground">Nova Venda</h1>
          <div className="w-20" />
        </div>

        <div className="space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Informações da Venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Nome do Cliente</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Digite o nome do cliente..."
                />
              </div>
              <div>
                <Label htmlFor="shippingWeight">
                  Peso para Frete (kg)
                  {items.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (calculado automaticamente)
                    </span>
                  )}
                </Label>
                <Input
                  id="shippingWeight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingWeight}
                  onChange={(e) => setShippingWeight(e.target.value)}
                  placeholder="0.00"
                />
                {parseFloat(shippingWeight) > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Frete: R$ {calculateShippingFee().toFixed(2)} ({shippingWeight} kg × R$ {shippingPricePerKg.toFixed(2)}/kg)
                  </p>
                )}
                {items.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Você pode ajustar o peso manualmente se necessário
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Adicionar Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Label htmlFor="search">Buscar Produto</Label>
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedProduct(null);
                  }}
                  placeholder="Digite o nome do produto..."
                  onFocus={() => searchTerm && !selectedProduct && setShowSuggestions(true)}
                />
                {showSuggestions && filteredProducts.length > 0 && (
                  <Card className="absolute z-10 mt-1 w-full shadow-lg">
                    <CardContent className="p-0">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            R$ {product.price.toFixed(2)}/{product.unit}
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {selectedProduct && (
                <div className="space-y-4">
                  {selectedProduct.unit === "kg" ? (
                    // Layout para produtos em KG
                    <>
                      <div>
                        <Label htmlFor="quantity">
                          Quantidade ({selectedProduct.unit})
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          step="0.01"
                          min="0"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <Button onClick={handleAddItem} className="w-full bg-primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Produto
                      </Button>
                    </>
                  ) : (
                    // Layout para produtos em UN
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quantity">
                            Quantidade ({selectedProduct.unit})
                          </Label>
                          <Input
                            id="quantity"
                            type="number"
                            step="1"
                            min="0"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="itemWeight">
                            Peso Total (kg) *
                          </Label>
                          <Input
                            id="itemWeight"
                            type="number"
                            step="0.01"
                            min="0"
                            value={itemWeight}
                            onChange={(e) => setItemWeight(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Informe o peso total deste item para calcular o frete corretamente
                      </p>
                      <Button onClick={handleAddItem} className="w-full bg-primary">
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Produto
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Itens da Venda</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum item adicionado
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {item.product.unit} × R${" "}
                          {item.product.price.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Peso: {item.weight.toFixed(2)} kg
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">
                          R$ {item.subtotal.toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t-2 border-primary/20 space-y-2">
                    <div className="flex justify-between items-center text-lg">
                      <span>Subtotal:</span>
                      <span>R$ {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {items.length > 0 && (
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Peso total dos produtos:</span>
                        <span>{calculateTotalWeight().toFixed(2)} kg</span>
                      </div>
                    )}
                    {parseFloat(shippingWeight) > 0 && (
                      <div className="flex justify-between items-center text-lg">
                        <span>Frete ({shippingWeight} kg):</span>
                        <span>R$ {calculateShippingFee().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-2xl font-bold pt-2 border-t">
                      <span>TOTAL:</span>
                      <span className="text-primary">
                        R$ {calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleFinishSale}
                    className="w-full bg-primary hover:bg-primary/90 shadow-soft"
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Finalizar Venda
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Sale;
