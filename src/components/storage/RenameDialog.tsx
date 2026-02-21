import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
}

export const RenameDialog = ({
  isOpen,
  onClose,
  currentName,
  onNameChange,
  onSave,
}: RenameDialogProps) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold">Đổi tên</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <Input
            value={currentName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Nhập tên mới"
            autoFocus
            className="h-12 rounded-xl"
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={!currentName.trim()}
              className="flex-1 h-11 rounded-xl btn-gradient"
            >
              Lưu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};