// @ts-nocheck
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Image, Video, File, Link as LinkIcon, Check } from "lucide-react";

interface FileUploadProps {
  onClose: () => void;
  onUpload: () => void;
  userId: string;
}

type UploadType = "image" | "video" | "file" | "link";

export const FileUpload = ({ onClose, onUpload, userId }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<UploadType>("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadTypes = [
    { type: "image" as UploadType, icon: Image, label: "Ảnh" },
    { type: "video" as UploadType, icon: Video, label: "Video" },
    { type: "file" as UploadType, icon: File, label: "File" },
    { type: "link" as UploadType, icon: LinkIcon, label: "Link" },
  ];

  const getAcceptTypes = () => {
    switch (uploadType) {
      case "image": return "image/*";
      case "video": return "video/*";
      default: return "*/*";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024 * 1024) {
        toast.error("File quá lớn. Tối đa 20GB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async () => {
    if (uploadType === "link") {
      if (!linkUrl.trim()) { toast.error("Vui lòng nhập URL"); return; }
      setUploading(true);
      try {
        const { error } = await supabase.from("user_links").insert({
          user_id: userId, name: linkName || linkUrl, url: linkUrl,
        });
        if (error) throw error;
        toast.success("Đã lưu link!");
        onUpload(); onClose();
      } catch (error) { toast.error("Không thể lưu link"); }
      finally { setUploading(false); }
      return;
    }

    if (!selectedFile) { toast.error("Vui lòng chọn file"); return; }
    setUploading(true); setUploadProgress(0);

    try {
      const timestamp = Date.now();
      const filePath = `${userId}/${timestamp}_${selectedFile.name}`;
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => { if (prev >= 90) { clearInterval(progressInterval); return prev; } return prev + Math.random() * 10; });
      }, 200);

      const { error: uploadError } = await supabase.storage.from("user_files").upload(filePath, selectedFile);
      clearInterval(progressInterval);
      if (uploadError) throw uploadError;
      setUploadProgress(100);

      let fileType: "image" | "video" | "file" = "file";
      if (selectedFile.type.startsWith("image/")) fileType = "image";
      else if (selectedFile.type.startsWith("video/")) fileType = "video";

      const { error: dbError } = await supabase.from("user_files").insert({
        user_id: userId, name: selectedFile.name, original_name: selectedFile.name,
        file_type: fileType, file_path: filePath, file_size: selectedFile.size, mime_type: selectedFile.type,
        category: fileType === 'image' || fileType === 'video' ? 'media' : 'file',
      });
      if (dbError) throw dbError;

      toast.success("Tải lên thành công!");
      onUpload(); onClose();
    } catch (error) { toast.error("Không thể tải lên file"); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Tải lên</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-2">
            {uploadTypes.map(({ type, icon: Icon, label }) => (
              <button key={type} onClick={() => { setUploadType(type); setSelectedFile(null); setLinkUrl(""); setLinkName(""); }}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${uploadType === type ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                <Icon className="w-5 h-5" /><span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {uploadType === "link" ? (
            <div className="space-y-4">
              <div className="space-y-2"><Label>URL</Label><Input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="h-12 rounded-xl" /></div>
              <div className="space-y-2"><Label>Tên (tùy chọn)</Label><Input type="text" placeholder="Tên hiển thị" value={linkName} onChange={(e) => setLinkName(e.target.value)} className="h-12 rounded-xl" /></div>
            </div>
          ) : (
            <div className="space-y-4">
              <input ref={fileInputRef} type="file" accept={getAcceptTypes()} onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="upload-zone w-full flex flex-col items-center gap-4 cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Upload className="w-8 h-8 text-primary" /></div>
                <div className="text-center">
                  <p className="font-medium">{selectedFile ? selectedFile.name : "Chọn file để tải lên"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "Tối đa 20GB"}</p>
                </div>
              </button>
              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Check className="w-5 h-5 text-primary" /></div>
                  <div className="flex-1 min-w-0"><p className="font-medium truncate">{selectedFile.name}</p><p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                  <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-secondary rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Đang tải lên...</span><span>{Math.round(uploadProgress)}%</span></div>
              <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} /></div>
            </div>
          )}

          <Button onClick={uploadFile} disabled={uploading || (uploadType === "link" ? !linkUrl : !selectedFile)} className="w-full h-12 rounded-xl btn-gradient">
            {uploading ? (<div className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Đang tải lên...</div>) : (<><Upload className="w-5 h-5 mr-2" />Tải lên</>)}
          </Button>
        </div>
      </div>
    </div>
  );
};
