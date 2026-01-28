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

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ImageBackground,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { Onboarding } from '@/components/onboarding';
import { CameraGuide } from '@/components/camera-guide';
import { CardDeck } from '@/components/card-deck';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Default background for welcome screen
const DEFAULT_BG = 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80';

type AppState = 'onboarding' | 'welcome' | 'camera' | 'session';

export default function HomeScreen() {
  // For demo: skip onboarding after first view
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [roomImage, setRoomImage] = useState<string>(DEFAULT_BG);

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

  const handleStartCamera = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setAppState('camera');
  }, []);

  const handlePhotoTaken = useCallback((imageUri: string) => {
    setRoomImage(imageUri);
    setAppState('session');
  }, []);

  const handleBackToWelcome = useCallback(() => {
    setAppState('welcome');
  }, []);

  const handleSessionComplete = useCallback(() => {
    // Session complete - could show summary or return to welcome
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
        <CameraGuide onPhotoTaken={handlePhotoTaken} onBack={handleBackToWelcome} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />

      {/* Background with blur */}
      <ImageBackground
        source={{ uri: roomImage }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={styles.blur} />
        ) : (
          <View style={styles.androidBlur} />
        )}
      </ImageBackground>

      {/* Decorative gradient overlay */}
      <View style={styles.gradientOverlay} />

      {/* Welcome Screen */}
      {appState === 'welcome' && (
        <Animated.View
          entering={FadeIn.duration(600)}
          exiting={FadeOut.duration(400)}
          style={styles.welcomeContainer}
        >
          {/* Floating decorative card */}
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
            {/* App title */}
            <View style={styles.titleContainer}>
              <Animated.Text style={styles.appTitle}>片付けカード</Animated.Text>
              <View style={styles.titleAccent} />
            </View>

            {/* Tagline */}
            <Animated.View entering={FadeIn.delay(500).duration(500)}>
              <Animated.Text style={styles.tagline}>
                スワイプしたら{'\n'}片付け完了
              </Animated.Text>
            </Animated.View>

            {/* Description */}
            <Animated.View
              entering={FadeIn.delay(700).duration(500)}
              style={styles.descriptionContainer}
            >
              <Animated.Text style={styles.description}>
                考えなくていい。{'\n'}
                1つずつ、カードの指示に従うだけ。
              </Animated.Text>
            </Animated.View>

            {/* Start button */}
            <Animated.View entering={FadeIn.delay(900).duration(500)}>
              <Pressable
                style={({ pressed }) => [
                  styles.startButton,
                  pressed && styles.startButtonPressed,
                ]}
                onPress={handleStartCamera}
              >
                <View style={styles.buttonIcon}>
                  <Animated.Text style={styles.buttonIconText}>📷</Animated.Text>
                </View>
                <Animated.Text style={styles.startButtonText}>部屋を撮影</Animated.Text>
                <View style={styles.buttonArrow}>
                  <Animated.Text style={styles.buttonArrowText}>→</Animated.Text>
                </View>
              </Pressable>
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
            onSessionComplete={handleSessionComplete}
            onBack={handleBackToWelcome}
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

  // Welcome Screen
  welcomeContainer: {
    flex: 1,
    paddingTop: SCREEN_HEIGHT * 0.1,
    paddingHorizontal: Spacing['2xl'],
  },
  decorativeCard: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.06,
    right: Spacing['2xl'],
    transform: [{ rotate: '12deg' }],
  },
  miniCard: {
    width: 72,
    height: 96,
    backgroundColor: Colors.card.background,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.card.border,
  },
  miniCardImage: {
    height: 36,
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  miniCardLine: {
    height: 6,
    backgroundColor: Colors.creamDark,
    borderRadius: 3,
    marginBottom: Spacing.xs,
  },
  miniCardLineShort: {
    width: '60%',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing['4xl'],
  },
  titleContainer: {
    marginBottom: Spacing.xl,
  },
  appTitle: {
    fontSize: Typography.size['4xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: Typography.letterSpacing.tight,
  },
  titleAccent: {
    width: 48,
    height: 4,
    backgroundColor: Colors.accent.coral,
    borderRadius: 2,
    marginTop: Spacing.md,
  },
  tagline: {
    fontSize: Typography.size['2xl'],
    fontWeight: '500',
    color: Colors.text.primary,
    lineHeight: Typography.size['2xl'] * Typography.lineHeight.relaxed,
    marginBottom: Spacing['2xl'],
    letterSpacing: Typography.letterSpacing.normal,
  },
  descriptionContainer: {
    backgroundColor: Colors.card.background,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.card.border,
  },
  description: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    lineHeight: Typography.size.base * Typography.lineHeight.relaxed,
  },
  startButton: {
    backgroundColor: Colors.text.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    ...Shadows.md,
  },
  startButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  buttonIconText: {
    fontSize: 20,
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
    paddingTop: Spacing['4xl'],
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
