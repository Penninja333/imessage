// Audio synthesizer for crisp iOS-like emoji pop sound
let audioCtx = null;

export function playEmojiPopSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;

    // High crisp pop click
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    // Pitch drops from 680Hz to 160Hz for bubbly pop
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    // Quick attack and decay
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    // AudioContext blocked or not supported
  }
}

// Particle burst listener registry
const burstListeners = new Set();

export function onEmojiBurst(callback) {
  burstListeners.add(callback);
  return () => burstListeners.delete(callback);
}

export function triggerEmojiBurst(data) {
  burstListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (err) {
      console.warn("Error in emoji burst listener:", err);
    }
  });
}

// Mount globally so socket listeners and store can invoke without circular imports
if (typeof window !== "undefined") {
  window.__triggerEmojiBurst = triggerEmojiBurst;
}
