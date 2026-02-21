import { User } from "@supabase/supabase-js";
import { Cloud, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StorageHeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const StorageHeader = ({ user, onLogout }: StorageHeaderProps) => {
  const userId = user?.email?.split("@")[0] || "";

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center">
              <Cloud className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">CloudVault</h1>
              <p className="text-sm text-muted-foreground">ID: {userId}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};