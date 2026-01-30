import { supabase } from '../supabaseConfig';

/**
 * [SENDER] Uploads the ENCRYPTED string to Supabase Storage.
 * Uses manual ArrayBuffer conversion for stability.
 */
export const uploadFileToStorage = async (encryptedData, filename) => {
  try {
    console.log("🔄 Preparing upload to Supabase...");

    // Convert Base64 string to ArrayBuffer manually
    const binaryString = atob(encryptedData);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    console.log(`☁️ Uploading ${filename} (${arrayBuffer.byteLength} bytes)...`);

    // Upload to Supabase bucket 'uploads'
    const { error } = await supabase
      .storage
      .from('uploads')
      .upload(filename, arrayBuffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (error) throw error;

    // Get the Public URL
    const { data: publicData } = supabase
      .storage
      .from('uploads')
      .getPublicUrl(filename);

    console.log("✅ Upload Success:", publicData.publicUrl);
    return publicData.publicUrl;

  } catch (error) {
    console.error("Storage Upload Error:", error);
    throw error;
  }
};

/**
 * [RECEIVER] Downloads the encrypted blob and returns it as Base64.
 */
export const downloadFileFromUrl = async (publicUrl) => {
  try {
    console.log("⬇️ Downloading blob from:", publicUrl);
    
    // Fetch the raw blob
    const response = await fetch(publicUrl);
    const blob = await response.blob();

    // Convert Blob -> Base64 (Required for decryption)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // reader.result looks like "data:application/octet-stream;base64,XYZ..."
        // We split by comma to get just the "XYZ..."
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Storage Download Error:", error);
    throw error;
  }
};