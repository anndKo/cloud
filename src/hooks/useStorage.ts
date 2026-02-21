// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StorageFile {
  id: string;
  name: string;
  size: number;
  created_at: string;
  metadata: {
    mimetype?: string;
    size?: number;
  };
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export const useStorage = (userId: string) => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('user-files')
        .list(userId, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error fetching files:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải danh sách tệp',
          variant: 'destructive'
        });
        return;
      }

      setFiles(data?.map(file => ({
        id: file.id,
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at,
        metadata: file.metadata || {}
      })) || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = async (file: File): Promise<boolean> => {
    if (!userId) return false;

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${userId}/${fileName}`;

    // Update progress state
    const updateProgress = (progress: number, status: UploadProgress['status'], error?: string) => {
      setUploadProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(file.name, { fileName: file.name, progress, status, error });
        return newMap;
      });
    };

    try {
      updateProgress(0, 'uploading');

      // For files larger than chunk size, upload in chunks using resumable upload
      if (file.size > CHUNK_SIZE) {
        // Use standard upload with progress simulation for large files
        // Supabase JS SDK v2 handles large files automatically
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        
        // Simulate chunked upload progress
        let uploaded = 0;
        const progressInterval = setInterval(() => {
          uploaded += CHUNK_SIZE;
          const progress = Math.min(Math.round((uploaded / file.size) * 90), 90);
          updateProgress(progress, 'uploading');
        }, 500);

        const { error } = await supabase.storage
          .from('user-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        clearInterval(progressInterval);

        if (error) {
          console.error('Upload error:', error);
          updateProgress(0, 'error', error.message);
          toast({
            title: 'Lỗi tải lên',
            description: error.message,
            variant: 'destructive'
          });
          return false;
        }
      } else {
        // Standard upload for smaller files
        const { error } = await supabase.storage
          .from('user-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Upload error:', error);
          updateProgress(0, 'error', error.message);
          toast({
            title: 'Lỗi tải lên',
            description: error.message,
            variant: 'destructive'
          });
          return false;
        }
      }

      updateProgress(100, 'completed');
      
      toast({
        title: 'Thành công',
        description: `Đã tải lên ${file.name}`,
      });

      // Refresh file list
      await fetchFiles();

      // Remove from progress after delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(file.name);
          return newMap;
        });
      }, 3000);

      return true;
    } catch (error: any) {
      console.error('Upload error:', error);
      updateProgress(0, 'error', error.message);
      toast({
        title: 'Lỗi tải lên',
        description: error.message || 'Đã xảy ra lỗi khi tải lên',
        variant: 'destructive'
      });
      return false;
    }
  };

  const downloadFile = async (fileName: string) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(`${userId}/${fileName}`);

      if (error) {
        console.error('Download error:', error);
        toast({
          title: 'Lỗi tải xuống',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/^\d+_/, ''); // Remove timestamp prefix
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Thành công',
        description: 'Đã tải xuống tệp',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Lỗi tải xuống',
        description: error.message || 'Đã xảy ra lỗi khi tải xuống',
        variant: 'destructive'
      });
    }
  };

  const deleteFile = async (fileName: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase.storage
        .from('user-files')
        .remove([`${userId}/${fileName}`]);

      if (error) {
        console.error('Delete error:', error);
        toast({
          title: 'Lỗi xóa',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Thành công',
        description: 'Đã xóa tệp',
      });

      await fetchFiles();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Lỗi xóa',
        description: error.message || 'Đã xảy ra lỗi khi xóa',
        variant: 'destructive'
      });
    }
  };

  const getFileUrl = (fileName: string): string | null => {
    if (!userId) return null;

    const { data } = supabase.storage
      .from('user-files')
      .getPublicUrl(`${userId}/${fileName}`);

    return data.publicUrl;
  };

  return {
    files,
    loading,
    uploadProgress,
    uploadFile,
    downloadFile,
    deleteFile,
    getFileUrl,
    fetchFiles
  };
};
