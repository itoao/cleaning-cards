/**
 * Camera Guide - ガイド付きカメラ撮影画面
 *
 * 撮影のコツを表示し、フレーミングガイドを提供
 * モックなのでカメラは使わず、画像選択をシミュレート
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Dimensions, Pressable, Platform, Image } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// モック用のサンプル部屋画像
const SAMPLE_ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
];

interface CameraGuideProps {
  onPhotoTaken: (imageUri: string) => void;
  onBack: () => void;
}

export function CameraGuide({ onPhotoTaken, onBack }: CameraGuideProps) {
  const [showTips, setShowTips] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  // Pulse animation for capture button
  const pulseAnim = useSharedValue(1);

  React.useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Scanning line animation
  const scanAnim = useSharedValue(0);

  React.useEffect(() => {
    scanAnim.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanAnim.value * 100}%`,
  }));

  const handleCapture = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    setIsCapturing(true);
    setShowTips(false);

    // モック：ランダムに画像を選択
    setTimeout(() => {
      const randomImage = SAMPLE_ROOM_IMAGES[Math.floor(Math.random() * SAMPLE_ROOM_IMAGES.length)];
      onPhotoTaken(randomImage);
    }, 800);
  }, [onPhotoTaken]);

  const handleDismissTips = useCallback(() => {
    setShowTips(false);
  }, []);

  return (
    <View style={styles.container}>
      {/* カメラビューファインダー（モック） */}
      <View style={styles.viewfinder}>
        {/* プレビュー背景 */}
        <Image
          source={{ uri: SAMPLE_ROOM_IMAGES[0] }}
          style={styles.previewImage}
          blurRadius={isCapturing ? 0 : 2}
        />

        {/* スキャンライン */}
        {!isCapturing && (
          <Animated.View style={[styles.scanLine, scanLineStyle]} />
        )}

        {/* フレーミングガイド - 3x3グリッド */}
        <View style={styles.gridOverlay}>
          {/* 縦線 */}
          <View style={[styles.gridLine, styles.gridLineVertical, { left: '33.33%' }]} />
          <View style={[styles.gridLine, styles.gridLineVertical, { left: '66.66%' }]} />
          {/* 横線 */}
          <View style={[styles.gridLine, styles.gridLineHorizontal, { top: '33.33%' }]} />
          <View style={[styles.gridLine, styles.gridLineHorizontal, { top: '66.66%' }]} />
        </View>

        {/* コーナーマーカー */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* キャプチャ中のフラッシュ */}
        {isCapturing && (
          <Animated.View
            entering={FadeIn.duration(100)}
            exiting={FadeOut.duration(300)}
            style={styles.flashOverlay}
          />
        )}
      </View>

      {/* 撮影ヒント（下部カード） */}
      {showTips && (
        <Animated.View
          entering={SlideInUp.duration(500).springify()}
          exiting={FadeOut.duration(200)}
          style={styles.tipsContainer}
        >
          <View style={styles.tipsHeader}>
            <Animated.Text style={styles.tipsTitle}>撮影のコツ</Animated.Text>
            <Pressable onPress={handleDismissTips} style={styles.closeTipsButton}>
              <Animated.Text style={styles.closeTipsText}>×</Animated.Text>
            </Pressable>
          </View>

          <View style={styles.tipsList}>
            <TipItem emoji="🏠" text="部屋全体が見える角度で" />
            <TipItem emoji="💡" text="明るい場所で撮影" />
            <TipItem emoji="📐" text="床が少し見えるように" />
          </View>

          <View style={styles.tipsNote}>
            <Animated.Text style={styles.tipsNoteText}>
              散らかっていても大丈夫
            </Animated.Text>
          </View>
        </Animated.View>
      )}

      {/* 上部UI */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Animated.Text style={styles.backButtonText}>←</Animated.Text>
        </Pressable>

        <Animated.View entering={FadeIn.delay(300)} style={styles.topHint}>
          <Animated.Text style={styles.topHintText}>
            片付けたい場所を撮影
          </Animated.Text>
        </Animated.View>

        <View style={styles.placeholder} />
      </View>

      {/* 下部コントロール */}
      <View style={styles.bottomControls}>
        {/* 撮影ボタン */}
        <Animated.View style={pulseStyle}>
          <Pressable
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
              isCapturing && styles.captureButtonCapturing,
            ]}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner}>
              {isCapturing ? (
                <Animated.View entering={FadeIn} style={styles.capturingIndicator} />
              ) : (
                <View style={styles.captureIcon} />
              )}
            </View>
          </Pressable>
        </Animated.View>

        {/* ボタンラベル */}
        <Animated.View entering={FadeIn.delay(400)}>
          <Animated.Text style={styles.captureLabel}>
            {isCapturing ? '処理中...' : 'タップして撮影'}
          </Animated.Text>
        </Animated.View>
      </View>
    </View>
  );
}

function TipItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.tipItem}>
      <Animated.Text style={styles.tipEmoji}>{emoji}</Animated.Text>
      <Animated.Text style={styles.tipText}>{text}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewfinder: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.accent.coral,
    opacity: 0.6,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  gridLineVertical: {
    width: 1,
    top: 0,
    bottom: 0,
  },
  gridLineHorizontal: {
    height: 1,
    left: 0,
    right: 0,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.accent.coral,
  },
  cornerTL: {
    top: Spacing['2xl'],
    left: Spacing['2xl'],
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: Spacing['2xl'],
    right: Spacing['2xl'],
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 180,
    left: Spacing['2xl'],
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 180,
    right: Spacing['2xl'],
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    opacity: 0.8,
  },
  tipsContainer: {
    position: 'absolute',
    bottom: 160,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.card.background,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  tipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: Typography.size.md,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  closeTipsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeTipsText: {
    fontSize: 18,
    color: Colors.text.secondary,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tipEmoji: {
    fontSize: 20,
  },
  tipText: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
  },
  tipsNote: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.card.border,
  },
  tipsNoteText: {
    fontSize: Typography.size.sm,
    color: Colors.accent.coral,
    textAlign: 'center',
    fontWeight: '500',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#FFF',
  },
  topHint: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  topHintText: {
    fontSize: Typography.size.sm,
    color: '#FFF',
    fontWeight: '500',
  },
  placeholder: {
    width: 44,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Spacing['4xl'],
    paddingTop: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  captureButtonCapturing: {
    backgroundColor: Colors.accent.coral,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent.coral,
  },
  capturingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  captureLabel: {
    fontSize: Typography.size.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
