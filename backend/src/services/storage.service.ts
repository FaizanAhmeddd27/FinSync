import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  /**
   * Upload an image to Supabase Storage and returns the public URL
   * @param file Buffer of the image
   * @param bucket Bucket name (e.g., 'avatars')
   * @param folder Folder inside bucket (e.g., 'users')
   */
  static async uploadImage(file: Express.Multer.File, bucket: string = 'avatars', folder: string = 'users'): Promise<string> {
    try {
      
      const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.getBucket(bucket);
      
      if (bucketError || !bucketData) {
        logger.info(`Bucket "${bucket}" not found. Creating it...`);
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 
        });
        
        if (createError) {
          logger.error(`Failed to create bucket "${bucket}":`, createError);
        }
      } else if (!bucketData.public) {
        logger.info(`Bucket "${bucket}" is private. Updating to public...`);
        await supabaseAdmin.storage.updateBucket(bucket, { public: true });
      }

      const fileExt = file.originalname.split('.').pop() || 'png';
      const fileName = `${folder}/${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;

      logger.debug(`Uploading file to Supabase: ${filePath} (${file.size} bytes)`);

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        logger.error('Supabase storage upload error:', error);
        throw new BadRequestError(`Failed to upload image: ${error.message}`);
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path);

      logger.success(`Image uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      logger.error('Storage service catch error:', error);
      throw error instanceof BadRequestError ? error : new BadRequestError('Something went wrong with the image upload.');
    }
  }

  /**
   * Upload a Buffer to Supabase Storage and returns the public URL
   * @param buffer Buffer of the file
   * @param mimeType MIME type (e.g. 'image/png')
   * @param originalName Desired file name with extension
   * @param bucket Bucket name (e.g., 'qrcodes')
   * @param folder Folder inside bucket (e.g., 'users')
   */
  static async uploadBuffer(buffer: Buffer, mimeType: string, originalName: string, bucket: string = 'qrcodes', folder: string = 'users'): Promise<string> {
    try {
      
      const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.getBucket(bucket);
      
      if (bucketError || !bucketData) {
        logger.info(`Bucket "${bucket}" not found. Creating it...`);
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 
        });
        
        if (createError) {
          logger.error(`Failed to create bucket "${bucket}":`, createError);
        }
      } else if (!bucketData.public) {
        await supabaseAdmin.storage.updateBucket(bucket, { public: true });
      }

      const fileExt = originalName.split('.').pop() || 'png';
      const fileName = `${folder}/${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;

      logger.debug(`Uploading buffer to Supabase: ${filePath} (${buffer.length} bytes)`);

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        logger.error('Supabase storage upload error:', error);
        throw new BadRequestError(`Failed to upload buffer: ${error.message}`);
      }

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path);

      logger.success(`Buffer uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      logger.error('uploadBuffer catch error:', error);
      throw new BadRequestError('Something went wrong with the buffer upload.');
    }
  }

  /**
   * Delete an image from Supabase Storage
   * @param url Public URL of the image
   * @param bucket Bucket name
   */
  static async deleteImage(url: string, bucket: string = 'avatars'): Promise<void> {
    try {
      
      const urlParts = url.split(`${bucket}/`);
      if (urlParts.length < 2) return;
      
      const path = urlParts[1];
      const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
      
      if (error) {
        logger.warn('Failed to delete old image from storage:', error);
      }
    } catch (error) {
      logger.error('Delete image error:', error);
    }
  }
}
