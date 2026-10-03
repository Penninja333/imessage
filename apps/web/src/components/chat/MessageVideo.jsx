import { isImageKitUrl, withTransform } from "../../lib/imagekit";
import { Maximize2 } from "lucide-react";

// Chat videos are stored on ImageKit, so we let ImageKit optimize delivery
// on the fly via URL transformations (compressed + sized for the bubble).
// Note: q-auto isn't enabled for video on this account (returns 400), so use a fixed quality.
// https://imagekit.io/docs/video-transformation
const VIDEO_TRANSFORM = "q-80,w-640";
const POSTER_TRANSFORM = "q-80,w-640";

/** ImageKit can extract a poster frame by appending `/ik-thumbnail.jpg`. */
function buildPosterUrl(url) {
  if (!isImageKitUrl(url)) return undefined;
  const [path] = url.split("?");
  return withTransform(`${path}/ik-thumbnail.jpg`, POSTER_TRANSFORM);
}

/** ImageKit-optimized chat video with an auto-generated poster frame and fullscreen expansion trigger. */
export function MessageVideo({ src, onOpenFullscreen }) {
  const optimizedSrc = withTransform(src, VIDEO_TRANSFORM);
  const posterSrc = buildPosterUrl(src);

  return (
    <div className="group/video relative mb-1.5 overflow-hidden rounded-lg sm:rounded-xl">
      <video
        src={optimizedSrc}
        poster={posterSrc}
        controls
        playsInline
        preload="metadata"
        className="max-h-52 max-w-full rounded-lg object-contain sm:max-h-64 sm:rounded-xl"
      />
      {onOpenFullscreen ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenFullscreen();
          }}
          className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[11px] font-medium text-white shadow-md backdrop-blur-md opacity-90 hover:opacity-100 hover:bg-black/85 active:scale-95 transition"
          title="Open Fullscreen"
          aria-label="Open Fullscreen"
        >
          <Maximize2 className="size-3.5" />
          <span className="text-[10px] hidden sm:inline">Fullscreen</span>
        </button>
      ) : null}
    </div>
  );
}
