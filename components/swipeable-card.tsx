/**
 * Swipeable Card - The core interaction element with reference image
 *
 * A physical-feeling card that responds to touch with realistic
 * spring physics.
 */

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform, Image } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Gradients, Typography, Spacing, Radius, Shadows, Animation } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing['2xl'] * 2;
const CARD_HEIGHT = 480;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeableCardProps {
  instruction: string;
  roomImage: string;
  onComplete: () => void;
  cardNumber: number;
  totalCards: number;
  remainingLabel: string;
  progress: number;
}

export function SwipeableCard({
  instruction,
  roomImage,
  onComplete,
  cardNumber,
  totalCards,
  remainingLabel,
  progress,
}: SwipeableCardProps) {
  // Gesture state
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const completionProgress = useSharedValue(0);
  const progressValue = useSharedValue(0);

  useEffect(() => {
    progressValue.value = withTiming(progress, { duration: 500 });
  }, [progress, progressValue]);

  // Haptic feedback functions
  const triggerLightHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const triggerSuccessHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const handleComplete = useCallback(() => {
    triggerSuccessHaptic();
    onComplete();
  }, [onComplete, triggerSuccessHaptic]);

  // Pan gesture for swiping
  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.02, Animation.spring.gentle);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.4;

      rotateZ.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-12, 0, 12],
        Extrapolation.CLAMP
      );

      const distance = Math.abs(event.translationX);
      completionProgress.value = Math.min(distance / SWIPE_THRESHOLD, 1);

      if (distance > SWIPE_THRESHOLD * 0.9 && distance < SWIPE_THRESHOLD * 1.1) {
        runOnJS(triggerLightHaptic)();
      }
    })
    .onEnd((event) => {
      const shouldComplete = Math.abs(event.translationX) > SWIPE_THRESHOLD;

      if (shouldComplete) {
        const direction = event.translationX > 0 ? 1 : -1;
        const exitX = direction * SCREEN_WIDTH * 1.5;
        const exitY = event.translationY * 0.5;
        const exitRotation = direction * 25;

        translateX.value = withTiming(exitX, { duration: 350 });
        translateY.value = withTiming(exitY, { duration: 350 });
        rotateZ.value = withTiming(exitRotation, { duration: 350 });
        scale.value = withTiming(0.9, { duration: 350 }, () => {
          runOnJS(handleComplete)();
        });
      } else {
        translateX.value = withSpring(0, Animation.spring.gentle);
        translateY.value = withSpring(0, Animation.spring.gentle);
        rotateZ.value = withSpring(0, Animation.spring.gentle);
        scale.value = withSpring(1, Animation.spring.gentle);
        completionProgress.value = withSpring(0, Animation.spring.snappy);
      }
    });

  // Animated styles
  const cardStyle = useAnimatedStyle(() => {
    const shadowScale = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [1, 1.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotateZ.value}deg` },
        { scale: scale.value },
      ],
      shadowRadius: 24 * shadowScale,
      shadowOpacity: interpolate(
        Math.abs(translateX.value),
        [0, SWIPE_THRESHOLD],
        [0.12, 0.25],
        Extrapolation.CLAMP
      ),
    };
  });

  const completionIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      completionProgress.value,
      [0, 0.5, 1],
      [0, 0.3, 1],
      Extrapolation.CLAMP
    );

    const indicatorScale = interpolate(
      completionProgress.value,
      [0, 1],
      [0.8, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale: indicatorScale }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      completionProgress.value,
      [0, 0.7, 1],
      [0, 0, 0.15],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      backgroundColor: Colors.accent.mint,
    };
  });

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      completionProgress.value,
      [0, 0.7, 1],
      [0, 1, 1],
      Extrapolation.CLAMP
    ),
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(progressValue.value, 1)) * 100}%`,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        <LinearGradient
          colors={Gradients.surface}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.cardGradient}
        />
        <View style={styles.innerStroke} pointerEvents="none" />
        {/* Completion glow overlay */}
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={[styles.halo, haloStyle]} />

        {/* Reference image section */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: roomImage }}
              style={styles.roomImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Completion checkmark */}
        <Animated.View style={[styles.completionIndicator, completionIndicatorStyle]}>
          <View style={styles.checkCircle}>
            <Animated.Text style={styles.checkmark}>✓</Animated.Text>
          </View>
        </Animated.View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <View style={styles.remainingChip}>
              <Animated.Text style={styles.remainingText}>{remainingLabel}</Animated.Text>
            </View>
            <Animated.Text style={styles.progressCount}>
              {cardNumber + 1}/{totalCards}
            </Animated.Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressFillStyle]}>
              <LinearGradient
                colors={[Colors.accent.coralDark, Colors.accent.coralLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressFillGradient}
              />
            </Animated.View>
          </View>
        </View>

        {/* Instruction section */}
        <View style={styles.instructionSection}>
          <Animated.Text style={styles.instruction}>{instruction}</Animated.Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.progressDots}>
            {Array.from({ length: totalCards }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < cardNumber && styles.dotCompleted,
                  i === cardNumber && styles.dotCurrent,
                ]}
              />
            ))}
          </View>
          <Animated.Text style={styles.swipeHintText}>スワイプで完了</Animated.Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: Colors.card.background,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.card.border,
    overflow: 'hidden',
    shadowColor: Colors.atmosphere.lens,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 34,
    elevation: 12,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius['2xl'],
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius['2xl'],
    borderWidth: 0.5,
    borderColor: Colors.card.innerStroke,
    opacity: 0.9,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius['2xl'],
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius['2xl'],
    backgroundColor: Colors.atmosphere.lens,
    shadowColor: Colors.atmosphere.lens,
    shadowRadius: 60,
    shadowOpacity: 0.8,
  },
  imageSection: {
    height: 200,
    position: 'relative',
  },
  imageContainer: {
    flex: 1,
    borderTopLeftRadius: Radius['2xl'] - 1,
    borderTopRightRadius: Radius['2xl'] - 1,
    overflow: 'hidden',
    position: 'relative',
  },
  roomImage: {
    ...StyleSheet.absoluteFillObject,
  },
  completionIndicator: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 20,
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent.mint,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    ...Shadows.md,
  },
  checkmark: {
    fontSize: 22,
    color: '#FFF',
    fontWeight: '700',
  },
  instructionSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  instruction: {
    fontSize: Typography.size.xl,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: Typography.size.xl * Typography.lineHeight.relaxed,
  },
  progressSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingChip: {
    backgroundColor: Colors.creamDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  remainingText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    letterSpacing: Typography.letterSpacing.wide,
  },
  progressCount: {
    fontSize: Typography.size.xs,
    color: Colors.text.tertiary,
    letterSpacing: Typography.letterSpacing.wider,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.creamDark,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFillGradient: {
    flex: 1,
    borderRadius: 999,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  progressDots: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.creamDark,
  },
  dotCompleted: {
    backgroundColor: Colors.accent.mint,
  },
  dotCurrent: {
    backgroundColor: Colors.accent.coral,
    width: 24,
  },
  swipeHintText: {
    fontSize: Typography.size.xs,
    color: Colors.text.tertiary,
    letterSpacing: Typography.letterSpacing.wider,
  },
});
