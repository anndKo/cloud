// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatCurrency";
import { Check, X, ArrowLeft, SortAsc, SortDesc, Clock, Gamepad2, Landmark, CheckCircle2, Eye } from "lucide-react";

export default function ApproveBets() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'time' | 'amount'>('time');
  const [refundDetails, setRefundDetails] = useState<any[]>([]);
  const [showRefundFor, setShowRefundFor] = useState<string | null>(null);
  const [refundMap, setRefundMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchData();
  }, [code]);

  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`approve-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bet_requests', filter: `room_id=eq.${room.id}` }, () => {
        fetchRequests(room.id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'refund_requests', filter: `room_id=eq.${room.id}` }, () => {
        fetchRefunds(room.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth?mode=login"); return; }
    const { data: roomData } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
    if (!roomData || roomData.owner_id !== user.id) {
      toast.error("Không có quyền truy cập");
      navigate("/my-rooms");
      return;
    }
    setRoom(roomData);
    await Promise.all([fetchRequests(roomData.id), fetchRefunds(roomData.id)]);
    setLoading(false);
  };

  const fetchRequests = async (roomId: string) => {
    const { data } = await supabase
      .from("bet_requests")
      .select("*, bets(game_name, bet_name)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    const all = data || [];
    setPending(all.filter(r => r.status === 'pending'));
    setApproved(all.filter(r => r.status === 'approved' && !r.completed_at));
    setCompleted(all.filter(r => r.completed_at));
  };

  const fetchRefunds = async (roomId: string) => {
    const { data } = await supabase
      .from("refund_requests")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    
    const map: Record<string, any[]> = {};
    (data || []).forEach(r => {
      if (!map[r.bet_request_id]) map[r.bet_request_id] = [];
      map[r.bet_request_id].push(r);
    });
    setRefundMap(map);
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from("bet_requests").update({ status }).eq("id", id);
    if (error) { toast.error("Lỗi cập nhật"); return; }
    toast.success(status === 'approved' ? "Đã duyệt!" : "Đã từ chối!");
    if (room) fetchRequests(room.id);
  };

  const handleComplete = async (id: string) => {
    const { error } = await supabase.from("bet_requests").update({ completed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Lỗi cập nhật"); return; }
    toast.success("Đã hoàn thành kèo!");
    if (room) fetchRequests(room.id);
  };

  const sortedApproved = [...approved].sort((a, b) => {
    if (sortBy === 'amount') return b.amount - a.amount;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const currentRefunds = showRefundFor ? (refundMap[showRefundFor] || []) : [];

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <Skeleton className="h-10 w-48 mb-6 rounded-2xl" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const renderApprovedCard = (req: any, isCompleted = false) => (
    <motion.div
      key={req.id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`glass rounded-2xl p-4 ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className={`text-xs ${isCompleted ? 'text-muted-foreground' : 'text-accent'}`}>{req.bets?.game_name}</p>
          <p className="font-semibold">{req.bets?.bet_name}</p>
          <p className="text-xs text-muted-foreground">{req.player_name}</p>
        </div>
        <span className={`text-lg font-display font-bold ${isCompleted ? 'text-muted-foreground' : 'text-accent'}`}>
          {formatCurrency(req.amount)}
        </span>
      </div>

      {req.game_room_code && (
        <div className="mt-3 bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
          <Gamepad2 className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Mã phòng game</p>
            <p className="text-xl font-display font-bold text-primary tracking-widest">{req.game_room_code}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">
          {new Date(req.created_at).toLocaleString('vi-VN')}
        </span>
        <div className="flex gap-2">
          {refundMap[req.id] && refundMap[req.id].length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowRefundFor(req.id)} className="rounded-xl text-xs h-8">
              <Eye className="w-3 h-3 mr-1" />
              Xem hoàn tiền
            </Button>
          )}
          {!isCompleted && (
            <Button size="sm" variant="secondary" onClick={() => handleComplete(req.id)} className="rounded-xl text-xs h-8">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Hoàn thành
            </Button>
          )}
        </div>
      </div>
      {isCompleted && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Hoàn thành lúc {new Date(req.completed_at).toLocaleString('vi-VN')}
        </p>
      )}
    </motion.div>
  );

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(`/manage/${code}`)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold">Duyệt kèo – <span className="text-primary">{code}</span></h1>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Pending */}
          <div>
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Chờ duyệt ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">Không có yêu cầu nào</div>
            ) : (
              <div className="space-y-3">
                {pending.map(req => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs text-primary">{req.bets?.game_name}</p>
                        <p className="font-semibold">{req.bets?.bet_name}</p>
                        <p className="text-xs text-muted-foreground">{req.player_name}</p>
                      </div>
                      <span className="text-lg font-display font-bold text-primary">
                        {formatCurrency(req.amount)}
                      </span>
                    </div>
                    {req.bill_image_url && (
                      <img src={req.bill_image_url} alt="Bill" className="w-full h-32 object-contain rounded-xl bg-secondary mb-3" />
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleString('vi-VN')}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleAction(req.id, 'rejected')} className="rounded-xl">
                          <X className="w-4 h-4 mr-1" />
                          Từ chối
                        </Button>
                        <Button size="sm" onClick={() => handleAction(req.id, 'approved')} className="rounded-xl">
                          <Check className="w-4 h-4 mr-1" />
                          Duyệt
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Approved */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                <Check className="w-5 h-5 text-accent" />
                Đã duyệt ({approved.length})
              </h2>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={sortBy === 'time' ? 'default' : 'ghost'}
                  onClick={() => setSortBy('time')}
                  className="rounded-xl text-xs h-8"
                >
                  <SortAsc className="w-3 h-3 mr-1" />
                  Thời gian
                </Button>
                <Button
                  size="sm"
                  variant={sortBy === 'amount' ? 'default' : 'ghost'}
                  onClick={() => setSortBy('amount')}
                  className="rounded-xl text-xs h-8"
                >
                  <SortDesc className="w-3 h-3 mr-1" />
                  Số tiền
                </Button>
              </div>
            </div>
            {sortedApproved.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">Chưa có kèo nào được duyệt</div>
            ) : (
              <div className="space-y-3">
                {sortedApproved.map(req => renderApprovedCard(req))}
              </div>
            )}

            {/* Completed section at bottom */}
            {completed.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5" />
                  Đã hoàn thành ({completed.length})
                </h2>
                <div className="space-y-3">
                  {completed.map(req => renderApprovedCard(req, true))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refund details dialog */}
      <Dialog open={!!showRefundFor} onOpenChange={(o) => !o && setShowRefundFor(null)}>
        <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              Chi tiết hoàn tiền
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentRefunds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có yêu cầu hoàn tiền</p>
            ) : (
              currentRefunds.map((refund, i) => (
                <div key={refund.id} className="bg-secondary/60 border border-border/30 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Yêu cầu #{i + 1} – {new Date(refund.created_at).toLocaleString('vi-VN')}</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ngân hàng</span>
                      <span className="font-semibold">{refund.bank_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Số tài khoản</span>
                      <span className="font-mono font-bold text-primary">{refund.account_number}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tên tài khoản</span>
                      <span className="font-semibold">{refund.account_name}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
