/**
 * Client-side image compression and optimization
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp';
}


export async function compressImage(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }


      ctx.drawImage(img, 0, 0, width, height);
      
      const compressedDataUrl = canvas.toDataURL(format, quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.src = dataUrl;
  });
}


export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


export async function optimizeUpload(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  return compressImage(dataUrl, options);
}

/**
 * Transforms a Firebase Storage original URL into a thumbnail URL via string manipulation.
 * @important This only works if the thumbnails have the same access token as the original 
 * or if they are publicly accessible.
 * 
 * @param originalUrl The download URL of the original image
 * @param size The requested thumbnail size (must match extension config)
 * @returns The transformed thumbnail URL
 */
export function getFirebaseThumbnail(
  originalUrl: string | null | undefined,
  size: '200x200' | '400x400' = '200x200'
): string {
  if (!originalUrl || !originalUrl.includes('firebasestorage.googleapis.com')) {
    return originalUrl || '';
  }

  try {
    // 1. Inject 'thumbnails%2F' into the storage path
    let thumbUrl = originalUrl.replace('/o/', '/o/thumbnails%2F');
    
    // 2. Extract path and handle the token (Solution A: Public Access)
    const queryIndex = thumbUrl.indexOf('?');
    const pathPart = queryIndex === -1 ? thumbUrl : thumbUrl.substring(0, queryIndex);
    
    // 3. Handle size suffix and force .webp extension
    const lastDotIndex = pathPart.lastIndexOf('.');
    const lastSlashIndex = pathPart.lastIndexOf('%2F');
    
    let finalPath = '';
    if (lastDotIndex > lastSlashIndex) {
      // Replace original extension with size + .webp
      finalPath = pathPart.substring(0, lastDotIndex) + `_${size}.webp`;
    } else {
      // Append size + .webp if no extension
      finalPath = pathPart + `_${size}.webp`;
    }
    
    // 4. Return the public URL (alt=media is required to view in browser, but token is removed)
    return `${finalPath}?alt=media`;
  } catch (error) {
    return originalUrl;
  }
}
