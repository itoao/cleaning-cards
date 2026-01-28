/**
 * Swipeable Card - The core interaction element with reference image
 *
 * A physical-feeling card that responds to touch with realistic
 * spring physics. Now includes a cropped reference image showing
 * the target area for the cleaning instruction.
 */

import React, { useCallback } from 'react';
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
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius, Shadows, Animation } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing['2xl'] * 2;
const CARD_HEIGHT = 480;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

// 3x3 グリッド位置の定義
type GridPosition = 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3';

interface CropArea {
  gridPosition: GridPosition;
  // または正規化座標 (0-1)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface SwipeableCardProps {
  instruction: string;
  areaHint?: string;
  roomImage: string;
  cropArea?: CropArea;
  onComplete: () => void;
  cardNumber: number;
  totalCards: number;
}

// グリッド位置から正規化座標を取得
function getGridCoordinates(position: GridPosition): { x: number; y: number; width: number; height: number } {
  const col = position.charCodeAt(0) - 65; // A=0, B=1, C=2
  const row = parseInt(position[1]) - 1; // 1=0, 2=1, 3=2

  return {
    x: col / 3,
    y: row / 3,
    width: 1 / 3,
    height: 1 / 3,
  };
}

export function SwipeableCard({
  instruction,
  areaHint,
  roomImage,
  cropArea,
  onComplete,
  cardNumber,
  totalCards,
}: SwipeableCardProps) {
  // Gesture state
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const completionProgress = useSharedValue(0);

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

  // クロップ座標を計算
  const cropCoords = cropArea?.gridPosition
    ? getGridCoordinates(cropArea.gridPosition)
    : cropArea?.x !== undefined
      ? { x: cropArea.x, y: cropArea.y!, width: cropArea.width!, height: cropArea.height! }
      : null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Completion glow overlay */}
        <Animated.View style={[styles.glow, glowStyle]} />

        {/* Reference image section */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: roomImage }}
              style={styles.roomImage}
              resizeMode="cover"
            />

            {/* グリッドオーバーレイ */}
            <View style={styles.gridOverlay}>
              {/* 縦線 */}
              <View style={[styles.gridLine, styles.gridLineV, { left: '33.33%' }]} />
              <View style={[styles.gridLine, styles.gridLineV, { left: '66.66%' }]} />
              {/* 横線 */}
              <View style={[styles.gridLine, styles.gridLineH, { top: '33.33%' }]} />
              <View style={[styles.gridLine, styles.gridLineH, { top: '66.66%' }]} />
            </View>

            {/* ハイライト領域 */}
            {cropCoords && (
              <Animated.View
                entering={FadeIn.delay(300).duration(400)}
                style={[
                  styles.highlightArea,
                  {
                    left: `${cropCoords.x * 100}%`,
                    top: `${cropCoords.y * 100}%`,
                    width: `${cropCoords.width * 100}%`,
                    height: `${cropCoords.height * 100}%`,
                  },
                ]}
              >
                {/* パルスアニメーション用のボーダー */}
                <View style={styles.highlightBorder} />
                {/* ポインター */}
                <View style={styles.pointer}>
                  <View style={styles.pointerDot} />
                </View>
              </Animated.View>
            )}

            {/* ダークオーバーレイ（ハイライト以外） */}
            {cropCoords && (
              <View style={styles.darkOverlay}>
                {/* 上 */}
                <View style={[styles.darkArea, {
                  top: 0, left: 0, right: 0,
                  height: `${cropCoords.y * 100}%`
                }]} />
                {/* 下 */}
                <View style={[styles.darkArea, {
                  bottom: 0, left: 0, right: 0,
                  height: `${(1 - cropCoords.y - cropCoords.height) * 100}%`
                }]} />
                {/* 左 */}
                <View style={[styles.darkArea, {
                  top: `${cropCoords.y * 100}%`,
                  left: 0,
                  width: `${cropCoords.x * 100}%`,
                  height: `${cropCoords.height * 100}%`
                }]} />
                {/* 右 */}
                <View style={[styles.darkArea, {
                  top: `${cropCoords.y * 100}%`,
                  right: 0,
                  width: `${(1 - cropCoords.x - cropCoords.width) * 100}%`,
                  height: `${cropCoords.height * 100}%`
                }]} />
              </View>
            )}
          </View>

          {/* Area label */}
          {areaHint && (
            <View style={styles.areaLabel}>
              <Animated.Text style={styles.areaLabelText}>{areaHint}</Animated.Text>
              {cropArea?.gridPosition && (
                <View style={styles.gridBadge}>
                  <Animated.Text style={styles.gridBadgeText}>{cropArea.gridPosition}</Animated.Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Completion checkmark */}
        <Animated.View style={[styles.completionIndicator, completionIndicatorStyle]}>
          <View style={styles.checkCircle}>
            <Animated.Text style={styles.checkmark}>✓</Animated.Text>
          </View>
        </Animated.View>

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
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius['2xl'],
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
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  gridLineV: {
    width: 1,
    top: 0,
    bottom: 0,
  },
  gridLineH: {
    height: 1,
    left: 0,
    right: 0,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  darkArea: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  highlightArea: {
    position: 'absolute',
    zIndex: 10,
  },
  highlightBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: Colors.accent.coral,
    borderRadius: 4,
  },
  pointer: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent.coral,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  pointerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  areaLabel: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  areaLabelText: {
    fontSize: Typography.size.sm,
    color: '#FFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gridBadge: {
    backgroundColor: Colors.accent.coral,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  gridBadgeText: {
    fontSize: Typography.size.xs,
    color: '#FFF',
    fontWeight: '700',
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
