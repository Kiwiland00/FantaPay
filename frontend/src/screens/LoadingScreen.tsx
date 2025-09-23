import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';

const LoadingScreen: React.FC = () => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>{t('loading')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
});

export default LoadingScreen;