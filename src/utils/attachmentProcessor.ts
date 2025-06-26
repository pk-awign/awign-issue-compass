
export interface AttachmentMetadata {
  name: string;
  size: string;
  type: string;
  uploadTime: string;
  icon: string;
  thumbnail?: string;
}

export const processAttachments = async (files: File[]): Promise<AttachmentMetadata[]> => {
  const attachments: AttachmentMetadata[] = [];
  
  for (const file of files) {
    const metadata: AttachmentMetadata = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || 'unknown',
      uploadTime: new Date().toLocaleString(),
      icon: getFileIcon(file.type),
    };

    // Generate thumbnail for images
    if (file.type.startsWith('image/')) {
      try {
        metadata.thumbnail = await generateImageThumbnail(file);
      } catch (error) {
        console.warn('Failed to generate thumbnail for:', file.name);
      }
    }

    attachments.push(metadata);
  }

  return attachments;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  return '📎';
};

const generateImageThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const maxSize = 100;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
