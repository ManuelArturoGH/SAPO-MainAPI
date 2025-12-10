import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor() {
    this.configureCloudinary();
  }

  private configureCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary credentials not found. Image upload will be disabled.',
      );
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.isConfigured = true;
    this.logger.log('Cloudinary configured successfully');
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'employee-profiles',
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await new Promise<{ secure_url: string }>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: folder,
              resource_type: 'image',
              transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                { quality: 'auto' },
              ],
            },
            (error, result) => {
              if (error) reject(new Error(error.message));
              else resolve(result as { secure_url: string });
            },
          );
          uploadStream.end(file.buffer);
        },
      );

      this.logger.log(`Image uploaded to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      this.logger.error('Error uploading image to Cloudinary', error);
      throw new Error('Failed to upload image');
    }
  }

  async deleteImage(imageUrl: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const parts = imageUrl.split('/');
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      const publicId = `${folder}/${filename.split('.')[0]}`;

      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      this.logger.error('Error deleting image from Cloudinary', error);
      return false;
    }
  }
}
