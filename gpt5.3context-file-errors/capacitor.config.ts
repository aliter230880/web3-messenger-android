import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "space.aliterra.chat",
  appName: "AliTerra Messenger",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;