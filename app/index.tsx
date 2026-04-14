import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { openURL } from "expo-linking";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";

const MESSENGER_URL = "https://chat.aliterra.space";
const METAMASK_DEEP_LINK = "metamask://dapp/chat.aliterra.space";

const INJECTED_JS = `
(function() {
  var meta = document.querySelector('meta[name="viewport"]');
  if (meta) meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  document.body && (document.body.style.overscrollBehavior = 'none');

  if (!window.ethereum) {
    var pendingRequests = {};
    var reqId = 0;

    window.ethereum = {
      isMetaMask: true,
      isConnected: function() { return false; },
      selectedAddress: null,
      chainId: '0x89',
      networkVersion: '137',
      _events: {},

      request: function(args) {
        return new Promise(function(resolve, reject) {
          var id = ++reqId;
          pendingRequests[id] = { resolve: resolve, reject: reject };
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ETHEREUM_REQUEST',
            id: id,
            method: args.method,
            params: args.params || []
          }));
        });
      },

      send: function(method, params) {
        return this.request({ method: method, params: params || [] });
      },

      on: function(event, handler) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(handler);
        return this;
      },

      removeListener: function(event, handler) {
        if (this._events[event]) {
          this._events[event] = this._events[event].filter(function(h) { return h !== handler; });
        }
        return this;
      },

      emit: function(event, data) {
        var handlers = this._events[event] || [];
        handlers.forEach(function(h) { try { h(data); } catch(e) {} });
      },

      _resolveRequest: function(id, result) {
        if (pendingRequests[id]) {
          pendingRequests[id].resolve(result);
          delete pendingRequests[id];
        }
      },

      _rejectRequest: function(id, error) {
        if (pendingRequests[id]) {
          pendingRequests[id].reject(new Error(error));
          delete pendingRequests[id];
        }
      }
    };

    window.web3 = { currentProvider: window.ethereum };
  }
  true;
})();
`;

export default function MessengerScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [error, setError] = useState(false);
  const [showMetaMaskBanner, setShowMetaMaskBanner] = useState(false);

  const openMetaMask = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await openURL(METAMASK_DEEP_LINK);
    } catch {
      Alert.alert(
        "MetaMask not installed",
        "Install MetaMask from Google Play or App Store, then reopen the app.",
        [{ text: "OK" }]
      );
    }
  }, []);

  const handleReload = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(false);
    setLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleGoBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.goBack();
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "ETHEREUM_REQUEST") {
          if (
            data.method === "eth_requestAccounts" ||
            data.method === "eth_accounts"
          ) {
            setShowMetaMaskBanner(true);
          }
        }
      } catch {
        // ignore
      }
    },
    []
  );

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Feather name="wifi-off" size={40} color="#3b82f6" />
          </View>
          <Text style={styles.errorTitle}>No connection</Text>
          <Text style={styles.errorText}>
            Could not load the messenger. Check your internet connection and try
            again.
          </Text>
          <Pressable
            onPress={handleReload}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Feather name="refresh-cw" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {showMetaMaskBanner && (
        <Pressable
          onPress={openMetaMask}
          style={({ pressed }) => [
            styles.metamaskBanner,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="external-link" size={16} color="#f59e0b" />
          <Text style={styles.metamaskBannerText}>
            Open in MetaMask to connect wallet
          </Text>
          <Pressable
            onPress={() => setShowMetaMaskBanner(false)}
            hitSlop={12}
          >
            <Feather name="x" size={16} color="#7b8ca8" />
          </Pressable>
        </Pressable>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: MESSENGER_URL }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback
        mixedContentMode="compatibility"
        cacheEnabled
        originWhitelist={["*"]}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      {canGoBack && (
        <Pressable
          onPress={handleGoBack}
          style={({ pressed }) => [
            styles.backButton,
            { bottom: insets.bottom + 24 },
            pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
          ]}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0b0f19",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59, 130, 246, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  metamaskBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a2236",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  metamaskBannerText: {
    flex: 1,
    color: "#e8ecf4",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(59,130,246,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  errorTitle: {
    color: "#e8ecf4",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  errorText: {
    color: "#7b8ca8",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
