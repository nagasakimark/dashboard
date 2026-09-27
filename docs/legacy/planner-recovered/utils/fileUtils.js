import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile } from '@tauri-apps/api/fs';

export async function savePdfWithDialog(blob) {
  const isTauri = window.__TAURI__;
  
  if (isTauri) {
    try {
      // Convert blob to Uint8Array for Tauri
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Show save dialog
      const filePath = await save({
        filters: [{
          name: 'PDF Document',
          extensions: ['pdf']
        }]
      });
      
      if (filePath) {
        // Write the file using Tauri's API
        await writeBinaryFile(filePath, uint8Array);
        return true;
      }
    } catch (error) {
      console.error('Tauri save error:', error);
      throw error;
    }
  } else {
    // Browser download fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule-report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }
}
