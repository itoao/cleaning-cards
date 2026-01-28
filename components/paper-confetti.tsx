/**
 * Paper Confetti - Celebration animation
 *
 * Delicate paper pieces that burst outward and flutter down
 * with realistic paper physics.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = Colors.confetti;
const DEFAULT_PIECE_COUNT = 50;

interface ConfettiPieceProps {
  index: number;
  originX: number;
  originY: number;
  onFinish?: () => void;
  totalPieces?: number;
}

function ConfettiPiece({ index, originX, originY, onFinish, totalPieces = DEFAULT_PIECE_COUNT }: ConfettiPieceProps) {
  const jitterX = (Math.random() - 0.5) * 10;
  const jitterY = (Math.random() - 0.5) * 10;
  // Position
  const translateX = useSharedValue(originX + jitterX);
  const translateY = useSharedValue(originY + jitterY);

  // Rotation
  const rotate = useSharedValue(0);
  const rotateX = useSharedValue(0);

  // Scale & opacity
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Randomize properties
  const angle = (index / totalPieces) * Math.PI * 2 + Math.random() * 0.5;
  const velocity = 120 + Math.random() * 180;
  const size = 8 + Math.random() * 8;
  const isWide = Math.random() > 0.5;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const delay = Math.random() * 200;

  // Target positions
  const targetX = originX + Math.cos(angle) * velocity + jitterX;
  const targetY = originY + Math.sin(angle) * velocity - 50 + jitterY;
  const finalY = SCREEN_HEIGHT + 100;

  // Horizontal drift
  const drift = (Math.random() - 0.5) * 150;

  useEffect(() => {
    // Scale in
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 8, stiffness: 200 })
    );

    // Burst outward phase
    translateX.value = withDelay(
      delay,
      withSequence(
        withTiming(targetX, {
          duration: 400,
          easing: Easing.out(Easing.cubic)
        }),
        withTiming(targetX + drift, {
          duration: 1500,
          easing: Easing.inOut(Easing.sin)
        })
      )
    );

    translateY.value = withDelay(
      delay,
      withSequence(
        // Burst up/out
        withTiming(targetY, {
          duration: 400,
          easing: Easing.out(Easing.cubic)
        }),
        // Fall down
        withTiming(finalY, {
          duration: 1500 + Math.random() * 500,
          easing: Easing.in(Easing.quad)
        })
      )
    );


    // Continuous rotation
    rotate.value = withDelay(
      delay,
      withTiming(360 * (Math.random() > 0.5 ? 3 : -3), {
        duration: 2000,
        easing: Easing.linear
      })
    );

    // 3D flip for paper effect
    rotateX.value = withDelay(
      delay,
      withSequence(
        withTiming(180, { duration: 300 }),
        withTiming(0, { duration: 300 }),
        withTiming(180, { duration: 300 }),
        withTiming(0, { duration: 300 }),
        withTiming(180, { duration: 300 }),
        withTiming(0, { duration: 300 })
      )
    );

    // Fade out at end
    opacity.value = withDelay(
      delay + 1200,
      withTiming(0, { duration: 600 }, (finished) => {
        if (finished && onFinish) {
          runOnJS(onFinish)();
        }
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { rotateX: `${rotateX.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        animatedStyle,
        {
          width: isWide ? size * 1.5 : size,
          height: isWide ? size : size * 1.5,
          backgroundColor: color,
          borderRadius: 2,
        },
      ]}
    />
  );
}

interface PaperConfettiProps {
  visible: boolean;
  onComplete?: () => void;
  originX?: number;
  originY?: number;
  pieceCount?: number;
}

export function PaperConfetti({
  visible,
  onComplete,
  originX = SCREEN_WIDTH / 2,
  originY = SCREEN_HEIGHT / 2,
  pieceCount = DEFAULT_PIECE_COUNT,
}: PaperConfettiProps) {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: pieceCount }).map((_, index) => (
        <ConfettiPiece
          key={index}
          index={index}
          originX={originX}
          originY={originY}
          onFinish={index === pieceCount - 1 ? onComplete : undefined}
          totalPieces={pieceCount}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  piece: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
