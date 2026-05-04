import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';

export type UploadProps = {
  file: File;
  bucket?: string;
  folder?: string;
};

export const uploadImage = async ({ file, bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET_NAME!, folder }: UploadProps) => {
  throw new Error('Storage functionality needs to be implemented. Please configure your preferred storage solution.');
};

export const deleteFile = async (fileUrl: string) => {
  throw new Error('Storage functionality needs to be implemented. Please configure your preferred storage solution.');
};

export const listFiles = async (bucket: string = process.env.NEXT_PUBLIC_STORAGE_BUCKET_NAME!, folder?: string) => {
  throw new Error('Storage functionality needs to be implemented. Please configure your preferred storage solution.');
}; 