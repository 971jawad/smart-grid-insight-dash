
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const uploadToSupabase = async (file: File, userId: string): Promise<string | null> => {
  try {
    // Create a folder structure with user ID
    const folderPath = `${userId}/${new Date().getTime()}_${file.name}`;
    
    // Upload the file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('csv_files')
      .upload(folderPath, file, {
        contentType: file.type || 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    // Save file metadata to database
    const { data: fileData, error: fileError } = await supabase
      .from('csv_files')
      .insert([
        {
          user_id: userId,
          filename: uploadData.path.split('/').pop(),
          original_name: file.name,
          size: file.size,
          mime_type: file.type || 'text/csv',
          source: 'upload',
          storage_path: uploadData.path,
        },
      ])
      .select('id')
      .single();

    if (fileError) {
      throw new Error(fileError.message);
    }

    return fileData.id;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }
};

export const scanFile = async (fileId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('scan-file', {
      body: { fileId, bucketId: 'csv_files' },
    });

    if (error) {
      throw error;
    }

    if (!data.success) {
      toast.error(data.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error scanning file:', error);
    toast.error('Failed to scan file for security threats');
    return false;
  }
};
