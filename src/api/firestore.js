import { db } from '../../firebaseConfig';
import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp, Timestamp } from "firebase/firestore";

/**
 * [SENDER] Creates the metadata document in Firestore.
 */
export const createTransferDoc = async (transferId, metadata) => {
  try {
    console.log(`🔥 Firestore: Attempting to save doc ${transferId}...`);
    
    // Expiry: Current Time + 24 Hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await setDoc(doc(db, "transfers", transferId), {
      storagePath: metadata.storagePath, // Supabase URL
      iv: metadata.iv,                   // Public IV
      fileName: metadata.fileName,
      fileType: metadata.fileType,
      size: metadata.size,
      
      // Security Limits
      downloadCount: 0,
      maxDownloads: 5,                   
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt)
    });

    console.log("✅ Firestore: Save Successful!");
    return true;
  } catch (error) {
    console.error("❌ Firestore Write Error:", error);
    throw new Error(`Database Save Failed: ${error.message}`);
  }
};

/**
 * [RECEIVER] Fetches metadata and checks security rules.
 */
export const getTransferDetails = async (transferId) => {
  try {
    const docRef = doc(db, "transfers", transferId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error("Transfer not found. It may have been deleted.");
    }

    const data = docSnap.data();

    // 1. Check Expiry
    const now = new Date();
    if (data.expiresAt.toDate() < now) {
      throw new Error("This transfer has expired 💀");
    }

    // 2. Check Download Limit
    if (data.downloadCount >= data.maxDownloads) {
      throw new Error("Download limit reached 🚫");
    }

    return data; 
  } catch (error) {
    console.error("Firestore Read Error:", error);
    throw error;
  }
};

/**
 * [RECEIVER] Increments the download count.
 */
export const incrementDownloadCount = async (transferId) => {
  try {
    const docRef = doc(db, "transfers", transferId);
    await updateDoc(docRef, {
      downloadCount: increment(1)
    });
  } catch (error) {
    console.error("Firestore Update Error:", error);
  }
};