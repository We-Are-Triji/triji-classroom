import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { brutalShadow, palette } from '../theme/neoBrutal';

export default function PostCard({
  post,
  timestamp,
  rotation,
  onLike,
  isLiked,
  onPress,
  textColor,
}) {
  const [countdown, setCountdown] = useState('');

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    const calculateCountdown = () => {
      if (!post.expiresAt) return;

      const now = new Date();
      const expiresAt = post.expiresAt.toDate ? post.expiresAt.toDate() : new Date(post.expiresAt);
      const timeDiff = expiresAt.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setCountdown('expired');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        setCountdown(`${days}d, ${hours}h`);
      } else {
        setCountdown(`${hours}h`);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [post.expiresAt]);

  if (!fontsLoaded) {
    return null;
  }

  const getTextColor = backgroundColor => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#2C2C2C' : '#FFFFFF';
  };

  const dynamicTextColor = textColor || getTextColor(post.noteColor || '#FFFACD');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          transform: [{ rotate: rotation }],
          backgroundColor: post.noteColor || palette.mustard,
          opacity: post.status === 'pending' ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.personaContainer}>
          <View style={[styles.personaDot, { backgroundColor: post.personaColor || '#34C759' }]} />
          <Text style={[styles.personaText, { color: dynamicTextColor }]}>
            {post.persona || 'Anonymous'}
          </Text>
        </View>

          <Text
            style={[styles.postText, { color: dynamicTextColor }]}
            numberOfLines={4}
            ellipsizeMode="tail"
          >
          {post.content}
        </Text>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={e => {
              e.stopPropagation();
              onLike();
            }}
          >
            <Text style={[styles.heartIcon, isLiked && styles.heartLiked]}>♥</Text>
            <Text style={[styles.likeCount, { color: dynamicTextColor, opacity: 0.7 }]}>
              {post.likeCount || 0}
            </Text>
          </TouchableOpacity>

          {post.status === 'pending' ? (
            <View style={styles.pendingIndicator}>
              <Feather name="clock" size={6} color="#FF9500" />
              <Text style={styles.pendingText}>Syncing...</Text>
            </View>
          ) : (
            countdown && (
              <Text style={[styles.countdown, { color: dynamicTextColor, opacity: 0.6 }]}>
                {countdown}
              </Text>
            )
          )}
        </View>
      </View>

      {/* Sticky note tape effect */}
      <View style={styles.tape} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 108,
    height: 148,
    borderRadius: 16,
    margin: 6,
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(4, 4),
    position: 'relative',
  },
  cardContent: {
    padding: 8,
    flex: 1,
    justifyContent: 'space-between',
  },
  postText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    lineHeight: 14,
    textAlign: 'left',
    letterSpacing: 0.2,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 2,
  },

  personaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  personaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  personaText: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    fontWeight: '600',
  },

  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  heartIcon: {
    fontSize: 16,
    color: palette.textMuted,
    marginRight: 4,
  },
  heartLiked: {
    color: palette.coral,
  },
  likeCount: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#666666',
  },
  tape: {
    position: 'absolute',
    top: -9,
    right: 18,
    width: 34,
    height: 18,
    backgroundColor: palette.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: palette.border,
  },
  countdown: {
    fontSize: 8,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    fontStyle: 'italic',
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    marginRight: 2,
  },
  pendingText: {
    fontSize: 7,
    fontFamily: 'Inter_400Regular',
    color: palette.warning,
    fontStyle: 'italic',
  },
});
