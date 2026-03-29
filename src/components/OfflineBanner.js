import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import { brutalButton, brutalCard, palette } from '../theme/neoBrutal';

export default function OfflineBanner() {
  const { isConnected } = useNetwork();
  const [wasOffline, setWasOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isConnected === false) {
      setWasOffline(true);
    } else if (isConnected === true && wasOffline) {
      setShowBackOnline(true);
      setWasOffline(false);

      // Fade out after 3 seconds
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setShowBackOnline(false);
          fadeAnim.setValue(1);
        });
      }, 3000);
    }
  }, [isConnected, wasOffline]);

  if (showBackOnline) {
    return (
      <Animated.View style={[styles.banner, styles.onlineBanner, { opacity: fadeAnim }]}>
        <Feather name="wifi" size={16} color={palette.text} />
        <Text style={styles.onlineText}>Back Online! Syncing...</Text>
      </Animated.View>
    );
  }

  if (isConnected === false) {
    return (
      <>
        <View style={[styles.banner, styles.offlineBanner]}>
          <Feather name="wifi-off" size={16} color={palette.text} />
          <Text style={styles.offlineText}>Offline mode: showing your last cached updates</Text>
          <TouchableOpacity style={styles.infoButton} onPress={() => setShowHelpModal(true)}>
            <Feather name="help-circle" size={16} color={palette.text} />
          </TouchableOpacity>
        </View>

        <Modal
          visible={showHelpModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowHelpModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowHelpModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Feather name="wifi-off" size={24} color={palette.warning} />
                <Text style={styles.modalTitle}>Offline Mode</Text>
                <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                  <Feather name="x" size={24} color={palette.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="x-circle" size={18} color={palette.error} />
                  <Text style={styles.sectionTitle}>Unavailable Features</Text>
                </View>
                <Text style={styles.featureItem}>• Publish new announcements or edits</Text>
                <Text style={styles.featureItem}>• Create or update tasks</Text>
                <Text style={styles.featureItem}>• Post to Freedom Wall</Text>
                <Text style={styles.featureItem}>• Update profile information</Text>
                <Text style={styles.featureItem}>• Receive live remote notifications</Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="check-circle" size={18} color={palette.success} />
                  <Text style={styles.sectionTitle}>What You Can Do</Text>
                </View>
                <Text style={styles.featureItem}>• Use the Grade Calculator</Text>
                <Text style={styles.featureItem}>• Browse your cached dashboard updates</Text>
                <Text style={styles.featureItem}>• Stay signed in with your saved session</Text>
                <Text style={styles.featureItem}>• Browse app settings</Text>
              </View>

              <View style={styles.tipBox}>
                <Feather name="info" size={16} color={palette.text} />
                <Text style={styles.tipText}>
                  Your changes will sync automatically when you reconnect
                </Text>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={() => setShowHelpModal(false)}>
                <Text style={styles.closeButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  offlineBanner: {
    backgroundColor: palette.peach,
  },
  onlineBanner: {
    backgroundColor: palette.sage,
  },
  offlineText: {
    color: palette.text,
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  onlineText: {
    color: palette.text,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  infoButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 43, 43, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    ...brutalCard(palette.background),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    flex: 1,
    marginLeft: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  featureItem: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
    marginBottom: 6,
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.mustard,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: palette.border,
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    flex: 1,
    lineHeight: 18,
  },
  closeButton: {
    paddingVertical: 14,
    alignItems: 'center',
    ...brutalButton(palette.teal),
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
});
