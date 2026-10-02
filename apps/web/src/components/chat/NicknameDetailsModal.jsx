import { useState } from "react";
import { Button } from "@heroui/react";
import { CheckIcon, PencilIcon, SparklesIcon, UserIcon, XIcon } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";

export function NicknameDetailsModal({ isOpen, onClose, peer }) {
  const setNickname = useChatStore((state) => state.setNickname);
  const [nicknameInput, setNicknameInput] = useState(peer?.nickname || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !peer) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setNickname(peer.id, nicknameInput.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await setNickname(peer.id, "");
      setNicknameInput("");
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-surface hover:text-foreground transition-colors"
        >
          <XIcon className="size-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <SparklesIcon className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Chat Nicknames</h3>
            <p className="text-xs text-muted">Shared nickname settings for this conversation</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="mt-5 space-y-4">
          {/* Card 1: What they call YOU */}
          <div className="rounded-xl border border-border/80 bg-surface/50 p-3.5 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                What {peer.fullName} calls you
              </span>
              <span className="text-[11px] rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">
                Visible to both
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <UserIcon className="size-4 text-muted" />
              <p className="text-base font-bold text-foreground">
                {peer.myNickname ? (
                  <span>"{peer.myNickname}"</span>
                ) : (
                  <span className="text-muted font-normal text-sm italic">
                    (No nickname set for you yet)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Card 2: What you call THEM */}
          <div className="rounded-xl border border-border/80 bg-surface/50 p-3.5 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Your nickname for {peer.fullName}
              </span>
              {!isEditing && (
                <button
                  onClick={() => {
                    setNicknameInput(peer.nickname || "");
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  <PencilIcon className="size-3" /> Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  autoFocus
                  maxLength={32}
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setIsEditing(false);
                  }}
                  placeholder={`Nickname for ${peer.fullName}...`}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  {peer.nickname && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/10"
                      isDisabled={isSaving}
                      onPress={handleClear}
                    >
                      Remove
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    isDisabled={isSaving}
                    onPress={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-accent text-accent-foreground"
                    isLoading={isSaving}
                    onPress={handleSave}
                  >
                    <CheckIcon className="size-3.5 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <SparklesIcon className="size-4 text-accent" />
                <p className="text-base font-bold text-foreground">
                  {peer.nickname ? (
                    <span>"{peer.nickname}"</span>
                  ) : (
                    <span className="text-muted font-normal text-sm italic">
                      (No nickname set)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onPress={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
