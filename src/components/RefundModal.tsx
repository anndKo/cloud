// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Landmark } from "lucide-react";
import { updateLocalBetRefundSent } from "@/lib/localStorage";

interface Props {
  open: boolean;
  onClose: () => void;
  betRequestId: string;
  roomId: string;
  onSuccess: () => void;
}

export default function RefundModal({ open, onClose, betRequestId, roomId, onSuccess }: Props) {
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("refund_requests").insert({
        bet_request_id: betRequestId,
        room_id: roomId,
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
      });
      if (error) throw error;
      updateLocalBetRefundSent(betRequestId);
      toast.success("Đã gửi yêu cầu hoàn tiền!");
      onSuccess();
      onClose();
      setBankName(""); setAccountNumber(""); setAccountName("");
    } catch (err: any) {
      toast.error(err.message || "Lỗi gửi yêu cầu hoàn tiền");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            Yêu cầu hoàn tiền
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Tên ngân hàng</Label>
            <Input
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="VD: Vietcombank, MB Bank..."
              className="bg-secondary border-border/50 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Số tài khoản</Label>
            <Input
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder="Nhập số tài khoản..."
              className="bg-secondary border-border/50 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Tên tài khoản</Label>
            <Input
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="Nhập tên chủ tài khoản..."
              className="bg-secondary border-border/50 rounded-xl"
              required
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Xác nhận gửi hoàn tiền
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
