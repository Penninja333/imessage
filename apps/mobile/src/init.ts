import "react-native-gesture-handler";

function reportCrashToServer(type: string, error: any, extra?: any) {
  try {
    const payload = JSON.stringify({
      type,
      message: error?.message || String(error),
      stack: error?.stack || null,
      extra: extra || null,
    });
    fetch("https://imessage-fwxv.onrender.com/api/debug/crash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => {});
  } catch {}
}

// Safely configure global React Native error handler using standard ErrorUtils API
try {
  const globalErrorUtils = (global as any).ErrorUtils;
  if (globalErrorUtils && typeof globalErrorUtils.setGlobalHandler === "function") {
    const originalHandler =
      typeof globalErrorUtils.getGlobalHandler === "function"
        ? globalErrorUtils.getGlobalHandler()
        : null;

    globalErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      console.error("[iMessage Global JS Error]", error?.message, error?.stack, "isFatal:", isFatal);
      reportCrashToServer("JS_FATAL_EXCEPTION", error, { isFatal });
      if (__DEV__ && originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
} catch (e) {
  console.warn("Failed to set global error handler:", e);
}
