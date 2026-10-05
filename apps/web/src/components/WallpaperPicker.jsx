import { Button, Modal, useOverlayState } from "@heroui/react";
import { Check, ImageIcon } from "lucide-react";
import { useTransition } from "react";
import { useWallpaper } from "../context/wallpaper";
import { WALLPAPER_SECTIONS, WALLPAPERS } from "../data/wallpapers";

function WallpaperThumb({ wallpaper, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(wallpaper.id)}
      className={[
        "relative aspect-4/3 w-full overflow-hidden rounded-xl bg-zinc-900 contain-[layout] cursor-pointer active:scale-95 transition-all",
        selected
          ? "ring-2 ring-accent ring-offset-2 ring-offset-[#2a2a2c]"
          : "outline-1 outline-transparent hover:outline-white/45",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a2a2c]",
      ].join(" ")}
      aria-pressed={selected}
    >
      <img
        src={wallpaper.url}
        alt={wallpaper.label}
        width={320}
        height={240}
        className="pointer-events-none h-full w-full object-cover select-none"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
        referrerPolicy="no-referrer"
        draggable={false}
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black/60 backdrop-blur-[2px] px-2 py-1 text-left text-[11px] font-medium leading-tight text-white/95">
        {wallpaper.label}
      </span>
      {selected ? (
        <span className="absolute right-1.5 top-1.5 z-10 flex size-5.5 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md ring-2 ring-white/20">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

export function WallpaperPicker({ isOpen, onClose }) {
  const isControlled = isOpen !== undefined;
  const modal = useOverlayState({
    isOpen: isControlled ? isOpen : undefined,
    onOpenChange: (open) => {
      if (!open && onClose) onClose();
    },
  });
  const { wallpaperId, setWallpaperId } = useWallpaper();
  const [, startTransition] = useTransition();

  const handleSelect = (id) => {
    modal.close();
    if (onClose) onClose();
    startTransition(() => {
      setWallpaperId(id);
    });
  };

  return (
    <Modal.Root state={modal}>
      {!isControlled ? (
        <Modal.Trigger>
          <Button
            variant="ghost"
            isIconOnly
            className="size-9 text-foreground"
            aria-label="Chat Wallpaper"
            title="Chat Wallpaper"
          >
            <ImageIcon className="size-4.5" />
          </Button>
        </Modal.Trigger>
      ) : null}

      <Modal.Backdrop variant="opaque">
        <Modal.Container size="lg" scroll="inside" placement="center">
          <Modal.Dialog className="max-h-[85dvh] w-[94vw] max-w-2xl rounded-2xl md:rounded-3xl border border-white/10 bg-[#2a2a2c] text-foreground shadow-2xl">
            <Modal.Header className="flex flex-row items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-5 text-accent" />
                <Modal.Heading className="text-lg font-semibold tracking-tight text-white">
                  Chat Wallpaper
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="isolate space-y-6 px-4 py-4 sm:px-6 sm:py-5">
              {WALLPAPER_SECTIONS.map((section) => (
                <section key={section.id} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                    {WALLPAPERS.filter((w) => w.category === section.id).map((w) => (
                      <WallpaperThumb
                        key={w.id}
                        wallpaper={w}
                        selected={wallpaperId === w.id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
