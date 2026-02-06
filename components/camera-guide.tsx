/**
 * Camera Guide - ガイド付きカメラ撮影画面
 *
 * 撮影のコツを表示し、フレーミングガイドを提供
 * 実カメラで撮影し、サーバーに送信してカード文言を取得
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, Platform, ActivityIndicator } from 'react-native';
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
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

interface CameraGuideProps {
  onAnalysisComplete: (payload: { imageUri: string; cards: Array<{ instruction: string }> }) => void;
  onBack: () => void;
}

export function CameraGuide({ onAnalysisComplete, onBack }: CameraGuideProps) {
  const [showTips, setShowTips] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cameraRef = React.useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

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

    setIsProcessing(true);
    setShowTips(false);
    setErrorMessage(null);
  }, []);

  const uploadAndAnalyze = useCallback(
    async (payload: { file?: File; uri?: string; width?: number; height?: number }) => {
      const formData = new FormData();

      if (payload.file) {
        formData.append('image', payload.file, payload.file.name);
      } else if (payload.uri) {
        formData.append('image', {
          uri: payload.uri,
          name: 'room.jpg',
          type: 'image/jpeg',
        } as any);
      } else {
        throw new Error('画像が取得できませんでした');
      }

      formData.append('locale', 'ja-JP');

      const response = await fetch(`${API_BASE_URL}/api/analysis/room-photo`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `サーバーエラー (${response.status})`);
      }

      const data = (await response.json()) as {
        cards?: Array<{ instruction?: string }>;
      };
      const cards = (data.cards ?? [])
        .filter((card) => typeof card?.instruction === 'string')
        .map((card) => ({
          instruction: card.instruction as string,
        }));

      if (cards.length === 0) {
        throw new Error('カードが生成されませんでした');
      }

      return { cards };
    },
    []
  );

  const handleCaptureAndAnalyze = useCallback(async () => {
    try {
      if (!cameraRef.current) {
        throw new Error('カメラが初期化されていません');
      }

      handleCapture();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      const { uri, width, height } = photo;
      const longEdge = Math.max(width ?? 0, height ?? 0);
      const actions = [];
      if (longEdge > 1280) {
        if (width && height) {
          actions.push(
            width >= height
              ? { resize: { width: 1280 } }
              : { resize: { height: 1280 } }
          );
        } else {
          actions.push({ resize: { width: 1280 } });
        }
      }

      const processed = await manipulateAsync(
        uri,
        actions,
        {
          compress: 0.75,
          format: SaveFormat.JPEG,
        }
      );

      const result = await uploadAndAnalyze({ uri: processed.uri, width, height });
      onAnalysisComplete({ imageUri: processed.uri, cards: result.cards });
    } catch (error) {
      const message = error instanceof Error ? error.message : '撮影に失敗しました';
      setErrorMessage(message);
      setIsProcessing(false);
    }
  }, [handleCapture, onAnalysisComplete, uploadAndAnalyze]);

  const handleWebPick = useCallback(() => {
    setErrorMessage(null);
    setShowTips(false);
    setIsProcessing(true);

    const convertToJpeg = async (file: File) => {
      if (!file.type.startsWith('image/')) {
        throw new Error('画像ファイルを選択してください');
      }

      const isHeic =
        file.type.includes('heic') ||
        file.type.includes('heif') ||
        file.name.toLowerCase().endsWith('.heic') ||
        file.name.toLowerCase().endsWith('.heif');

      let sourceBlob: Blob = file;

      if (isHeic) {
        try {
          const { default: heic2any } = await import('heic2any');
          const converted = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9,
          });
          sourceBlob = Array.isArray(converted) ? converted[0] : converted;
        } catch (error) {
          throw new Error('HEICの変換に失敗しました。JPEG/PNGに変換してから選択してください。');
        }
      }

      try {
        const bitmap = await createImageBitmap(sourceBlob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('画像の読み込みに失敗しました');
        }
        ctx.drawImage(bitmap, 0, 0);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => (result ? resolve(result) : reject(new Error('画像変換に失敗しました'))),
            'image/jpeg',
            0.9
          );
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const jpegFile = new File([blob], 'room.jpg', { type: 'image/jpeg' });
        return { file: jpegFile, dataUrl };
      } catch {
        throw new Error('画像の読み込みに失敗しました');
      }
    };

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) {
          setIsProcessing(false);
          return;
        }

        const converted = await convertToJpeg(file);
        const result = await uploadAndAnalyze({ file: converted.file });
        onAnalysisComplete({ imageUri: converted.dataUrl ?? '', cards: result.cards });
      } catch (error) {
        const message = error instanceof Error ? error.message : '画像の解析に失敗しました';
        setErrorMessage(message);
        setIsProcessing(false);
      }
    };

    input.click();
  }, [onAnalysisComplete, uploadAndAnalyze]);

  const handleDismissTips = useCallback(() => {
    setShowTips(false);
  }, []);

if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={Gradients.atmosphere}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cameraGradient}
          pointerEvents="none"
        />
        <View style={styles.webContainer}>
          <Animated.Text style={styles.webTitle}>画像を選んで解析</Animated.Text>
          <Animated.Text style={styles.webText}>
            デバッグ用に、写真を選択してカード文言を生成します。
          </Animated.Text>
          <Pressable
            style={({ pressed }) => [
              styles.webButton,
              pressed && styles.webButtonPressed,
            ]}
            onPress={handleWebPick}
            disabled={isProcessing}
          >
            <Animated.Text style={styles.webButtonText}>
              {isProcessing ? '解析中...' : '画像を選択'}
            </Animated.Text>
          </Pressable>
          {errorMessage && (
            <Animated.Text style={styles.webErrorText}>{errorMessage}</Animated.Text>
          )}
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <LinearGradient
          colors={Gradients.atmosphere}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cameraGradient}
          pointerEvents="none"
        />
        <ActivityIndicator color="#FFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <LinearGradient
          colors={Gradients.atmosphere}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cameraGradient}
          pointerEvents="none"
        />
        <Animated.Text style={styles.permissionTitle}>カメラの許可が必要です</Animated.Text>
        <Animated.Text style={styles.permissionText}>
          片付けたい場所を撮影するためにカメラへのアクセスを許可してください。
        </Animated.Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Animated.Text style={styles.permissionButtonText}>許可する</Animated.Text>
        </Pressable>
        <Pressable style={styles.permissionBack} onPress={onBack}>
          <Animated.Text style={styles.permissionBackText}>戻る</Animated.Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.atmosphere}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.cameraGradient}
        pointerEvents="none"
      />
      {/* カメラビューファインダー */}
      <View style={styles.viewfinder}>
        {/* プレビュー背景 */}
        <CameraView ref={cameraRef} style={styles.previewImage} facing="back" />

        {/* スキャンライン */}
        {!isProcessing && (
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
        {isProcessing && (
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
        <LinearGradient
          colors={[ 'rgba(10, 18, 34, 0.95)', 'rgba(10, 18, 34, 0.5)', 'transparent' ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
        {/* 撮影ボタン */}
        <Animated.View style={pulseStyle}>
          <Pressable
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
              isProcessing && styles.captureButtonCapturing,
            ]}
            onPress={handleCaptureAndAnalyze}
            disabled={isProcessing}
          >
            <View style={styles.captureButtonInner}>
              {isProcessing ? (
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
            {isProcessing ? '解析中...' : 'タップして撮影'}
          </Animated.Text>
        </Animated.View>

        {errorMessage && (
          <Animated.View entering={FadeIn} style={styles.errorContainer}>
            <Animated.Text style={styles.errorText}>{errorMessage}</Animated.Text>
          </Animated.View>
        )}
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
    position: 'relative',
  },
  viewfinder: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
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
  cameraGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
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
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
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
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
    backgroundColor: Colors.cream,
  },
  webTitle: {
    fontSize: Typography.size.xl,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  webText: {
    fontSize: Typography.size.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.size.base * Typography.lineHeight.relaxed,
  },
  webButton: {
    backgroundColor: Colors.text.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  webButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  webButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.size.base,
    fontWeight: '600',
  },
  webErrorText: {
    marginTop: Spacing.md,
    fontSize: Typography.size.sm,
    color: Colors.accent.coral,
    textAlign: 'center',
  },
  permissionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.lg,
  },
  permissionTitle: {
    fontSize: Typography.size.xl,
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: Typography.size.base,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: Typography.size.base * Typography.lineHeight.relaxed,
  },
  permissionButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  permissionButtonText: {
    fontSize: Typography.size.base,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  permissionBack: {
    paddingVertical: Spacing.sm,
  },
  permissionBackText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Typography.size.sm,
  },
  errorContainer: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: Radius.md,
  },
  errorText: {
    color: '#FFF',
    fontSize: Typography.size.xs,
    textAlign: 'center',
  },
});
