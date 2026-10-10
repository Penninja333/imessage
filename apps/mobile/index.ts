import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import App from "./App";

declare const ErrorUtils: {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setJSExceptionHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

// Protect against instant native crashes from unhandled JS exceptions in release mode
if (typeof ErrorUtils !== "undefined") {
  const originalHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setJSExceptionHandler((error: Error, isFatal?: boolean) => {
    console.error("[iMessage Global JS Error]", error?.message, error?.stack, "isFatal:", isFatal);
    if (__DEV__ && originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

registerRootComponent(App);
