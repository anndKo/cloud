// @ts-nocheck
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LogOut, User, Gamepad2 } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <Gamepad2 className="w-7 h-7 text-primary" />
          <span className="text-xl font-display font-bold text-gold-gradient">KÈO GAME</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/my-rooms">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <User className="w-4 h-4 mr-1" />
                  Phòng của tôi
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4 mr-1" />
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth?mode=login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/auth?mode=register">
                <Button size="sm" className="font-semibold">
                  Đăng ký
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
