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
const METAMASK_DEEP_LINK = `metamask://dapp/chat.aliterra.space`;

// Injected JS: bridges window.ethereum → MetaMask mobile app via deep link
const INJECTED_JS = `
(function() {
  // Fix viewport
  var meta = document.querySelector('meta[name="viewport"]');
  if (meta) meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  document.body && (document.body.style.overscrollBehavior = 'none');

  // MetaMask mobile bridge
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

    // Also expose as web3.currentProvider for legacy DApps
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
        "MetaMask не установлен",
        "Установите MetaMask из Google Play или App Store, затем откройте приложение снова.",
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

  // Handle messages from injected JS (ethereum bridge)
  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);

        if (msg.type === "ETHEREUM_REQUEST") {
          const { id, method } = msg;

          if (
            method === "eth_requestAccounts" ||
            method === "eth_accounts" ||
            method === "wallet_requestPermissions"
          ) {
            // Open MetaMask to connect
            setShowMetaMaskBanner(true);
            try {
              await openURL(METAMASK_DEEP_LINK);
              // Reject so the site shows connect UI again when user returns
              webViewRef.current?.injectJavaScript(
                `window.ethereum._rejectRequest(${id}, 'User opened MetaMask'); true;`
              );
            } catch {
              webViewRef.current?.injectJavaScript(
                `window.ethereum._rejectRequest(${id}, 'MetaMask not installed'); true;`
              );
              Alert.alert(
                "MetaMask не установлен",
                "Установите MetaMask и попробуйте снова.",
                [{ text: "OK" }]
              );
            }
          } else {
            // For other eth calls, open MetaMask
            try {
              await openURL(METAMASK_DEEP_LINK);
            } catch {
              webViewRef.current?.injectJavaScript(
                `window.ethereum._rejectRequest(${id}, 'MetaMask required'); true;`
              );
            }
          }
        }
      } catch {
        // ignore parse errors
      }
    },
    []
  );

  // Handle metamask:// scheme navigation
  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      const { url } = request;
      if (
        url.startsWith("metamask://") ||
        url.startsWith("wc://") ||
        url.startsWith("wc:") ||
        url.startsWith("ethereum:")
      ) {
        openURL(url).catch(() => {});
        return false; // Don't load in WebView
      }
      return true;
    },
    []
  );

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Feather name="wifi-off" size={48} color="#3b82f6" />
          </View>
          <Text style={styles.errorTitle}>Нет соединения</Text>
          <Text style={styles.errorText}>
            Не удалось подключиться. Проверьте интернет и попробуйте снова.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
            onPress={handleReload}
          >
            <Feather name="refresh-cw" size={18} color="#ffffff" />
            <Text style={styles.retryButtonText}>Повторить</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header with back/reload */}
      {canGoBack && (
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.headerBtn,
              pressed && { opacity: 0.6 },
            ]}
            onPress={handleGoBack}
          >
            <Feather name="arrow-left" size={22} color="#e8ecf4" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.headerBtn,
              pressed && { opacity: 0.6 },
            ]}
            onPress={handleReload}
          >
            <Feather name="refresh-cw" size={18} color="#7b8ca8" />
          </Pressable>
        </View>
      )}

      {/* MetaMask banner — показывается когда нужно подключить кошелёк */}
      {showMetaMaskBanner && (
        <Pressable
          style={styles.metaMaskBanner}
          onPress={openMetaMask}
        >
          <View style={styles.metaMaskBannerLeft}>
            <View style={styles.metaMaskDot} />
            <Text style={styles.metaMaskBannerText}>
              Откройте MetaMask для подключения кошелька
            </Text>
          </View>
          <Pressable
            onPress={() => setShowMetaMaskBanner(false)}
            style={styles.bannerClose}
            hitSlop={8}
          >
            <Feather name="x" size={14} color="#7b8ca8" />
          </Pressable>
        </Pressable>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: MESSENGER_URL }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) setError(true);
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(!!navState.canGoBack);
        }}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        overScrollMode="never"
        cacheEnabled
        injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
        userAgent={
          Platform.OS === "android"
            ? "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 AliTerraMessenger/1.0"
            : "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 AliTerraMessenger/1.0"
        }
      />

      {/* MetaMask floating button */}
      <Pressable
        style={({ pressed }) => [
          styles.metaMaskFab,
          { bottom: insets.bottom + 16 },
          pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
        ]}
        onPress={openMetaMask}
      >
        <Text style={styles.metaMaskFabText}>🦊</Text>
      </Pressable>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Загрузка мессенджера...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0d1220",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  metaMaskBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(245,158,11,0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  metaMaskBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  metaMaskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },
  metaMaskBannerText: {
    color: "#f59e0b",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  bannerClose: {
    padding: 4,
    marginLeft: 8,
  },
  webview: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  metaMaskFab: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  metaMaskFabText: {
    fontSize: 22,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0b0f19",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContent: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: "#7b8ca8",
    fontSize: 15,
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