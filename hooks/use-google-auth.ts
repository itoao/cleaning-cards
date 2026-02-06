import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GoogleSignin, statusCodes, User } from '@react-native-google-signin/google-signin';

type AuthUser = {
  id: string;
  name: string | null;
  email: string | null;
  photo: string | null;
};

const isWeb = Platform.OS === 'web';

const mapToAuthUser = (payload: User | null): AuthUser | null => {
  if (!payload) return null;
  const user = payload?.user ?? payload;
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    photo: user.photo ?? null,
  };
};

const getErrorMessage = (error: unknown): string => {
  const typedError = error as { code?: string; message?: string };
  switch (typedError.code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return '操作はキャンセルされました。';
    case statusCodes.IN_PROGRESS:
      return '認証処理が進行中です。';
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Play Services が利用できません。';
    case statusCodes.SIGN_IN_REQUIRED:
      return 'まだログインしていません。';
    default:
      return typedError.message ?? 'Google ログインに失敗しました。';
  }
};

const googleConfig = {
  webClientId:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_GOOGLE_WEB_CLIENT_ID ?? '',
  iosClientId:
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? process.env.EXPO_GOOGLE_IOS_CLIENT_ID ?? '',
  androidClientId:
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? process.env.EXPO_GOOGLE_ANDROID_CLIENT_ID ?? '',
};

export function useGoogleAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isWeb) {
      setInitializing(false);
      return;
    }

    GoogleSignin.configure({
      scopes: ['email', 'profile'],
      webClientId: googleConfig.webClientId,
      iosClientId: googleConfig.iosClientId,
      androidClientId: googleConfig.androidClientId,
      offlineAccess: true,
    });

    GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }).catch(() => {
      // ignore
    });

    (async () => {
      try {
        const restored = await GoogleSignin.signInSilently();
        setUser(mapToAuthUser(restored));
      } catch (err) {
        if ((err as { code?: string }).code !== statusCodes.SIGN_IN_REQUIRED) {
          setError(getErrorMessage(err));
        }
        setUser(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const signIn = useCallback(async () => {
    if (isWeb) {
      throw new Error('Google ログインはモバイルでのみ利用できます。');
    }

    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      const transformed = mapToAuthUser(result);
      setUser(transformed);
      setError(null);
      return transformed;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const signInSilently = useCallback(async () => {
    if (isWeb) {
      throw new Error('Google ログインはモバイルでのみ利用できます。');
    }

    setBusy(true);
    try {
      const result = await GoogleSignin.signInSilently({ webClientId: googleConfig.webClientId });
      const transformed = mapToAuthUser(result);
      setUser(transformed);
      setError(null);
      return transformed;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isWeb) {
      setUser(null);
      return;
    }

    setBusy(true);
    try {
      await GoogleSignin.signOut();
      setUser(null);
      setError(null);
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    user,
    initializing,
    busy,
    error,
    signIn,
    signInSilently,
    signOut,
  };
}

export type { AuthUser };
