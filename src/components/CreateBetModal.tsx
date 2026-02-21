// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatInputCurrency, parseCurrency } from "@/lib/formatCurrency";
import { Loader2, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  roomId: string;
  onCreated: () => void;
}

export default function CreateBetModal({ open, onClose, roomId, onCreated }: Props) {
  const [gameName, setGameName] = useState("");
  const [betName, setBetName] = useState("");
  const [rules, setRules] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = null;
      if (image) {
        const ext = image.name.split('.').pop();
        const path = `bets/${roomId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("game-images").upload(path, image);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("game-images").getPublicUrl(path);
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from("bets").insert({
        room_id: roomId,
        game_name: gameName,
        bet_name: betName,
        rules,
        min_amount: parseCurrency(minAmount),
        max_amount: parseCurrency(maxAmount),
        image_url: imageUrl,
      });
      if (error) throw error;
      toast.success("Tạo kèo thành công!");
      onCreated();
      onClose();
      setGameName(""); setBetName(""); setRules(""); setMinAmount(""); setMaxAmount(""); setImage(null);
    } catch (err: any) {
      toast.error(err.message || "Lỗi tạo kèo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Tạo kèo mới</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Tên game</Label>
            <Input value={gameName} onChange={e => setGameName(e.target.value)} className="bg-secondary border-border/50 rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Tên kèo</Label>
            <Input value={betName} onChange={e => setBetName(e.target.value)} className="bg-secondary border-border/50 rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Luật chơi</Label>
            <Textarea value={rules} onChange={e => setRules(e.target.value)} className="bg-secondary border-border/50 rounded-xl resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Tối thiểu (VNĐ)</Label>
              <Input value={minAmount} onChange={e => setMinAmount(formatInputCurrency(e.target.value))} className="bg-secondary border-border/50 rounded-xl" placeholder="100,000" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Tối đa (VNĐ)</Label>
              <Input value={maxAmount} onChange={e => setMaxAmount(formatInputCurrency(e.target.value))} className="bg-secondary border-border/50 rounded-xl" placeholder="10,000,000" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Ảnh (tùy chọn)</Label>
            <label className="flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-border bg-secondary cursor-pointer hover:border-primary/50 transition-colors text-sm text-muted-foreground">
              <Upload className="w-4 h-4" />
              {image ? image.name : "Chọn ảnh"}
              <input type="file" accept="image/*" className="hidden" onChange={e => setImage(e.target.files?.[0] || null)} />
            </label>
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Tạo kèo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
