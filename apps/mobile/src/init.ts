import "react-native-gesture-handler";

declare const ErrorUtils: {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setJSExceptionHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

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

// Protect against unhandled JS exceptions before any screens or stores evaluate
if (typeof ErrorUtils !== "undefined") {
  const originalHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setJSExceptionHandler((error: Error, isFatal?: boolean) => {
    console.error("[iMessage Global JS Error]", error?.message, error?.stack, "isFatal:", isFatal);
    reportCrashToServer("JS_FATAL_EXCEPTION", error, { isFatal });
    if (__DEV__ && originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}
