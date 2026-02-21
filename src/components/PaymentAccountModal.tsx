// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  roomId: string;
}

export default function PaymentAccountModal({ open, onClose, roomId }: Props) {
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<any>(null);

  useEffect(() => {
    if (open && roomId) {
      supabase.from("payment_accounts").select("*").eq("room_id", roomId).maybeSingle().then(({ data }) => {
        if (data) {
          setExisting(data);
          setBankName(data.bank_name);
          setAccountNumber(data.account_number);
          setAccountName(data.account_name);
        }
      });
    }
  }, [open, roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let qrUrl = existing?.qr_image_url || null;
      if (qrImage) {
        const ext = qrImage.name.split('.').pop();
        const path = `qr/${roomId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("game-images").upload(path, qrImage);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("game-images").getPublicUrl(path);
        qrUrl = publicUrl;
      }

      if (existing) {
        const { error } = await supabase.from("payment_accounts").update({
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          qr_image_url: qrUrl,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payment_accounts").insert({
          room_id: roomId,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          qr_image_url: qrUrl,
        });
        if (error) throw error;
      }
      toast.success("Lưu thông tin thanh toán thành công!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Lỗi lưu thông tin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Tài khoản thanh toán</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Tên ngân hàng</Label>
            <Input value={bankName} onChange={e => setBankName(e.target.value)} className="bg-secondary border-border/50 rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Số tài khoản</Label>
            <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="bg-secondary border-border/50 rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Tên tài khoản</Label>
            <Input value={accountName} onChange={e => setAccountName(e.target.value)} className="bg-secondary border-border/50 rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">QR Code (tùy chọn)</Label>
            <label className="flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-border bg-secondary cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground">
              <Upload className="w-4 h-4" />
              {qrImage ? qrImage.name : "Tải ảnh QR"}
              <input type="file" accept="image/*" className="hidden" onChange={e => setQrImage(e.target.files?.[0] || null)} />
            </label>
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Lưu
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
