import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Settings = () => {
  const { user, shopName, logoUrl, shippingPricePerKg } = useAuth();
  const [newShopName, setNewShopName] = useState(shopName);
  const [newShippingPrice, setNewShippingPrice] = useState(shippingPricePerKg.toString());
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl);

  useEffect(() => {
    setNewShopName(shopName);
    setPreviewUrl(logoUrl);
    setNewShippingPrice(shippingPricePerKg.toString());
  }, [shopName, logoUrl, shippingPricePerKg]);

  const handleSettingsUpdate = async () => {
    if (!newShopName.trim()) {
      toast.error("Nome da loja não pode estar vazio");
      return;
    }

    const shippingPrice = parseFloat(newShippingPrice);
    if (isNaN(shippingPrice) || shippingPrice < 0) {
      toast.error("Valor do frete por kg inválido");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ 
        shop_name: newShopName.trim(),
        shipping_price_per_kg: shippingPrice
      })
      .eq("id", user?.id);

    if (error) {
      toast.error("Erro ao atualizar configurações");
      return;
    }

    toast.success("Configurações atualizadas!");
    window.location.reload();
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 2MB");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("shop-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast.error("Erro ao fazer upload da imagem");
        console.error(uploadError);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("shop-logos")
        .getPublicUrl(filePath);

      // Update profile with logo URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ logo_url: publicUrl })
        .eq("id", user?.id);

      if (updateError) {
        toast.error("Erro ao salvar logotipo");
        console.error(updateError);
        return;
      }

      setPreviewUrl(publicUrl);
      toast.success("Logotipo atualizado!");
      
      // Reload to update context
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <div className="w-20" />
        </div>

        <div className="space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Logotipo da Loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewUrl && (
                <div className="flex justify-center">
                  <div className="relative w-48 h-48 border-2 border-muted rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                    <img
                      src={`${previewUrl}?t=${Date.now()}`}
                      alt="Logo da loja"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="logo">
                  {previewUrl ? "Alterar Logotipo" : "Adicionar Logotipo"}
                </Label>
                <div className="mt-2">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Tamanho máximo: 2MB. Formatos: JPG, PNG, WEBP
                  </p>
                </div>
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4 animate-pulse" />
                  Enviando...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Informações da Loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shopName">Nome da Loja</Label>
                <Input
                  id="shopName"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="Digite o nome da loja..."
                />
              </div>
              <div>
                <Label htmlFor="shippingPrice">Valor do Frete por Kg (R$)</Label>
                <Input
                  id="shippingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newShippingPrice}
                  onChange={(e) => setNewShippingPrice(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Este valor será multiplicado pelo peso da carga para calcular o frete
                </p>
              </div>
              <Button onClick={handleSettingsUpdate} className="w-full">
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
