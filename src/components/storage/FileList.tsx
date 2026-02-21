// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserFile } from "@/pages/Storage";
import { FileCard } from "./FileCard";
import { RenameDialog } from "./RenameDialog";
import { FolderOpen } from "lucide-react";

interface FileListProps {
  files: UserFile[];
  onDelete: (fileId: string) => void;
  onRename: (fileId: string, newName: string) => void;
  userId: string;
}

export const FileList = ({ files, onDelete, onRename, userId }: FileListProps) => {
  const [renameFile, setRenameFile] = useState<UserFile | null>(null);
  const [newName, setNewName] = useState("");

  const handleDownload = async (file: UserFile) => {
    if (file.file_type === "link" && file.url) { window.open(file.url, "_blank"); return; }
    if (!file.file_path) return;
    try {
      const { data, error } = await supabase.storage.from("user_files").download(file.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = file.original_name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đang tải xuống...");
    } catch (error) { toast.error("Không thể tải xuống file"); }
  };

  const handleDelete = async (file: UserFile) => {
    try {
      if (file.file_path) await supabase.storage.from("user_files").remove([file.file_path]);
      const { error } = await (supabase as any).from("user_files").delete().eq("id", file.id);
      if (error) throw error;
      onDelete(file.id);
      toast.success("Đã xóa!");
    } catch (error) { toast.error("Không thể xóa file"); }
  };

  const handleRename = async () => {
    if (!renameFile || !newName.trim()) return;
    try {
      const { error } = await (supabase as any).from("user_files").update({ name: newName.trim() }).eq("id", renameFile.id);
      if (error) throw error;
      onRename(renameFile.id, newName.trim());
      setRenameFile(null); setNewName("");
      toast.success("Đã đổi tên!");
    } catch (error) { toast.error("Không thể đổi tên"); }
  };

  const openRenameDialog = (file: UserFile) => { setRenameFile(file); setNewName(file.name); };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <FolderOpen className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu</h3>
        <p className="text-muted-foreground max-w-xs">Bắt đầu bằng cách chụp ảnh, quay video hoặc tải lên file từ thiết bị</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <FileCard key={file.id} file={file} userId={userId} onDownload={() => handleDownload(file)} onRename={() => openRenameDialog(file)} onDelete={() => handleDelete(file)} />
        ))}
      </div>
      {renameFile && <RenameDialog isOpen={!!renameFile} onClose={() => setRenameFile(null)} currentName={newName} onNameChange={setNewName} onSave={handleRename} />}
    </>
  );
};
