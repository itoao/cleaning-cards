/**
 * Onboarding - 初回起動時の説明画面
 *
 * 説明は最小限、体験で理解させる方針
 * 3ステップでスワイプ体験を予告
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Dimensions, Pressable, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingStep {
  icon: string;
  title: string;
  description: string;
  hint?: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: '📷',
    title: '部屋を撮影',
    description: '片付けたい場所を\n1枚撮るだけ',
    hint: '散らかっていてもOK',
  },
  {
    icon: '🃏',
    title: 'カードが届く',
    description: '今やるべきことを\n1つだけ提案',
    hint: '考えなくていい',
  },
  {
    icon: '👆',
    title: 'スワイプで完了',
    description: '終わったら横にスワイプ\n次のカードへ',
    hint: '1〜2分で終わるものだけ',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Floating animation for icon
  const floatAnim = useSharedValue(0);

  React.useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value * -12 }],
  }));

  const handleNext = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handleSkip = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onComplete();
  }, [onComplete]);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.atmosphere}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientLayer}
      />

      {/* Skip button */}
      {!isLastStep && (
        <Animated.View entering={FadeIn.delay(500)} style={styles.skipContainer}>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Animated.Text style={styles.skipText}>スキップ</Animated.Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <Animated.View
          key={`icon-${currentStep}`}
          entering={SlideInRight.duration(400).springify()}
          exiting={SlideOutLeft.duration(300)}
          style={[styles.iconContainer, floatingStyle]}
        >
          <View style={styles.iconBackground}>
            <Animated.Text style={styles.icon}>{step.icon}</Animated.Text>
          </View>
        </Animated.View>

        {/* Step indicator */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.stepIndicator}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.stepDot,
                index === currentStep && styles.stepDotActive,
                index < currentStep && styles.stepDotCompleted,
              ]}
            />
          ))}
        </Animated.View>

        {/* Text content */}
        <Animated.View
          key={`text-${currentStep}`}
          entering={SlideInRight.delay(100).duration(400).springify()}
          exiting={SlideOutLeft.duration(300)}
          style={styles.textContent}
        >
          <Animated.Text style={styles.title}>{step.title}</Animated.Text>
          <Animated.Text style={styles.description}>{step.description}</Animated.Text>
          {step.hint && (
            <View style={styles.hintContainer}>
              <Animated.Text style={styles.hint}>{step.hint}</Animated.Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Action button */}
      <Animated.View entering={FadeIn.delay(400)} style={styles.actionContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={handleNext}
        >
          <LinearGradient
            colors={Gradients.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          />
          <View style={styles.actionContent}>
            <Animated.Text style={styles.actionButtonText}>
              {isLastStep ? 'はじめる' : '次へ'}
            </Animated.Text>
            <View style={styles.buttonArrow}>
              <Animated.Text style={styles.buttonArrowText}>
                {isLastStep ? '✨' : '→'}
              </Animated.Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundDecor: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    backgroundColor: Colors.accent.coralLight,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    backgroundColor: Colors.accent.mintLight,
    bottom: 100,
    left: -80,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    backgroundColor: Colors.creamDark,
    bottom: -50,
    right: 50,
  },
  skipContainer: {
    position: 'absolute',
    top: Spacing['4xl'],
    right: Spacing.xl,
    zIndex: 10,
  },
  skipButton: {
    padding: Spacing.md,
  },
  skipText: {
    fontSize: Typography.size.sm,
    color: Colors.text.tertiary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  iconContainer: {
    marginBottom: Spacing['2xl'],
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.card.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: Colors.card.border,
  },
  icon: {
    fontSize: 56,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing['2xl'],
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.creamDark,
  },
  stepDotActive: {
    width: 24,
    backgroundColor: Colors.accent.coral,
  },
  stepDotCompleted: {
    backgroundColor: Colors.accent.mint,
  },
  textContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.size.lg * Typography.lineHeight.relaxed,
    marginBottom: Spacing.lg,
  },
  hintContainer: {
    backgroundColor: Colors.accent.mintLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  hint: {
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  actionContainer: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['4xl'],
  },
  actionButton: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadows.md,
  },
  actionGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['3xl'],
  },
  actionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: Typography.size.lg,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  buttonArrow: {
    marginLeft: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonArrowText: {
    color: Colors.text.inverse,
    fontSize: 14,
  },
});
