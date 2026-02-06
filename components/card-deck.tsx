/**
 * Card Deck - Manages the stack of cleaning cards
 *
 * Shows the current card with a subtle preview of the next card behind it.
 * Handles transitions between cards and the completion state.
 * Shows room images for reference.
 */

import { Animation, Colors, Gradients, Radius, Spacing, Typography } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { Dimensions, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PaperConfetti } from './paper-confetti';
import { SwipeableCard } from './swipeable-card';
import { UpgradeSheet } from './upgrade-sheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FREE_CARD_LIMIT = 3;

interface CleaningCard {
  instruction: string;
}

const DEFAULT_EMPTY_MESSAGE = 'カードを生成できませんでした';

interface CardDeckProps {
  roomImage: string;
  cards: { instruction: string }[];
  onSessionComplete?: () => void;
  onBack?: () => void;
  isSignedIn: boolean;
  onRequireAuth: () => void;
}

export function CardDeck({
  roomImage,
  cards,
  onSessionComplete,
  onBack,
  isSignedIn,
  onRequireAuth,
}: CardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [completedCards, setCompletedCards] = useState<string[]>([]);
  const deckCards: CleaningCard[] = cards.map((card) => ({
    instruction: card.instruction,
  }));

  // Animation values
  const nextCardScale = useSharedValue(0.92);
  const nextCardOpacity = useSharedValue(0.6);
  const nextCardY = useSharedValue(20);

  const handleCardComplete = useCallback(() => {
    // Show celebration
    setShowConfetti(true);
    setCompletedCards((prev) => [...prev, deckCards[currentIndex]?.instruction ?? '']);

    const nextIndex = currentIndex + 1;

    // Check free limit
    if (!isPremium && deckCards.length > FREE_CARD_LIMIT && nextIndex === FREE_CARD_LIMIT) {
      setTimeout(() => {
        setShowUpgrade(true);
      }, 1000);
      return;
    }

    // Advance to next card
    setTimeout(() => {
      if (nextIndex < deckCards.length) {
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
  }, [currentIndex, deckCards, isPremium, onSessionComplete]);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  const handleUpgrade = useCallback(() => {
    if (!isSignedIn) {
      onRequireAuth();
      return;
    }

    setIsPremium(true);
    setShowUpgrade(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Continue to next card
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 300);
  }, [isSignedIn, onRequireAuth]);

  const handleUpgradeClose = useCallback(() => {
    setShowUpgrade(false);
    setIsComplete(true);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsComplete(false);
    setIsPremium(false);
    setCompletedCards([]);
  }, []);

  // Next card preview style
  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: nextCardScale.value },
      { translateY: nextCardY.value },
    ],
    opacity: nextCardOpacity.value,
  }));

  if (deckCards.length === 0) {
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
          <Animated.Text style={styles.emptyTitle}>{DEFAULT_EMPTY_MESSAGE}</Animated.Text>
          <Animated.Text style={styles.emptyBody}>
            撮影をやり直すか、別の角度でもう一度撮影してください。
          </Animated.Text>
          {onBack && (
            <Pressable style={styles.backToHomeButton} onPress={onBack}>
              <Animated.Text style={styles.backToHomeText}>ホームに戻る</Animated.Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    );
  }

  const totalCards = isPremium
    ? deckCards.length
    : Math.min(deckCards.length, FREE_CARD_LIMIT);
  const remainingCards = Math.max(totalCards - currentIndex, 1);
  const progress = Math.min((currentIndex + 1) / totalCards, 1);

  const getRemainingLabel = (remaining: number) => {
    const minPerCard = 1.2;
    const maxPerCard = 2.4;
    const minMinutes = Math.max(1, Math.round(remaining * minPerCard));
    const maxMinutes = Math.max(minMinutes + 1, Math.round(remaining * maxPerCard));
    return `のこり ${minMinutes}〜${maxMinutes}分`;
  };

  // Completion screen
  if (isComplete) {
    return (
      <View style={styles.container}>
        <Animated.View
          entering={FadeIn.duration(600)}
          style={styles.completeContainer}
        >
          <Animated.View
            entering={SlideInDown.delay(200).duration(500).springify()}
            style={styles.celebrationEmoji}
          >
            <Animated.Text style={styles.emojiText}>✨</Animated.Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(400).duration(400)}>
            <Animated.Text style={styles.completeTitle}>
              おつかれさま
            </Animated.Text>
            <Animated.Text style={styles.completeSubtitle}>
              {isPremium ? 'きょうの片付け完了' : 'きょうの無料分はここまで'}
            </Animated.Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(600).duration(400)}
            style={styles.statsContainer}
          >
            <View style={styles.statItem}>
              <Animated.Text style={styles.statNumber}>
                {completedCards.length}
              </Animated.Text>
              <Animated.Text style={styles.statLabel}>完了</Animated.Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(700).duration(400)} style={styles.resultCard}>
            <Animated.Text style={styles.resultTitle}>完了したこと</Animated.Text>
            <ScrollView
              style={styles.resultList}
              contentContainerStyle={styles.resultListContent}
              showsVerticalScrollIndicator={false}
            >
            {completedCards.map((card, index) => (
                <View key={`${card}-${index}`} style={styles.resultItem}>
                  <View style={styles.resultBullet} />
                  <View style={styles.resultTextGroup}>
                    <Animated.Text style={styles.resultText}>{card}</Animated.Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Animated.View>

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

  const currentCard = deckCards[currentIndex];
  const nextCard = deckCards[currentIndex + 1];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.atmosphere}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.atmosphereGradient}
      />
      <View style={styles.atmosphereVignette} />
      <View style={styles.atmosphereGlow} />
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
            <LinearGradient
              colors={Gradients.surface}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewCard}
            >
              <Animated.Text style={styles.previewText} numberOfLines={2}>
                {nextCard.instruction}
              </Animated.Text>
            </LinearGradient>
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
            roomImage={roomImage}
            onComplete={handleCardComplete}
            cardNumber={currentIndex}
            totalCards={totalCards}
            remainingLabel={getRemainingLabel(remainingCards)}
            progress={progress}
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
        authRequired={!isSignedIn}
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
  atmosphereGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  atmosphereVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.atmosphere.vignette,
    opacity: 0.5,
  },
  atmosphereGlow: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.4,
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: Colors.atmosphere.halo,
    opacity: 0.32,
    borderRadius: SCREEN_HEIGHT,
    top: SCREEN_HEIGHT * 0.05,
    left: -SCREEN_WIDTH * 0.3,
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
    paddingVertical: Spacing['2xl'],
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
    borderRadius: Radius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    borderWidth: 0.5,
    borderColor: Colors.card.innerStroke,
    shadowColor: Colors.atmosphere.lens,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 5,
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
  resultCard: {
    width: '100%',
    backgroundColor: Colors.card.background,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.card.border,
    marginBottom: Spacing['2xl'],
    maxHeight: SCREEN_HEIGHT * 0.35,
  },
  resultTitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.base,
    letterSpacing: Typography.letterSpacing.wide,
  },
  resultList: {
    flexGrow: 0,
  },
  resultListContent: {
    gap: Spacing.base,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  resultBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent.mint,
    marginTop: 6,
  },
  resultTextGroup: {
    flex: 1,
    gap: Spacing.xs,
  },
  resultText: {
    fontSize: Typography.size.base,
    color: Colors.text.primary,
    lineHeight: Typography.size.base * Typography.lineHeight.relaxed,
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
  emptyState: {
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Typography.size.xl,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  emptyBody: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.size.base * Typography.lineHeight.relaxed,
    marginBottom: Spacing.xl,
  },
});
