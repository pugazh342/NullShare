import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';
import UploadScreen from './src/screens/UploadScreen';
import DownloadScreen from './src/screens/DownloadScreen';

export default function App() {
  // Simple state to toggle screens
  const [mode, setMode] = useState('upload'); // 'upload' or 'download'

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {mode === 'upload' ? (
        <UploadScreen onSwitchMode={() => setMode('download')} />
      ) : (
        <DownloadScreen onSwitchMode={() => setMode('upload')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
});