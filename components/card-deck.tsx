/**
 * Card Deck - Manages the stack of cleaning cards
 *
 * Shows the current card with a subtle preview of the next card behind it.
 * Handles transitions between cards and the completion state.
 * Now supports room images and crop areas for reference.
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Dimensions, Platform, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SwipeableCard } from './swipeable-card';
import { PaperConfetti } from './paper-confetti';
import { UpgradeSheet } from './upgrade-sheet';
import { Colors, Typography, Spacing, Radius, Animation } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FREE_CARD_LIMIT = 3;

type GridPosition = 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3';

interface CleaningCard {
  instruction: string;
  areaHint: string;
  gridPosition: GridPosition;
}

// Mock cleaning instructions (would come from AI in production)
const MOCK_CARDS: CleaningCard[] = [
  { instruction: '床に落ちている服を1枚だけ拾ってください', areaHint: '部屋の中央', gridPosition: 'B2' },
  { instruction: 'テーブルの上の紙だけ集めてください', areaHint: 'テーブル', gridPosition: 'A1' },
  { instruction: '見えているゴミを1つ捨ててください', areaHint: '床', gridPosition: 'C2' },
  { instruction: 'ソファの上のクッションを整えてください', areaHint: 'ソファ', gridPosition: 'B1' },
  { instruction: '窓際に置いてあるコップを台所へ', areaHint: '窓際', gridPosition: 'A3' },
];

interface CardDeckProps {
  roomImage: string;
  onSessionComplete?: () => void;
  onBack?: () => void;
}

export function CardDeck({ roomImage, onSessionComplete, onBack }: CardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // Animation values
  const nextCardScale = useSharedValue(0.92);
  const nextCardOpacity = useSharedValue(0.6);
  const nextCardY = useSharedValue(20);

  const handleCardComplete = useCallback(() => {
    // Show celebration
    setShowConfetti(true);

    const nextIndex = currentIndex + 1;

    // Check free limit
    if (!isPremium && nextIndex === FREE_CARD_LIMIT) {
      setTimeout(() => {
        setShowUpgrade(true);
      }, 1000);
      return;
    }

    // Advance to next card
    setTimeout(() => {
      if (nextIndex < MOCK_CARDS.length) {
        // Animate next card forward
        nextCardScale.value = withSequence(
          withTiming(0.92, { duration: 0 }),
          withSpring(1, Animation.spring.gentle)
        );
        nextCardOpacity.value = withSequence(
          withTiming(0.6, { duration: 0 }),
          withSpring(1, Animation.spring.gentle)
        );
        nextCardY.value = withSequence(
          withTiming(20, { duration: 0 }),
          withSpring(0, Animation.spring.gentle)
        );

        setCurrentIndex(nextIndex);
      } else {
        // All cards complete
        setIsComplete(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onSessionComplete?.();
      }
    }, 200);
  }, [currentIndex, isPremium, onSessionComplete]);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  const handleUpgrade = useCallback(() => {
    setIsPremium(true);
    setShowUpgrade(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Continue to next card
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 300);
  }, []);

  const handleUpgradeClose = useCallback(() => {
    setShowUpgrade(false);
    setIsComplete(true);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsComplete(false);
    setIsPremium(false);
  }, []);

  // Next card preview style
  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: nextCardScale.value },
      { translateY: nextCardY.value },
    ],
    opacity: nextCardOpacity.value,
  }));

  // Completion screen
  if (isComplete) {
    return (
      <View style={styles.container}>
        <Animated.View
          entering={FadeIn.duration(600)}
          style={styles.completeContainer}
        >
          {/* Celebration emoji with subtle animation */}
          <Animated.View
            entering={SlideInDown.delay(200).duration(500).springify()}
            style={styles.celebrationEmoji}
          >
            <Animated.Text style={styles.emojiText}>✨</Animated.Text>
          </Animated.View>

          {/* Completion message */}
          <Animated.View entering={FadeIn.delay(400).duration(400)}>
            <Animated.Text style={styles.completeTitle}>
              お疲れさまでした
            </Animated.Text>
            <Animated.Text style={styles.completeSubtitle}>
              {isPremium ? '今日の片付け、完了です' : '今日の無料分は終了です'}
            </Animated.Text>
          </Animated.View>

          {/* Stats */}
          <Animated.View
            entering={FadeIn.delay(600).duration(400)}
            style={styles.statsContainer}
          >
            <View style={styles.statItem}>
              <Animated.Text style={styles.statNumber}>
                {isPremium ? MOCK_CARDS.length : FREE_CARD_LIMIT}
              </Animated.Text>
              <Animated.Text style={styles.statLabel}>完了</Animated.Text>
            </View>
          </Animated.View>

          {/* Buttons */}
          <Animated.View entering={FadeIn.delay(800).duration(400)} style={styles.completeActions}>
            <Pressable
              style={({ pressed }) => [
                styles.restartButton,
                pressed && styles.restartButtonPressed,
              ]}
              onPress={handleRestart}
            >
              <Animated.Text style={styles.restartButtonText}>
                もう一度
              </Animated.Text>
            </Pressable>

            {onBack && (
              <Pressable
                style={styles.backToHomeButton}
                onPress={onBack}
              >
                <Animated.Text style={styles.backToHomeText}>
                  ホームに戻る
                </Animated.Text>
              </Pressable>
            )}
          </Animated.View>
        </Animated.View>

        {/* Final confetti burst */}
        <PaperConfetti
          visible={true}
          pieceCount={60}
          originY={SCREEN_HEIGHT * 0.3}
        />
      </View>
    );
  }

  const currentCard = MOCK_CARDS[currentIndex];
  const nextCard = MOCK_CARDS[currentIndex + 1];

  return (
    <View style={styles.container}>
      {/* Premium badge */}
      {isPremium && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.premiumBadge}
        >
          <Animated.Text style={styles.premiumBadgeText}>Premium</Animated.Text>
        </Animated.View>
      )}

      {/* Card stack */}
      <View style={styles.cardStack}>
        {/* Next card preview (behind current) */}
        {nextCard && (
          <Animated.View style={[styles.nextCardPreview, nextCardStyle]}>
            <View style={styles.previewCard}>
              <Animated.Text style={styles.previewText} numberOfLines={2}>
                {nextCard.instruction}
              </Animated.Text>
            </View>
          </Animated.View>
        )}

        {/* Current card */}
        <Animated.View
          key={currentIndex}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.currentCard}
        >
          <SwipeableCard
            instruction={currentCard.instruction}
            areaHint={currentCard.areaHint}
            roomImage={roomImage}
            cropArea={{ gridPosition: currentCard.gridPosition }}
            onComplete={handleCardComplete}
            cardNumber={currentIndex}
            totalCards={isPremium ? MOCK_CARDS.length : FREE_CARD_LIMIT}
          />
        </Animated.View>
      </View>

      {/* Confetti */}
      <PaperConfetti
        visible={showConfetti}
        onComplete={handleConfettiComplete}
        pieceCount={35}
        originY={SCREEN_HEIGHT * 0.4}
      />

      {/* Upgrade sheet */}
      <UpgradeSheet
        visible={showUpgrade}
        onUpgrade={handleUpgrade}
        onClose={handleUpgradeClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: Colors.accent.coralLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    zIndex: 10,
  },
  premiumBadgeText: {
    fontSize: Typography.size.xs,
    fontWeight: '600',
    color: Colors.text.primary,
    letterSpacing: Typography.letterSpacing.wide,
  },
  cardStack: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCard: {
    zIndex: 2,
  },
  nextCardPreview: {
    position: 'absolute',
    zIndex: 1,
  },
  previewCard: {
    width: SCREEN_WIDTH - Spacing['2xl'] * 2,
    height: 480,
    backgroundColor: Colors.creamDark,
    borderRadius: Radius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    borderWidth: 1,
    borderColor: Colors.card.border,
  },
  previewText: {
    fontSize: Typography.size.lg,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: Typography.size.lg * Typography.lineHeight.relaxed,
  },
  completeContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  celebrationEmoji: {
    marginBottom: Spacing['2xl'],
  },
  emojiText: {
    fontSize: 72,
  },
  completeTitle: {
    fontSize: Typography.size['3xl'],
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: Typography.letterSpacing.tight,
  },
  completeSubtitle: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing['2xl'],
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: Colors.card.background,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.card.border,
  },
  statNumber: {
    fontSize: Typography.size['2xl'],
    fontWeight: '700',
    color: Colors.accent.coral,
  },
  statLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  completeActions: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  restartButton: {
    backgroundColor: Colors.text.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    borderRadius: Radius.lg,
  },
  restartButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  restartButtonText: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.inverse,
    letterSpacing: Typography.letterSpacing.wide,
  },
  backToHomeButton: {
    paddingVertical: Spacing.md,
  },
  backToHomeText: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
  },
});
