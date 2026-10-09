import { useEffect, useRef } from "react";
import { onEmojiBurst, playEmojiPopSound } from "../../lib/emojiBurst";
import { useChatStore } from "../../store/useChatStore";

const CONFETTI_COLORS = [
  "#FF2D55", // Apple pink
  "#FF9500", // Apple orange
  "#FFCC00", // Apple yellow
  "#34C759", // Apple green
  "#007AFF", // Apple blue
  "#5856D6", // Apple indigo
  "#AF52DE", // Apple purple
];

const HEART_EMOJIS = new Set(["❤️", "❤", "💖", "💕", "💘", "💓", "💗", "💞", "🥰", "😍"]);
const FIRE_EMOJIS = new Set(["🔥"]);
const CONFETTI_EMOJIS = new Set(["🎉", "🥳", "🎊", "🍾"]);
const WATER_EMOJIS = new Set(["😂", "😭", "🤣", "🥺", "💦", "💧"]);
const STAR_EMOJIS = new Set(["⭐", "✨", "🌟", "💫"]);

function drawHeart(ctx, x, y, size, alpha) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = "#FF2D55";
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  // top left curve
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  // bottom left curve
  ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 2, x, y + size);
  // bottom right curve
  ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
  // top right curve
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx, x, y, size, alpha, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  const spikes = 4;
  const outerRadius = size;
  const innerRadius = size * 0.35;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function EmojiParticleCanvas() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age++;
        p.alpha -= p.decay;

        if (p.type === "heart") {
          p.x += Math.sin(p.age * 0.08 + p.seed) * 1.5;
          p.y += p.vy;
          p.vy *= 0.98;
          drawHeart(ctx, p.x, p.y, p.size, p.alpha);
        } else if (p.type === "fire") {
          p.x += (Math.random() - 0.5) * 1.2;
          p.y += p.vy;
          p.size *= 0.97;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.type === "confetti") {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.25; // gravity
          p.rot += p.vrot;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(Math.cos(p.age * 0.1), 1);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        } else if (p.type === "star") {
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vrot;
          drawStar(ctx, p.x, p.y, p.size, p.alpha, p.rot);
        } else if (p.type === "water") {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35; // gravity arc
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Default: radial burst of mini emoji characters + sparkles
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.rot += p.vrot;

          if (p.char) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.font = `${p.size}px -apple-system, BlinkMacSystemFont, "Apple Color Emoji", "SF Pro", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.char, 0, 0);
            ctx.restore();
          } else {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if (p.alpha <= 0 || p.age > p.maxLife || p.y > window.innerHeight + 50) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0) {
        animFrameRef.current = requestAnimationFrame(updateAndDraw);
      } else {
        animFrameRef.current = null;
      }
    };

    const spawnParticles = ({ emoji, x, y, isRemote }) => {
      if (!isRemote && isSoundEnabled) {
        playEmojiPopSound();
      }

      const spawnX = typeof x === "number" && !isNaN(x) ? x : window.innerWidth / 2;
      const spawnY = typeof y === "number" && !isNaN(y) ? y : window.innerHeight / 2;

      const newParticles = [];
      const isHeart = HEART_EMOJIS.has(emoji);
      const isFire = FIRE_EMOJIS.has(emoji);
      const isConfetti = CONFETTI_EMOJIS.has(emoji);
      const isWater = WATER_EMOJIS.has(emoji);
      const isStar = STAR_EMOJIS.has(emoji);

      if (isHeart) {
        // Floating upward hearts
        const count = 16;
        for (let i = 0; i < count; i++) {
          newParticles.push({
            type: "heart",
            x: spawnX + (Math.random() - 0.5) * 36,
            y: spawnY + (Math.random() - 0.5) * 20,
            vy: -(Math.random() * 2.8 + 2.2),
            size: Math.random() * 14 + 14,
            alpha: 1,
            decay: Math.random() * 0.015 + 0.012,
            age: 0,
            seed: Math.random() * 100,
            maxLife: 90,
          });
        }
      } else if (isFire) {
        // Rising fire ember sparks
        const count = 22;
        for (let i = 0; i < count; i++) {
          const colors = ["#FF3B30", "#FF9500", "#FFCC00", "#FF453A"];
          newParticles.push({
            type: "fire",
            x: spawnX + (Math.random() - 0.5) * 30,
            y: spawnY + (Math.random() - 0.5) * 20,
            vy: -(Math.random() * 3.5 + 2),
            size: Math.random() * 7 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            decay: Math.random() * 0.02 + 0.015,
            age: 0,
            maxLife: 70,
          });
        }
      } else if (isConfetti) {
        // Exploding colorful confetti
        const count = 26;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 7 + 3;
          newParticles.push({
            type: "confetti",
            x: spawnX,
            y: spawnY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            rot: Math.random() * Math.PI,
            vrot: (Math.random() - 0.5) * 0.25,
            size: Math.random() * 8 + 8,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            alpha: 1,
            decay: Math.random() * 0.015 + 0.01,
            age: 0,
            maxLife: 90,
          });
        }
      } else if (isWater) {
        // Fountain splash droplets
        const count = 20;
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.8;
          const speed = Math.random() * 6 + 3.5;
          newParticles.push({
            type: "water",
            x: spawnX,
            y: spawnY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 4 + 3,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.012,
            age: 0,
            maxLife: 75,
          });
        }
      } else if (isStar) {
        // Sparkling stars
        const count = 18;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          newParticles.push({
            type: "star",
            x: spawnX,
            y: spawnY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 8 + 6,
            rot: Math.random() * Math.PI,
            vrot: (Math.random() - 0.5) * 0.2,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.012,
            age: 0,
            maxLife: 70,
          });
        }
      } else {
        // Radial burst of mini emoji chars + glowing specks
        const count = 12;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
          const speed = Math.random() * 4 + 3;
          newParticles.push({
            type: "generic",
            char: emoji || "✨",
            x: spawnX,
            y: spawnY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 6 + 14,
            rot: 0,
            vrot: (Math.random() - 0.5) * 0.15,
            alpha: 1,
            decay: Math.random() * 0.018 + 0.014,
            age: 0,
            maxLife: 65,
          });
        }
        // Add 10 micro-sparkles
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 6 + 2;
          newParticles.push({
            type: "generic",
            color: "#60a5fa",
            x: spawnX,
            y: spawnY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 3 + 2,
            alpha: 1,
            decay: 0.025,
            age: 0,
            maxLife: 50,
          });
        }
      }

      particlesRef.current.push(...newParticles);

      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(updateAndDraw);
      }
    };

    const unsubscribe = onEmojiBurst(spawnParticles);

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSoundEnabled]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden="true"
    />
  );
}
