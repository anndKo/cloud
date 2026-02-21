// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Copy, ArrowRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function generateCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function MyRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth?mode=login"); return; }
    const { data } = await supabase.from("rooms").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
    setRooms(data || []);
    setLoading(false);
  };

  const createRoom = async () => {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const code = generateCode();
    const { error } = await supabase.from("rooms").insert({ code, owner_id: user.id });
    if (error) {
      toast.error("Lỗi tạo phòng");
    } else {
      toast.success(`Phòng ${code} đã được tạo!`);
      fetchRooms();
    }
    setCreating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Đã copy mã phòng!");
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-display font-bold">Phòng của tôi</h1>
          <Button onClick={createRoom} disabled={creating} className="rounded-xl font-semibold">
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            Tạo phòng
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="mb-4">Bạn chưa có phòng nào</p>
            <Button onClick={createRoom} variant="outline" className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" />
              Tạo phòng đầu tiên
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-5 flex items-center justify-between group hover:border-primary/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl font-display font-bold tracking-wider text-primary">{room.code}</span>
                    <button onClick={() => copyCode(room.code)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(room.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/manage/${room.code}`)}
                  className="text-muted-foreground hover:text-primary"
                >
                  Quản lý
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
