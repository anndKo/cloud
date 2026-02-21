// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Copy, CreditCard, ClipboardList, Gamepad2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import CreateBetModal from "@/components/CreateBetModal";
import PaymentAccountModal from "@/components/PaymentAccountModal";
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

export default function RoomManage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [deleteBetId, setDeleteBetId] = useState<string | null>(null);
  const [showDeleteRoom, setShowDeleteRoom] = useState(false);

  useEffect(() => {
    fetchRoom();
  }, [code]);

  const fetchRoom = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth?mode=login"); return; }

    const { data: roomData } = await supabase.from("rooms").select("*").eq("code", code).single();
    if (!roomData || roomData.owner_id !== user.id) {
      toast.error("Phòng không tồn tại hoặc bạn không có quyền");
      navigate("/my-rooms");
      return;
    }
    setRoom(roomData);

    const { data: betsData } = await supabase.from("bets").select("*").eq("room_id", roomData.id).order("created_at", { ascending: false });
    setBets(betsData || []);
    setLoading(false);
  };

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Đã copy mã phòng!");
    }
  };

  const deleteBet = async () => {
    if (!deleteBetId) return;
    // Delete related bet_requests first
    await supabase.from("bet_requests").delete().eq("bet_id", deleteBetId);
    const { error } = await supabase.from("bets").delete().eq("id", deleteBetId);
    if (error) { toast.error("Lỗi xóa kèo"); }
    else { toast.success("Đã xóa kèo!"); fetchRoom(); }
    setDeleteBetId(null);
  };

  const deleteRoom = async () => {
    if (!room) return;
    // Delete all related data
    await supabase.from("bet_requests").delete().eq("room_id", room.id);
    await supabase.from("bets").delete().eq("room_id", room.id);
    await supabase.from("payment_accounts").delete().eq("room_id", room.id);
    const { error } = await supabase.from("rooms").delete().eq("id", room.id);
    if (error) { toast.error("Lỗi xóa phòng"); }
    else { toast.success("Đã xóa phòng!"); navigate("/my-rooms"); }
    setShowDeleteRoom(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-12 w-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Room header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-display font-bold text-primary tracking-wider">{code}</h1>
              <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors">
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Quản lý phòng kèo</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="destructive" onClick={() => setShowDeleteRoom(true)} className="rounded-xl">
              <Trash2 className="w-4 h-4 mr-1" />
              Xóa phòng
            </Button>
            <Button variant="outline" onClick={() => setShowPaymentModal(true)} className="rounded-xl border-border/50">
              <CreditCard className="w-4 h-4 mr-1" />
              Thanh toán
            </Button>
            <Button variant="outline" onClick={() => navigate(`/approve/${code}`)} className="rounded-xl border-border/50">
              <ClipboardList className="w-4 h-4 mr-1" />
              Duyệt kèo
            </Button>
            <Button onClick={() => setShowBetModal(true)} className="rounded-xl font-semibold">
              <Plus className="w-4 h-4 mr-1" />
              Thêm kèo
            </Button>
          </div>
        </div>

        {/* Bets list */}
        {bets.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Chưa có kèo nào. Tạo kèo đầu tiên!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {bets.map((bet, i) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl overflow-hidden"
              >
                {bet.image_url && (
                  <img src={bet.image_url} alt={bet.bet_name} className="w-full h-36 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-primary font-medium mb-1">{bet.game_name}</p>
                      <h3 className="font-display font-semibold text-lg mb-2">{bet.bet_name}</h3>
                    </div>
                    <button
                      onClick={() => setDeleteBetId(bet.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {bet.rules && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{bet.rules}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(bet.min_amount)} – {formatCurrency(bet.max_amount)} VNĐ
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {room && (
        <>
          <CreateBetModal open={showBetModal} onClose={() => setShowBetModal(false)} roomId={room.id} onCreated={fetchRoom} />
          <PaymentAccountModal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} roomId={room.id} />
        </>
      )}

      {/* Delete bet confirmation */}
      <AlertDialog open={!!deleteBetId} onOpenChange={(o) => !o && setDeleteBetId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa kèo?</AlertDialogTitle>
            <AlertDialogDescription>Tất cả yêu cầu đặt kèo liên quan sẽ bị xóa. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={deleteBet} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete room confirmation */}
      <AlertDialog open={showDeleteRoom} onOpenChange={setShowDeleteRoom}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa phòng {code}?</AlertDialogTitle>
            <AlertDialogDescription>Tất cả kèo, yêu cầu đặt kèo và thông tin thanh toán sẽ bị xóa vĩnh viễn.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRoom} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa phòng</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
