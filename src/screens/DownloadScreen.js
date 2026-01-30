import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing'; 

import { getTransferDetails, incrementDownloadCount } from '../api/firestore';
import { downloadFileFromUrl } from '../api/storage';
import { decryptData } from '../crypto/encryption';

export default function DownloadScreen({ onSwitchMode }) {
  const [transferId, setTransferId] = useState(''); 
  const [decryptionKey, setDecryptionKey] = useState('');
  const [status, setStatus] = useState('Enter details to receive file');
  const [loading, setLoading] = useState(false);
  
  // State to hold the file after decryption
  const [downloadedFile, setDownloadedFile] = useState(null); // { uri, name }

  // PHASE 1: Download & Decrypt
  const handleDecrypt = async () => {
    if (!transferId || !decryptionKey) {
      Alert.alert("Missing Info", "Please enter UUID and Key");
      return;
    }

    setLoading(true);
    setStatus("🔍 Checking Metadata...");

    try {
      // 1. Get Metadata
      const metadata = await getTransferDetails(transferId.trim());
      
      setStatus("⬇️ Downloading Encrypted Blob...");
      // 2. Download Encrypted Blob
      const encryptedBase64 = await downloadFileFromUrl(metadata.storagePath);

      setStatus("🔐 Decrypting...");
      // 3. Decrypt
      const decryptedBase64 = decryptData(encryptedBase64, decryptionKey.trim(), metadata.iv);

      if (!decryptedBase64) throw new Error("Decryption Failed (Wrong Key?)");

      setStatus("💾 Saving to Cache...");
      // 4. Save to Cache
      const fileUri = FileSystem.cacheDirectory + metadata.fileName;
      await FileSystem.writeAsStringAsync(fileUri, decryptedBase64, {
        encoding: FileSystem.EncodingType.Base64
      });

      // 5. Success!
      await incrementDownloadCount(transferId.trim());
      
      setDownloadedFile({ uri: fileUri, name: metadata.fileName });
      setStatus("✅ File Decrypted & Ready!");

    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
      Alert.alert("Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  // PHASE 2: User Actions
  const handleShare = async () => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloadedFile.uri);
    } else {
      Alert.alert("Error", "Sharing not supported on this device");
    }
  };

  const handleSave = async () => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloadedFile.uri, { dialogTitle: "Save File" });
    }
  };

  const reset = () => {
    setDownloadedFile(null);
    setStatus("Enter details to receive file");
    setTransferId('');
    setDecryptionKey('');
  };

  return (
    <View style={styles.container}>
      {/* 🖼️ LOGO */}
      <Image source={require('../../assets/logo.png')} style={styles.logo} />

      <Text style={styles.title}>NullShare</Text>
      <Text style={styles.subtitle}>Receiver Mode</Text>

      {/* SHOW INPUTS ONLY IF NO FILE IS READY */}
      {!downloadedFile ? (
        <>
          <Text style={styles.label}>Transfer ID (UUID):</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. fcdd9897..." 
            value={transferId} 
            onChangeText={setTransferId} 
            autoCapitalize="none"
          />

          <Text style={styles.label}>Decryption Key (Hex):</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Paste key here" 
            value={decryptionKey} 
            onChangeText={setDecryptionKey} 
            autoCapitalize="none"
          />

          <View style={styles.btn}>
            <Button 
              title={loading ? "Processing..." : "🔓 Decrypt File"} 
              onPress={handleDecrypt} 
              disabled={loading} 
              color="#00AA00"
            />
          </View>
        </>
      ) : (
        /* SHOW ACTION BUTTONS IF FILE IS READY */
        <View style={styles.actionCard}>
          <Text style={styles.fileTitle}>📄 {downloadedFile.name}</Text>
          <Text style={styles.successText}>File is ready!</Text>

          <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
            <Text style={styles.btnText}>📂 Save / Open</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
            <Text style={styles.btnText}>📤 Share File</Text>
          </TouchableOpacity>

          <Button title="Decrypt Another File" onPress={reset} color="#666" />
        </View>
      )}
      
      <Text style={styles.status}>{status}</Text>
      
      {!downloadedFile && (
        <View style={styles.switchBtn}>
          <Button title="Switch to Sender Mode 📤" onPress={onSwitchMode} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f5f5f5' },
  
  // Logo & Header
  logo: { width: 80, height: 80, marginBottom: 10, alignSelf: 'center', resizeMode: 'contain' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#666', marginBottom: 20, textAlign: 'center' },

  label: { fontWeight: 'bold', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginTop: 5, backgroundColor: '#fff' },
  btn: { marginVertical: 20 },
  status: { textAlign: 'center', marginBottom: 20, color: '#333', marginTop: 20 },
  switchBtn: { marginTop: 30 },
  
  // Success Card
  actionCard: { backgroundColor: 'white', padding: 20, borderRadius: 10, elevation: 3, alignItems: 'center' },
  fileTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  successText: { color: '#00AA00', marginBottom: 20 },
  actionBtn: { backgroundColor: '#333', padding: 15, borderRadius: 8, width: '100%', marginBottom: 10 },
  shareBtn: { backgroundColor: '#007AFF' },
  btnText: { color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }
});