/**
 * Google Auth Prompt - Lightweight modal to gate premium features
 *
 * Encourages users to sign in with Google before they can unlock premium content.
 */

import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface GoogleAuthPromptProps {
  visible: boolean;
  busy: boolean;
  error?: string | null;
  onSignIn: () => Promise<void> | void;
  onClose: () => void;
}

export function GoogleAuthPrompt({ visible, busy, error, onSignIn, onClose }: GoogleAuthPromptProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={SlideInDown.duration(400)}
          style={styles.card}
        >
          <LinearGradient
            colors={Gradients.surface}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <Animated.View entering={FadeIn.delay(80)} style={styles.header}>
            <Text style={styles.title}>プレミアムを続けるには</Text>
            <Text style={styles.subtitle}>Google アカウントでログインしてください</Text>
          </Animated.View>

          <View style={styles.actionArea}>
            <Pressable
              style={({ pressed }) => [styles.signInButton, pressed && styles.signInButtonPressed]}
              onPress={onSignIn}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInText}>Google でログイン</Text>
              )}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Google</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              onPress={onClose}
            >
              <Text style={styles.closeText}>あとで</Text>
            </Pressable>
            {error && (
              <Animated.Text entering={FadeIn.delay(80)} style={styles.errorText}>
                {error}
              </Animated.Text>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  card: {
    width: '100%',
    borderRadius: Radius['2xl'],
    padding: Spacing['2xl'],
    overflow: 'hidden',
    ...Shadows.xl,
    backgroundColor: Colors.card.background,
  },
  header: {
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    lineHeight: Typography.size.md * Typography.lineHeight.normal,
  },
  actionArea: {
    gap: Spacing.sm,
  },
  signInButton: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    backgroundColor: Colors.accent.coral,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  signInButtonPressed: {
    opacity: 0.9,
  },
  signInText: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  badge: {
    backgroundColor: Colors.card.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
  },
  badgeText: {
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  closeButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  closeButtonPressed: {
    opacity: 0.8,
  },
  closeText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  errorText: {
    marginTop: Spacing.sm,
    fontSize: Typography.size.sm,
    color: '#b00020',
    textAlign: 'center',
  },
});
