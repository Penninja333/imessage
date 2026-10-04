import { AuthActionPanel } from "../components/auth/AuthActionPanel";
import AuthHeader from "../components/auth/AuthHeader";
import { AuthHeroPanel } from "../components/auth/AuthHeroPanel";
import { useWallpaper } from "../context/wallpaper";

function AuthPage() {
  const { frameStyle } = useWallpaper();

  return (
    <div
      className="box-border flex min-h-dvh w-full flex-col items-center justify-center overflow-y-auto p-3 sm:p-5 md:p-8"
      style={frameStyle}
    >
      <div className="chat-app-frame mx-auto flex w-full max-w-[368px] flex-col rounded-3xl border border-border bg-background text-foreground shadow-2xl sm:max-w-[420px] md:max-w-[760px] lg:max-w-[840px] my-auto overflow-hidden transition-all duration-300">
        <AuthHeader />

        <main className="relative flex flex-1 flex-col md:flex-row overflow-y-auto md:overflow-hidden">
          <AuthHeroPanel />
          <AuthActionPanel />
        </main>
      </div>
    </div>
  );
}

export default AuthPage;
