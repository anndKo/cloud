// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { CameraCapture } from "@/components/storage/CameraCapture";
import { FileUpload } from "@/components/storage/FileUpload";
import { FileList } from "@/components/storage/FileList";
import { SearchBar } from "@/components/storage/SearchBar";
import { StorageHeader } from "@/components/storage/StorageHeader";
import { Camera, Upload, Image, FileText } from "lucide-react";

export interface UserFile {
  id: string;
  name: string;
  original_name: string;
  file_type: "image" | "video" | "file" | "link";
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

const Storage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<UserFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "media" | "files">("all");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
      else { setLoading(false); fetchFiles(); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchFiles = async () => {
    const { data, error } = await (supabase as any).from("user_files").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Không thể tải danh sách file"); return; }
    const typedData = (data || []).map((file: any) => ({
      ...file,
      file_type: file.file_type as "image" | "video" | "file" | "link",
    })) as UserFile[];
    setFiles(typedData);
  };

  useEffect(() => {
    let filtered = files;
    if (searchQuery) filtered = filtered.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (activeTab === "media") filtered = filtered.filter((file) => file.file_type === "image" || file.file_type === "video");
    else if (activeTab === "files") filtered = filtered.filter((file) => file.file_type === "file" || file.file_type === "link");
    setFilteredFiles(filtered);
  }, [files, searchQuery, activeTab]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };
  const handleFileUploaded = () => { fetchFiles(); };
  const handleFileDeleted = (fileId: string) => { setFiles(files.filter((f) => f.id !== fileId)); };
  const handleFileRenamed = (fileId: string, newName: string) => { setFiles(files.map((f) => (f.id === fileId ? { ...f, name: newName } : f))); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showCamera && <CameraCapture onClose={() => setShowCamera(false)} onCapture={handleFileUploaded} userId={user?.id || ""} />}
      {showUpload && <FileUpload onClose={() => setShowUpload(false)} onUpload={handleFileUploaded} userId={user?.id || ""} />}
      <StorageHeader user={user} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button onClick={() => setShowCamera(true)} className="file-card flex flex-col items-center justify-center gap-3 py-8 cursor-pointer hover:border-primary/50 group">
            <div className="w-14 h-14 rounded-2xl btn-gradient flex items-center justify-center group-hover:animate-pulse-glow"><Camera className="w-7 h-7 text-primary-foreground" /></div>
            <span className="font-medium">Mở Camera</span><span className="text-sm text-muted-foreground">Chụp ảnh hoặc quay video</span>
          </button>
          <button onClick={() => setShowUpload(true)} className="file-card flex flex-col items-center justify-center gap-3 py-8 cursor-pointer hover:border-accent/50 group">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center group-hover:animate-pulse-glow"><Upload className="w-7 h-7 text-accent-foreground" /></div>
            <span className="font-medium">Tải lên</span><span className="text-sm text-muted-foreground">Ảnh, video, file, link</span>
          </button>
        </div>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setActiveTab("all")} className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>Tất cả</button>
          <button onClick={() => setActiveTab("media")} className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "media" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}><Image className="w-4 h-4" />Ảnh - Video</button>
          <button onClick={() => setActiveTab("files")} className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "files" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}><FileText className="w-4 h-4" />File - Link</button>
        </div>
        <FileList files={filteredFiles} onDelete={handleFileDeleted} onRename={handleFileRenamed} userId={user?.id || ""} />
      </main>
    </div>
  );
};

export default Storage;
