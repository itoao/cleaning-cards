/**
 * 片付けカード - Main Screen
 *
 * Complete user flow:
 * 1. Onboarding (first time only)
 * 2. Welcome screen
 * 3. Camera guide & photo capture
 * 4. Card session with reference images
 *
 * Aesthetic: "Soft Kinetic Paper"
 */

import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CameraGuide } from '@/components/camera-guide';
import { CardDeck } from '@/components/card-deck';
import { GoogleAuthPrompt } from '@/components/google-auth-prompt';
import { Onboarding } from '@/components/onboarding';
import { Colors, Gradients, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useGoogleAuth } from '@/hooks/use-google-auth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default background for welcome screen
const DEFAULT_BG = 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80';

type AppState = 'onboarding' | 'welcome' | 'camera' | 'session' | 'review';

export default function HomeScreen() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [roomImage, setRoomImage] = useState<string>(DEFAULT_BG);
  const [cards, setCards] = useState<{ instruction: string }[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [finalCheckMessage, setFinalCheckMessage] = useState<string | null>(null);
  const { user, busy, error, signIn } = useGoogleAuth();
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const isSignedIn = Boolean(user);

  const handleRequireLogin = useCallback(() => {
    setAuthPromptVisible(true);
  }, []);

  const handleAuthPromptClose = useCallback(() => {
    setAuthPromptVisible(false);
  }, []);

  const handleSignInPress = useCallback(async () => {
    try {
      await signIn();
      setAuthPromptVisible(false);
    } catch {
      // Error text is handled inside the hook
    }
  }, [signIn]);

  // Floating animation for decorative elements
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value * -8 }],
  }));

  const handleOnboardingComplete = useCallback(() => {
    setHasSeenOnboarding(true);
    setAppState('welcome');
  }, []);

  const startCamera = useCallback(
    (forReview = false) => {
      setFinalCheckMessage(null);
      setReviewMode(forReview);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setAppState('camera');
    },
    []
  );

  const handleStartCamera = useCallback(() => startCamera(false), [startCamera]);
  const handleStartReviewCamera = useCallback(() => startCamera(true), [startCamera]);

  const handleAnalysisComplete = useCallback((payload: { imageUri: string; cards: { instruction: string }[] }) => {
    const normalizedCards = payload.cards ?? [];
    setRoomImage(payload.imageUri || DEFAULT_BG);
    setCards(normalizedCards);

    if (reviewMode) {
      setReviewMode(false);
      if (normalizedCards.length === 0) {
        setFinalCheckMessage('LLMによる確認では完了と判断されました');
        setAppState('welcome');
        return;
      }
      setAppState('session');
      return;
    }

    setAppState('session');
  }, [reviewMode]);

  const handleBackToWelcome = useCallback(() => {
    setCards([]);
    setFinalCheckMessage(null);
    setReviewMode(false);
    setAppState('welcome');
  }, []);

  const handleSessionComplete = useCallback(() => {
    setReviewMode(true);
    setFinalCheckMessage(null);
    setAppState('review');
  }, []);

  // Render based on app state
  if (appState === 'onboarding' && !hasSeenOnboarding) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="dark" />
        <Onboarding onComplete={handleOnboardingComplete} />
      </GestureHandlerRootView>
    );
  }

  if (appState === 'camera') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="light" />
        <CameraGuide onAnalysisComplete={handleAnalysisComplete} onBack={handleBackToWelcome} />
      </GestureHandlerRootView>
    );
  }

  if (appState === 'review') {
    return (
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="dark" />
        <ImageBackground
          source={{ uri: roomImage }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={60} tint="light" style={styles.blur} />
          ) : (
            <View style={styles.androidBlur} />
          )}
        </ImageBackground>

        <LinearGradient
          colors={Gradients.atmosphere}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.reviewGradient}
        />

        <View style={styles.reviewPrompt}>
          <Animated.Text style={styles.reviewTitle}>おつかれさま</Animated.Text>
          <Animated.Text style={styles.reviewBody}>
            完了した後の部屋全体をもう一度撮影して、仕上がりを確認させてください
          </Animated.Text>
          <Pressable
            style={({ pressed }) => [
              styles.reviewButton,
              pressed && styles.reviewButtonPressed,
            ]}
            onPress={handleStartReviewCamera}
          >
            <Animated.Text style={styles.reviewButtonText}>撮影する</Animated.Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />

      {/* Background with blur */}
      <ImageBackground
        source={{ uri: roomImage }}
        style={[
          styles.backgroundImage,
          appState === 'welcome' && styles.backgroundImageHidden,
        ]}
        resizeMode="cover"
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={styles.blur} />
        ) : (
          <View style={styles.androidBlur} />
        )}
      </ImageBackground>

      {/* Decorative gradient overlay */}
      {appState !== 'welcome' && <View style={styles.gradientOverlay} />}

      {/* Welcome Screen */}
      {appState === 'welcome' && (
        <Animated.View
          entering={FadeIn.duration(600)}
          exiting={FadeOut.duration(400)}
          style={styles.welcomeContainer}
        >
          <LinearGradient
            colors={Gradients.atmosphere}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeGradient}
          />
          <Animated.View
            entering={SlideInDown.delay(200).duration(800).springify()}
            style={[styles.decorativeCard, floatingStyle]}
          >
            <View style={styles.miniCard}>
              <View style={styles.miniCardImage} />
              <View style={styles.miniCardLine} />
              <View style={[styles.miniCardLine, styles.miniCardLineShort]} />
            </View>
          </Animated.View>

      {/* Main content */}
          <Animated.View
            entering={SlideInUp.delay(300).duration(700).springify()}
            style={styles.welcomeContent}
          >

            <View style={styles.heroBody}>
              <Animated.View style={styles.heroBadge}>
              <LinearGradient
                colors={Gradients.badge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroBadgeGradient}
              >
                  <Animated.Text style={styles.heroBadgeText}>
                    片付けカードを、ひとつの儀式に
                  </Animated.Text>
                </LinearGradient>
              </Animated.View>

              <Animated.Text style={styles.heroTitle}>
                1枚のタスクカードが、部屋にやさしいリズムを生む。
              </Animated.Text>
              <Animated.Text style={styles.heroSubtitle}>
                ひとつずつスワイプするだけで、気持ちよく散らかった空間が整っていく。
              </Animated.Text>
              {finalCheckMessage && (
                <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.reviewMessage}>
                  <Animated.Text style={styles.reviewMessageText}>{finalCheckMessage}</Animated.Text>
                </Animated.View>
              )}
            </View>

            {/* Start button */}
            <Animated.View entering={FadeIn.delay(900).duration(500)}>
              <Pressable
                style={({ pressed }) => [
                  styles.startButton,
                  pressed && styles.startButtonPressed,
                ]}
                onPress={handleStartCamera}
              >
                <LinearGradient
                  colors={Gradients.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.startButtonGradient}
                  pointerEvents="none"
                />
                <View style={styles.startButtonContent}>
                  <View style={styles.buttonIcon}>
                    <Animated.Text style={styles.buttonIconText}>📷️</Animated.Text>
                  </View>
                  <Animated.Text style={styles.startButtonText}>部屋を撮影</Animated.Text>
                  <View style={styles.buttonArrow}>
                    <Animated.Text style={styles.buttonArrowText}>→</Animated.Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>

            {/* Account button */}
            <Animated.View entering={FadeIn.delay(1050).duration(400)} style={styles.accountBlock}>
              <Pressable
                style={({ pressed }) => [
                  styles.accountButton,
                  pressed && styles.accountButtonPressed,
                ]}
                onPress={handleRequireLogin}
              >
                <Animated.Text style={styles.accountButtonText}>
                  アカウント登録済み
                </Animated.Text>
              </Pressable>
              <Animated.Text style={styles.accountSubtitle}>
                {isSignedIn
                  ? `${user?.name ?? 'Google アカウント'} でログイン中`
                  : 'プレミアムの継続にはログインが必要です'}
              </Animated.Text>
            </Animated.View>

            {/* Free trial note */}
            <Animated.View
              entering={FadeIn.delay(1100).duration(400)}
              style={styles.trialNote}
            >
              <Animated.Text style={styles.trialNoteText}>
                無料で3枚まで体験できます
              </Animated.Text>
            </Animated.View>
          </Animated.View>

          {/* How it works hint */}
          <Animated.View
            entering={FadeIn.delay(1200).duration(400)}
            style={styles.howItWorks}
          >
            <View style={styles.stepIndicators}>
              <StepIndicator step={1} label="撮影" active />
              <View style={styles.stepLine} />
              <StepIndicator step={2} label="カード" />
              <View style={styles.stepLine} />
              <StepIndicator step={3} label="完了" />
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Card Session */}
      {appState === 'session' && (
        <Animated.View
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(300)}
          style={styles.sessionContainer}
        >
          <CardDeck
            roomImage={roomImage}
            cards={cards}
            onSessionComplete={handleSessionComplete}
            onBack={handleBackToWelcome}
            isSignedIn={isSignedIn}
            onRequireAuth={handleRequireLogin}
          />

          {/* Back button */}
          <Pressable
            style={styles.backButton}
            onPress={handleBackToWelcome}
          >
            <Animated.Text style={styles.backButtonText}>←</Animated.Text>
          </Pressable>
        </Animated.View>
      )}
      <GoogleAuthPrompt
        visible={authPromptVisible}
        busy={busy}
        error={error}
        onSignIn={handleSignInPress}
        onClose={handleAuthPromptClose}
      />
    </GestureHandlerRootView>
  );
}

function StepIndicator({ step, label, active = false }: { step: number; label: string; active?: boolean }) {
  return (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
        <Animated.Text style={[styles.stepNumber, active && styles.stepNumberActive]}>
          {step}
        </Animated.Text>
      </View>
      <Animated.Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
        {label}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImageHidden: {
    opacity: 0,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  androidBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 246, 241, 0.92)',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.cream,
    opacity: 0.7,
  },
  welcomeGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },

  // Welcome Screen
  welcomeContainer: {
    flex: 1,
    paddingTop: Platform.select({ ios: Spacing['3xl'], default: Spacing['2xl'] }),
    paddingHorizontal: Spacing['2xl'],
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing['4xl'],
  },
  decorativeCard: {
    position: 'absolute',
    top: Spacing['2xl'],
    right: Spacing['2xl'],
    transform: [{ rotate: '12deg' }],
    ...Shadows.md,
  },
  miniCard: {
    width: 76,
    height: 100,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    backgroundColor: Colors.card.background,
    borderWidth: 1,
    borderColor: Colors.card.border,
    justifyContent: 'center',
  },
  miniCardImage: {
    height: 40,
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  miniCardLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.creamDark,
    marginBottom: Spacing.xs,
  },
  miniCardLineShort: {
    width: '60%',
  },
  heroBody: {
    marginBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  heroBadgeGradient: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.sm,
  },
  heroBadgeText: {
    fontSize: Typography.size.xs,
    fontWeight: '600',
    color: Colors.text.primary,
    letterSpacing: Typography.letterSpacing.wide,
  },
  heroTitle: {
    fontSize: Typography.size['3xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: Typography.size['3xl'] * Typography.lineHeight.relaxed,
    letterSpacing: Typography.letterSpacing.tight,
  },
  heroSubtitle: {
    fontSize: Typography.size.md,
    color: Colors.text.secondary,
    lineHeight: Typography.size.md * Typography.lineHeight.relaxed,
  },
  reviewMessage: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.creamDark,
  },
  reviewMessageText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  startButton: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.md,
  },
  startButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  startButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    position: 'relative',
    zIndex: 1,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  buttonIconText: {
    fontSize: 20,
    color: Colors.text.inverse,
  },
  startButtonText: {
    fontSize: Typography.size.lg,
    fontWeight: '600',
    color: Colors.text.inverse,
    letterSpacing: Typography.letterSpacing.wide,
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
    fontSize: 16,
  },
  trialNote: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  trialNoteText: {
    fontSize: Typography.size.sm,
    color: Colors.text.tertiary,
    letterSpacing: Typography.letterSpacing.wide,
  },
  accountBlock: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  accountButton: {
    borderRadius: Radius['2xl'],
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
    backgroundColor: Colors.card.background,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    ...Shadows.sm,
  },
  accountButtonPressed: {
    opacity: 0.86,
  },
  accountButtonText: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  accountSubtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    letterSpacing: Typography.letterSpacing.wide,
  },
  reviewGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  reviewPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing['md'],
  },
  reviewTitle: {
    fontSize: Typography.size['3xl'],
    fontWeight: '700',
    color: Colors.text.primary,
  },
  reviewBody: {
    fontSize: Typography.size.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.size.lg * Typography.lineHeight.relaxed,
  },
  reviewButton: {
    marginTop: Spacing['2xl'],
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.lg,
    borderRadius: Radius['2xl'],
    backgroundColor: Colors.card.background,
    ...Shadows.md,
  },
  reviewButtonPressed: {
    opacity: 0.9,
  },
  reviewButtonText: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // How it works
  howItWorks: {
    position: 'absolute',
    bottom: Spacing['3xl'],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stepIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepIndicator: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.accent.coral,
  },
  stepNumber: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text.tertiary,
  },
  stepLabelActive: {
    color: Colors.text.primary,
    fontWeight: '500',
  },
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: Colors.creamDark,
    marginBottom: Spacing.lg,
  },

  // Session Screen
  sessionContainer: {
    flex: 1,
    paddingTop: Platform.select({ ios: Spacing['3xl'], default: Spacing['2xl'] }),
  },
  backButton: {
    position: 'absolute',
    top: Spacing['4xl'],
    left: Spacing.xl,
    width: 44,
    height: 44,
    backgroundColor: Colors.card.background,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.card.border,
  },
  backButtonText: {
    fontSize: 20,
    color: Colors.text.secondary,
  },
});
