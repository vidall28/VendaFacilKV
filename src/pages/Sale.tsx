import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Printer } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
}

const Sale = () => {
  const { user, shopName, logoUrl, shippingPricePerKg } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
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

    const subtotal = selectedProduct.price * qty;

    setItems([
      ...items,
      {
        product: selectedProduct,
        quantity: qty,
        subtotal,
      },
    ]);

    setSearchTerm("");
    setSelectedProduct(null);
    setQuantity("");
    toast.success("Produto adicionado!");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateShippingFee = () => {
    const weight = parseFloat(shippingWeight) || 0;
    return weight * shippingPricePerKg;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShippingFee();
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
    printReceipt(data);
    navigate("/historico");
  };

  const printReceipt = (sale: any) => {
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
            .header { text-align: center; margin-bottom: 20px; }
            .logo { max-width: 150px; max-height: 150px; margin: 0 auto 10px; display: block; }
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
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" />` : ''}
            <div class="shop-name">${shopName || 'Minha Loja'}</div>
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
              ${sale.shipping_fee > 0 ? `
                <tr>
                  <td colspan="3" style="padding: 12px; text-align: right; font-weight: 500;">Frete:</td>
                  <td style="padding: 12px; text-align: right; font-weight: 500;">R$ ${sale.shipping_fee.toFixed(2)}</td>
                </tr>
              ` : ''}
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
                <Label htmlFor="shippingWeight">Peso da Carga (kg)</Label>
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
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="quantity">
                      Quantidade ({selectedProduct.unit})
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      step={selectedProduct.unit === "kg" ? "0.01" : "1"}
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder={selectedProduct.unit === "kg" ? "0.00" : "0"}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddItem} className="bg-primary">
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
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
                    <Printer className="mr-2 h-5 w-5" />
                    Finalizar e Imprimir
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
