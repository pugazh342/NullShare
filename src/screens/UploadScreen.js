import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, Alert, TouchableOpacity, Share, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto'; 

import { generateKey } from '../crypto/keygen';
import { encryptData } from '../crypto/encryption';
import { uploadFileToStorage } from '../api/storage';
import { createTransferDoc } from '../api/firestore';

export default function UploadScreen({ onSwitchMode }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("Ready to Secure Transfer");
  const [shareLink, setShareLink] = useState(null);
  
  // Progress Bar State (0.0 to 1.0)
  const [progress, setProgress] = useState(0);

  // 1. Pick File
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!result.canceled) {
        const selectedFile = result.assets[0];
        setFile(selectedFile);
        setStatus(`Selected: ${selectedFile.name}`);
        setShareLink(null);
        setProgress(0); // Reset progress
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. The Main Upload Logic
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0.1); // Start
    
    try {
      // --- STEP 1: READ ---
      setStatus("1️⃣ Reading File...");
      const fileData = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
      setProgress(0.3); 

      // --- STEP 2: ENCRYPT ---
      setStatus("2️⃣ Encrypting...");
      const key = generateKey(); 
      const { encryptedData, iv } = encryptData(fileData, key);
      const transferId = Crypto.randomUUID();
      const storageFilename = `${transferId}.enc`;
      setProgress(0.5); 

      // --- STEP 3: UPLOAD ---
      setStatus("3️⃣ Uploading to Cloud...");
      const storagePath = await uploadFileToStorage(encryptedData, storageFilename);
      setProgress(0.8); 

      // --- STEP 4: DATABASE ---
      setStatus("4️⃣ Saving Metadata...");
      await createTransferDoc(transferId, {
        storagePath,
        iv,
        fileName: file.name,
        fileType: file.mimeType || 'application/octet-stream',
        size: file.size
      });
      setProgress(1.0); // Finished!

      // --- SUCCESS ---
      setStatus("✅ Secure Transfer Complete!");
      const link = `nullshare://d/${transferId}#key=${key}`;
      setShareLink(link);

      // Feature: Auto-Trigger Share Menu
      shareToApps(link);

      // Feature: Auto-Delete Local File (Security)
      try {
        console.log("🗑️ Cleaning up local file...");
        await FileSystem.deleteAsync(file.uri, { idempotent: true });
        console.log("✨ Local trace wiped.");
      } catch (e) {
        console.log("Cleanup warning:", e);
      }

    } catch (error) {
      console.error("Upload Error:", error);
      setStatus("❌ Error: " + error.message);
      Alert.alert("Failed", error.message);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // Feature: Native Share Function
  const shareToApps = async (link) => {
    try {
      await Share.share({
        message: `🔐 Secure File: ${link}\n\n(This link contains the key. Don't lose it!)`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      {/* 🖼️ LOGO ADDED HERE */}
      <Image source={require('../../assets/logo.png')} style={styles.logo} />

      <Text style={styles.title}>NullShare</Text>
      <Text style={styles.subtitle}>Sender Mode</Text>
      
      {/* File Picker */}
      <View style={styles.card}>
        <Button title="1. Select File" onPress={pickFile} disabled={uploading} />
        {file && <Text style={styles.fileInfo}>{file.name}</Text>}
      </View>

      {/* Upload Button */}
      <View style={styles.card}>
        <Button 
          title={uploading ? "Processing..." : "2. Encrypt & Upload"} 
          onPress={handleUpload} 
          disabled={!file || uploading} 
          color="#00AA00" 
        />
      </View>

      {/* Progress Bar UI */}
      {uploading && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
      )}

      <Text style={styles.status}>{status}</Text>

      {/* Result Area */}
      {shareLink && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>TRANSFER COMPLETE</Text>
          <Text style={styles.linkInfo}>Link generated & copied to clipboard logic.</Text>
          
          {/* Manual Share Button */}
          <TouchableOpacity style={styles.shareBtn} onPress={() => shareToApps(shareLink)}>
            <Text style={styles.shareBtnText}>📤 Share Link Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.switchBtn}>
        <Button title="Switch to Receiver Mode 📥" onPress={onSwitchMode} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  
  // Logo & Header Styles
  logo: { width: 80, height: 80, marginBottom: 10, resizeMode: 'contain' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 18, color: '#666', marginBottom: 30 },

  // Cards
  card: { width: '100%', backgroundColor: 'white', padding: 20, borderRadius: 10, marginBottom: 15, elevation: 2 },
  fileInfo: { marginTop: 10, textAlign: 'center', fontStyle: 'italic', color: '#555' },
  status: { marginVertical: 15, fontWeight: 'bold', color: '#333' },
  
  // Progress Bar
  progressContainer: { width: '100%', height: 10, backgroundColor: '#ddd', borderRadius: 5, overflow: 'hidden', marginVertical: 10 },
  progressBar: { height: '100%', backgroundColor: '#00AA00' },

  // Result Box
  resultBox: { width: '100%', backgroundColor: '#222', padding: 15, borderRadius: 10, marginBottom: 20, alignItems: 'center' },
  resultTitle: { color: '#0f0', fontWeight: 'bold', marginBottom: 10 },
  linkInfo: { color: '#ccc', marginBottom: 15, fontSize: 12 },
  shareBtn: { backgroundColor: '#00AA00', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, width: '100%' },
  shareBtnText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },

  switchBtn: { marginTop: 30 }
});