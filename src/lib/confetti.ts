import confetti from "canvas-confetti";

/**
 * Triggers a confetti burst from a specific origin (0-1 coordinates)
 */
export const triggerConfetti = (x = 0.5, y = 0.5) => {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0.5,
    decay: 0.94,
    startVelocity: 30,
    shapes: ["star"],
    colors: ["#FFE83F", "#FF705B", "#443DFF", "#FF99AA", "#00C16A"],
  };

  const particleCount = 40;

  confetti({
    ...defaults,
    particleCount,
    scalar: 1.2,
    shapes: ["star"],
    origin: { x, y },
  });

  confetti({
    ...defaults,
    particleCount: 10,
    scalar: 0.75,
    shapes: ["circle"],
    origin: { x, y },
  });
};

