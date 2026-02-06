/**
 * Upgrade Sheet - Tasteful paywall for premium conversion
 *
 * Appears after the 3rd free card with a gentle, non-aggressive tone.
 * Uses the language "今日はここまで。続けますか？" as specified.
 * Avoids words like "課金" or "購入".
 */

import React from 'react';
import { StyleSheet, View, Modal, Pressable, Platform, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UpgradeSheetProps {
  visible: boolean;
  onUpgrade: () => void;
  onClose: () => void;
  authHint?: string;
  authRequired?: boolean;
}

interface BenefitItemProps {
  text: string;
  delay: number;
}

function BenefitItem({ text, delay }: BenefitItemProps) {
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(300)}
      style={styles.benefitItem}
    >
      <View style={styles.benefitCheck}>
        <Animated.Text style={styles.benefitCheckText}>✓</Animated.Text>
      </View>
      <Animated.Text style={styles.benefitText}>{text}</Animated.Text>
    </Animated.View>
  );
}

export function UpgradeSheet({ visible, onUpgrade, onClose, authHint, authRequired }: UpgradeSheetProps) {
  const handleUpgrade = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onUpgrade();
  };

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={SlideInDown.duration(500).springify().damping(18)}
          style={styles.sheet}
        >
          <LinearGradient
            colors={Gradients.surface}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sheetGradient}
          />
          {/* Decorative top accent */}
          <View style={styles.topAccent}>
            <View style={styles.accentLine} />
          </View>

          {/* Header */}
          <Animated.View
            entering={FadeIn.delay(100).duration(400)}
            style={styles.header}
          >
            <Animated.Text style={styles.emoji}>✨</Animated.Text>
            <Animated.Text style={styles.title}>今日はここまで</Animated.Text>
            <Animated.Text style={styles.subtitle}>続けますか？</Animated.Text>
          </Animated.View>

          {/* Benefits */}
          <View style={styles.benefits}>
            <BenefitItem text="カード無制限" delay={200} />
            <BenefitItem text="写真アップロード無制限" delay={250} />
            <BenefitItem text="完了履歴" delay={300} />
            <BenefitItem text="AIによるカード最適化" delay={350} />
          </View>

          {/* Pricing */}
          <Animated.View
            entering={FadeIn.delay(400).duration(300)}
            style={styles.pricing}
          >
            <Animated.Text style={styles.price}>¥500</Animated.Text>
            <Animated.Text style={styles.period}>/月</Animated.Text>
          </Animated.View>

          {/* Subtle note */}
          <Animated.View entering={FadeIn.delay(450).duration(300)}>
            <Animated.Text style={styles.note}>
              いつでもキャンセルできます
            </Animated.Text>
            {authRequired && (
              <Animated.Text entering={FadeIn.delay(480)} style={styles.authHint}>
                {authHint ?? 'Googleログインしてから続けてください'}
              </Animated.Text>
            )}
          </Animated.View>

          {/* Actions */}
          <Animated.View
            entering={FadeIn.delay(500).duration(300)}
            style={styles.actions}
          >
            <Pressable
              style={({ pressed }) => [
                styles.upgradeButton,
                pressed && styles.upgradeButtonPressed,
              ]}
              onPress={handleUpgrade}
            >
              <LinearGradient
                colors={Gradients.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeGradient}
              />
              <Animated.Text style={styles.upgradeButtonText}>
                続ける
              </Animated.Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
              onPress={handleClose}
            >
              <Animated.Text style={styles.closeButtonText}>
                また今度
              </Animated.Text>
            </Pressable>
          </Animated.View>

          {/* Bottom decorative element */}
          <View style={styles.bottomDecor}>
            <View style={styles.decorDot} />
            <View style={[styles.decorDot, styles.decorDotActive]} />
            <View style={styles.decorDot} />
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card.background,
    borderTopLeftRadius: Radius['3xl'],
    borderTopRightRadius: Radius['3xl'],
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
    // Shadow
    ...Shadows.xl,
    overflow: 'hidden',
  },
  sheetGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  topAccent: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  accentLine: {
    width: 40,
    height: 4,
    backgroundColor: Colors.creamDark,
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
  },
  benefits: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  benefitCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent.mintLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  benefitCheckText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  benefitText: {
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    flex: 1,
  },
  pricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  price: {
    fontSize: Typography.size['4xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: Typography.letterSpacing.tight,
  },
  period: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
  },
  note: {
    fontSize: Typography.size.sm,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  authHint: {
    fontSize: Typography.size.sm,
    color: Colors.accent.coralDark,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  actions: {
    gap: Spacing.md,
  },
  upgradeButton: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  upgradeGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  upgradeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  upgradeButtonText: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.inverse,
    letterSpacing: Typography.letterSpacing.wide,
  },
  closeButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  closeButtonText: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
  },
  bottomDecor: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  decorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.creamDark,
  },
  decorDotActive: {
    backgroundColor: Colors.accent.coral,
  },
});
