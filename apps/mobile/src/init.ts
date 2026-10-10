import "react-native-gesture-handler";

declare const ErrorUtils: {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setJSExceptionHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

// Protect against unhandled JS exceptions before any screens or stores evaluate
if (typeof ErrorUtils !== "undefined") {
  const originalHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setJSExceptionHandler((error: Error, isFatal?: boolean) => {
    console.error("[iMessage Global JS Error]", error?.message, error?.stack, "isFatal:", isFatal);
    if (__DEV__ && originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}
