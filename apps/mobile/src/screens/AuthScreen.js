import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useOAuth } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { startOAuthFlow: googleOAuth } = useOAuth({ strategy: 'oauth_google' });

  const onGooglePress = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await googleOAuth();
      if (createdSessionId) await setActive({ session: createdSessionId });
    } catch (err) {
      console.error('OAuth error', err);
    }
  }, [googleOAuth]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>💬</Text>
        </View>
        <Text style={styles.appName}>iMessage</Text>
        <Text style={styles.tagline}>Real-time chat, reimagined.</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {[
          ['⚡', 'Instant delivery', 'Socket.io — zero polling.'],
          ['🎨', '8 accent themes', 'Pick your vibe and it persists.'],
          ['🏷️', 'Nicknames', 'Set private nicknames for contacts.'],
          ['🌙', 'Light & dark', 'Follows your OS or your choice.'],
        ].map(([icon, title, desc]) => (
          <View key={title} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <View>
              <Text style={styles.featureTitle}>{title}</Text>
              <Text style={styles.featureDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Auth buttons */}
      <View style={styles.authArea}>
        <TouchableOpacity style={styles.googleBtn} onPress={onGooglePress}>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          🔒 Protected session · TLS encryption
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', marginTop: 24 },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#1c1c1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0a7ea4',
    shadowRadius: 20,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  tagline: { fontSize: 15, color: '#8e8e93', marginTop: 6 },

  features: { gap: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  featureIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  featureTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  featureDesc: { color: '#8e8e93', fontSize: 13, marginTop: 2 },

  authArea: { gap: 16 },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  googleBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  legal: { textAlign: 'center', color: '#636366', fontSize: 12 },
});
