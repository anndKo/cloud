// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatInputCurrency, parseCurrency, formatCurrency } from "@/lib/formatCurrency";
import { saveLocalBet } from "@/lib/localStorage";
import { Loader2, Upload, Banknote } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  bet: any;
  roomCode: string;
  paymentAccount: any;
}

export default function PlaceBetModal({ open, onClose, bet, roomCode, paymentAccount }: Props) {
  const [amount, setAmount] = useState("");
  const [billImage, setBillImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseCurrency(amount);
    if (!amountNum) { toast.error("Vui lòng nhập số tiền"); return; }

    const minAmount = bet.min_amount || 0;
    const maxAmount = bet.max_amount || Infinity;
    if (amountNum < minAmount || amountNum > maxAmount) {
      toast.error(`Số tiền phải từ ${formatCurrency(minAmount)} đến ${formatCurrency(maxAmount)} VNĐ`);
      return;
    }

    setLoading(true);

    try {
      let billUrl = null;
      if (billImage) {
        const ext = billImage.name.split('.').pop();
        const path = `bills/${bet.room_id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("game-images").upload(path, billImage);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("game-images").getPublicUrl(path);
        billUrl = publicUrl;
      }

      const { data, error } = await supabase.from("bet_requests").insert({
        bet_id: bet.id,
        room_id: bet.room_id,
        player_name: "Ẩn danh",
        amount: amountNum,
        bill_image_url: billUrl,
      }).select().single();
      if (error || !data) throw error || new Error("No data returned");

      saveLocalBet({
        id: data.id,
        betId: bet.id,
        roomCode,
        betName: bet.bet_name,
        gameName: bet.game_name,
        amount: amountNum,
        billImageUrl: billUrl || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      toast.success("Đặt kèo thành công! Chờ chủ phòng duyệt.");
      onClose();
      setAmount(""); setBillImage(null);
    } catch (err: any) {
      toast.error(err.message || "Lỗi đặt kèo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Đặt kèo – {bet?.bet_name}</DialogTitle>
        </DialogHeader>

        {/* Payment info */}
        {paymentAccount && (
          <div className="bg-secondary rounded-xl p-4 space-y-2 mb-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Chuyển khoản đến</p>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Ngân hàng:</span> <span className="font-medium">{paymentAccount.bank_name}</span></p>
              <p><span className="text-muted-foreground">STK:</span> <span className="font-medium font-mono">{paymentAccount.account_number}</span></p>
              <p><span className="text-muted-foreground">Tên:</span> <span className="font-medium">{paymentAccount.account_name}</span></p>
            </div>
            {paymentAccount.qr_image_url && (
              <img src={paymentAccount.qr_image_url} alt="QR" className="w-40 h-40 mx-auto rounded-xl object-contain bg-foreground/5 mt-2" />
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Số tiền (VNĐ) — {formatCurrency(bet?.min_amount || 0)} ~ {formatCurrency(bet?.max_amount || 0)}
            </Label>
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={amount}
                onChange={e => setAmount(formatInputCurrency(e.target.value))}
                placeholder="1,000,000"
                className="pl-10 bg-secondary border-border/50 rounded-xl"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Ảnh bill thanh toán</Label>
            <label className="flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-border bg-secondary cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground">
              <Upload className="w-4 h-4" />
              {billImage ? billImage.name : "Tải ảnh bill"}
              <input type="file" accept="image/*" className="hidden" onChange={e => setBillImage(e.target.files?.[0] || null)} />
            </label>
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Xác nhận đặt kèo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
