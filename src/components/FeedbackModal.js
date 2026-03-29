import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { brutalButton, brutalCard, palette } from '../theme/neoBrutal';

const toneMap = {
  error: {
    background: '#F8D9D3',
    accent: palette.error,
    icon: 'alert-circle',
    button: palette.coral,
  },
  success: {
    background: '#DDEDE9',
    accent: palette.success,
    icon: 'check-circle',
    button: palette.sage,
  },
  info: {
    background: '#F6E7C8',
    accent: palette.teal,
    icon: 'info',
    button: palette.mustard,
  },
};

export default function FeedbackModal({
  visible,
  title,
  message,
  tone = 'info',
  actionLabel = 'Got it',
  onClose,
}) {
  const theme = toneMap[tone] || toneMap.info;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: palette.white }]}>
              <Feather name={theme.icon} size={22} color={theme.accent} />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.button }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 43, 43, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 22,
    borderRadius: 28,
    ...brutalCard(palette.surface),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    marginBottom: 18,
  },
  button: {
    ...brutalButton(palette.mustard),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
});
