import { supabase } from '@/integrations/supabase/client';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export async function uploadFile(
  file: File,
  userId: string,
  category: 'media' | 'file',
  onProgress?: (progress: UploadProgress) => void
): Promise<{ path: string; error: Error | null }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${category}/${fileName}`;

    // Simulate progress since Supabase SDK doesn't support progress natively
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    if (onProgress) {
      let fakeProgress = 0;
      progressInterval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + Math.random() * 15, 90);
        onProgress({
          loaded: Math.round((fakeProgress / 100) * file.size),
          total: file.size,
          percentage: Math.round(fakeProgress),
        });
      }, 300);
    }

    const { error } = await supabase.storage
      .from('user_files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (progressInterval) clearInterval(progressInterval);

    if (error) {
      return { path: '', error };
    }

    onProgress?.({ loaded: file.size, total: file.size, percentage: 100 });
    return { path: filePath, error: null };
  } catch (error) {
    return { path: '', error: error as Error };
  }
}

export async function uploadThumbnail(
  thumbnailBlob: Blob,
  userId: string,
  category: 'media' | 'file'
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.webp`;
    const filePath = `${userId}/${category}/thumbs/${fileName}`;

    const { error } = await supabase.storage
      .from('user_files')
      .upload(filePath, thumbnailBlob, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (error) return { url: null, error };

    // Get signed URL for the thumbnail (long-lived)
    const { data } = await supabase.storage
      .from('user_files')
      .createSignedUrl(filePath, 365 * 24 * 3600); // 1 year

    return { url: data?.signedUrl || null, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

export async function saveFileMetadata(
  userId: string,
  name: string,
  originalName: string,
  filePath: string,
  fileType: string,
  fileSize: number,
  mimeType: string,
  category: 'media' | 'file',
  thumbnailUrl?: string | null
) {
  const insertData: any = {
    user_id: userId,
    name,
    original_name: originalName,
    file_path: filePath,
    file_type: fileType,
    file_size: fileSize,
    mime_type: mimeType,
    category,
  };
  if (thumbnailUrl) {
    insertData.thumbnail_url = thumbnailUrl;
  }

  const { data, error } = await supabase
    .from('user_files')
    .insert(insertData)
    .select()
    .single();

  return { data, error };
}

export async function saveLink(userId: string, name: string, url: string) {
  const { data, error } = await supabase
    .from('user_links')
    .insert({
      user_id: userId,
      name,
      url,
    })
    .select()
    .single();

  return { data, error };
}

export async function getUserFiles(userId: string) {
  const { data, error } = await supabase
    .from('user_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function getUserLinks(userId: string) {
  const { data, error } = await supabase
    .from('user_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function renameFile(id: string, newName: string) {
  const { data, error } = await supabase
    .from('user_files')
    .update({ name: newName })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function renameLink(id: string, newName: string) {
  const { data, error } = await supabase
    .from('user_links')
    .update({ name: newName })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
}

export async function deleteFile(id: string, filePath: string) {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('user_files')
    .remove([filePath]);

  if (storageError) return { error: storageError };

  // Delete metadata
  const { error } = await supabase
    .from('user_files')
    .delete()
    .eq('id', id);

  return { error };
}

export async function deleteLink(id: string) {
  const { error } = await supabase
    .from('user_links')
    .delete()
    .eq('id', id);

  return { error };
}

export function getFileUrl(filePath: string) {
  const { data } = supabase.storage
    .from('user_files')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function getSignedUrl(filePath: string, transform?: { width?: number; height?: number; quality?: number }) {
  const { data, error } = await supabase.storage
    .from('user_files')
    .createSignedUrl(filePath, 3600, { transform }); // 1 hour

  return { url: data?.signedUrl, error };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
