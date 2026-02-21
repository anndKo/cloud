// @ts-nocheck
import { useRef } from 'react';
import { ArrowLeft, Upload, File, Image, Video, Music, FileText, Archive, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useStorage, StorageFile, UploadProgress } from '@/hooks/useStorage';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface StoragePageProps {
  userId: string;
  onBack: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz'];

  if (imageExts.includes(ext)) return <Image className="w-5 h-5 text-success" />;
  if (videoExts.includes(ext)) return <Video className="w-5 h-5 text-accent" />;
  if (audioExts.includes(ext)) return <Music className="w-5 h-5 text-warning" />;
  if (docExts.includes(ext)) return <FileText className="w-5 h-5 text-primary" />;
  if (archiveExts.includes(ext)) return <Archive className="w-5 h-5 text-muted-foreground" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
};

export const StoragePage = ({ userId, onBack }: StoragePageProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { files, loading, uploadProgress, uploadFile, downloadFile, deleteFile } = useStorage(userId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Upload all selected files
    for (const file of Array.from(selectedFiles)) {
      await uploadFile(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const progressArray = Array.from(uploadProgress.values());

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">Kho lưu trữ</h1>
          <p className="text-sm text-muted-foreground">Quản lý tệp và ảnh của bạn</p>
        </div>
        <Button variant="gradient" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />
          Tải lên
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Upload Progress */}
      {progressArray.length > 0 && (
        <div className="p-4 border-b border-border space-y-3">
          {progressArray.map((progress) => (
            <div key={progress.fileName} className="glass rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground truncate flex-1 mr-4">
                  {progress.fileName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {progress.status === 'uploading' ? `${progress.progress}%` : 
                   progress.status === 'completed' ? 'Hoàn thành' : 'Lỗi'}
                </span>
              </div>
              <Progress 
                value={progress.progress} 
                className={`h-2 ${progress.status === 'error' ? 'bg-destructive/20' : ''}`}
              />
              {progress.error && (
                <p className="text-xs text-destructive mt-1">{progress.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-muted-foreground">Đang tải...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Archive className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Chưa có tệp nào</h3>
            <p className="text-muted-foreground mb-4">
              Tải lên ảnh, video và tệp của bạn để lưu trữ an toàn
            </p>
            <Button variant="gradient" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Tải lên tệp đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                onDownload={() => downloadFile(file.name)}
                onDelete={() => deleteFile(file.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drop zone overlay hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <p className="text-xs text-muted-foreground">
          Hỗ trợ tệp dung lượng lớn (nhiều GB)
        </p>
      </div>
    </div>
  );
};

interface FileItemProps {
  file: StorageFile;
  onDownload: () => void;
  onDelete: () => void;
}

const FileItem = ({ file, onDownload, onDelete }: FileItemProps) => {
  const displayName = file.name.replace(/^\d+_/, ''); // Remove timestamp prefix

  return (
    <div className="glass rounded-xl p-4 flex items-center gap-4 group hover:bg-card/90 transition-colors">
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        {getFileIcon(file.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{displayName}</p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{formatFileSize(file.metadata?.size || file.size || 0)}</span>
          <span>•</span>
          <span>
            {formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: vi })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          className="text-muted-foreground hover:text-foreground"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
