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

/**
 * Triggers a celebration burst from the sides
 */
export const triggerCelebration = () => {
  const duration = 2000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval: any = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // since particles fall down, start a bit higher than random
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
};
