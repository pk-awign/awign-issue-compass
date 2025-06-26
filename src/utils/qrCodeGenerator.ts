
export const generateQRCodeDataURL = (text: string, size: number = 100): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('');
      return;
    }

    canvas.width = size;
    canvas.height = size;
    
    // Simple QR code placeholder - you could integrate a proper QR library here
    // For now, we'll create a simple pattern
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(5, 5, size - 10, size - 10);
    
    ctx.fillStyle = '#000000';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR', size / 2, size / 2);
    
    resolve(canvas.toDataURL());
  });
};
