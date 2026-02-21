// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatCurrency";
import { getLocalBets, updateLocalBetStatus, updateLocalBetGameCode } from "@/lib/localStorage";
import { Input } from "@/components/ui/input";
import PlaceBetModal from "@/components/PlaceBetModal";
import RefundModal from "@/components/RefundModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gamepad2, Clock, CheckCircle2, XCircle, Send, Eye, Pencil, Landmark } from "lucide-react";

export default function PlayerRoom() {
  const { code } = useParams<{ code: string }>();
  const [room, setRoom] = useState<any>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [paymentAccount, setPaymentAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBet, setSelectedBet] = useState<any>(null);
  const [detailBet, setDetailBet] = useState<any>(null);
  const [localBets, setLocalBets] = useState(getLocalBets());
  const [gameCodeInputs, setGameCodeInputs] = useState<Record<string, string>>({});
  const [editingGameCode, setEditingGameCode] = useState<Record<string, boolean>>({});
  const [refundBetId, setRefundBetId] = useState<string | null>(null);
  const [refundRoomId, setRefundRoomId] = useState<string>("");

  useEffect(() => {
    fetchRoom();
  }, [code]);

  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`bet-requests-${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bet_requests', filter: `room_id=eq.${room.id}` }, (payload) => {
        const updated = payload.new as any;
        updateLocalBetStatus(updated.id, updated.status);
        setLocalBets(getLocalBets());
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room]);

  const fetchRoom = async () => {
    const { data: roomData } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
    if (!roomData) { setError("Phòng không tồn tại"); setLoading(false); return; }
    setRoom(roomData);

    const { data: betsData } = await supabase.from("bets").select("*").eq("room_id", roomData.id).order("created_at", { ascending: false });
    setBets(betsData || []);

    const { data: payment } = await supabase.from("payment_accounts").select("*").eq("room_id", roomData.id).maybeSingle();
    setPaymentAccount(payment);
    setLoading(false);
  };

  const sendGameCode = async (requestId: string) => {
    const gameCode = gameCodeInputs[requestId];
    if (!gameCode?.trim()) return;
    const { error } = await supabase.from("bet_requests").update({ game_room_code: gameCode.trim() }).eq("id", requestId);
    if (error) { toast.error("Lỗi gửi mã"); return; }
    updateLocalBetGameCode(requestId, gameCode.trim());
    setLocalBets(getLocalBets());
    setEditingGameCode(prev => ({ ...prev, [requestId]: false }));
    toast.success("Đã gửi mã phòng game!");
  };

  const myBets = localBets.filter(b => b.roomCode === code);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-12 w-48 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-primary tracking-wider mb-1">{code}</h1>
          <p className="text-sm text-muted-foreground">Danh sách kèo trong phòng</p>
        </div>

        {/* My placed bets */}
        {myBets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-display font-semibold mb-4">Kèo đã đặt của bạn</h2>
            <div className="space-y-3">
              {myBets.map(bet => (
                <div key={bet.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs text-primary">{bet.gameName}</span>
                      <p className="font-semibold">{bet.betName}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {bet.status === 'pending' && <><Clock className="w-4 h-4 text-primary" /><span className="text-sm text-primary">Chờ duyệt</span></>}
                      {bet.status === 'approved' && <><CheckCircle2 className="w-4 h-4 text-accent" /><span className="text-sm text-accent">Đã duyệt</span></>}
                      {bet.status === 'rejected' && <><XCircle className="w-4 h-4 text-destructive" /><span className="text-sm text-destructive">Từ chối</span></>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatCurrency(bet.amount)} VNĐ</p>

                  {/* Game code: show input if approved and (no code yet OR editing) */}
                  {bet.status === 'approved' && (!bet.gameRoomCode || editingGameCode[bet.id]) && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Nhập mã phòng game..."
                        value={gameCodeInputs[bet.id] ?? bet.gameRoomCode ?? ""}
                        onChange={e => setGameCodeInputs(prev => ({ ...prev, [bet.id]: e.target.value }))}
                        className="bg-secondary border-border/50 rounded-xl text-sm"
                      />
                      <Button size="sm" onClick={() => sendGameCode(bet.id)} className="rounded-xl">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {/* Show current game code with edit button */}
                  {bet.gameRoomCode && !editingGameCode[bet.id] && (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-sm text-accent">Mã phòng game: <span className="font-mono font-bold">{bet.gameRoomCode}</span></p>
                      {bet.status === 'approved' && (
                        <button
                          onClick={() => {
                            setGameCodeInputs(prev => ({ ...prev, [bet.id]: bet.gameRoomCode || "" }));
                            setEditingGameCode(prev => ({ ...prev, [bet.id]: true }));
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  {/* Refund button for approved bets */}
                  {bet.status === 'approved' && !bet.refundSent && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRefundBetId(bet.id);
                        setRefundRoomId(room?.id || "");
                      }}
                      className="mt-3 rounded-xl text-xs w-full"
                    >
                      <Landmark className="w-3.5 h-3.5 mr-1" />
                      Yêu cầu hoàn tiền
                    </Button>
                  )}
                  {bet.refundSent && (
                    <p className="mt-2 text-xs text-accent flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã gửi yêu cầu hoàn tiền
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available bets */}
        {bets.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Phòng chưa có kèo nào</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {bets.map((bet, i) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl overflow-hidden group hover:border-primary/30 transition-colors"
              >
                {bet.image_url && (
                  <img src={bet.image_url} alt={bet.bet_name} className="w-full h-36 object-cover" />
                )}
                <div className="p-4">
                  <p className="text-xs text-primary font-medium mb-1">{bet.game_name}</p>
                  <h3 className="font-display font-semibold text-lg mb-2">{bet.bet_name}</h3>
                  {bet.rules && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{bet.rules}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(bet.min_amount)} – {formatCurrency(bet.max_amount)} VNĐ
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setDetailBet(bet)} className="rounded-xl text-xs">
                        <Eye className="w-4 h-4 mr-1" />
                        Chi tiết
                      </Button>
                      <Button size="sm" onClick={() => setSelectedBet(bet)} className="rounded-xl font-semibold">
                        Đặt kèo
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {selectedBet && (
        <PlaceBetModal
          open={!!selectedBet}
          onClose={() => setSelectedBet(null)}
          bet={selectedBet}
          roomCode={code || ""}
          paymentAccount={paymentAccount}
        />
      )}

      {/* Bet Detail Dialog */}
      <Dialog open={!!detailBet} onOpenChange={(o) => !o && setDetailBet(null)}>
        <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Chi tiết kèo</DialogTitle>
          </DialogHeader>
          {detailBet && (
            <div className="space-y-4">
              {detailBet.image_url && (
                <img src={detailBet.image_url} alt={detailBet.bet_name} className="w-full h-48 object-cover rounded-xl" />
              )}
              <div>
                <p className="text-xs text-primary font-medium">{detailBet.game_name}</p>
                <h3 className="font-display font-bold text-xl mt-1">{detailBet.bet_name}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mức cược</span>
                  <span className="font-semibold">{formatCurrency(detailBet.min_amount)} – {formatCurrency(detailBet.max_amount)} VNĐ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngày tạo</span>
                  <span>{new Date(detailBet.created_at).toLocaleString('vi-VN')}</span>
                </div>
              </div>
              {detailBet.rules && (
                <div className="bg-secondary/60 rounded-xl p-5 border border-border/30">
                  <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    📋 Luật chơi
                  </p>
                  <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap">{detailBet.rules}</p>
                </div>
              )}
              <Button onClick={() => { setDetailBet(null); setSelectedBet(detailBet); }} className="w-full rounded-xl font-semibold h-11">
                Đặt kèo này
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      {refundBetId && (
        <RefundModal
          open={!!refundBetId}
          onClose={() => setRefundBetId(null)}
          betRequestId={refundBetId}
          roomId={refundRoomId}
          onSuccess={() => setLocalBets(getLocalBets())}
        />
      )}
    </div>
  );
}
