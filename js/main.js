/**
 * DESI ROADSTER - APPLICATION ENTRYPOINT
 * Handles initialization, responsive aspect ratio sizing, and kickstarts the loop.
 */

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const container = document.getElementById('game-container');

  if (!canvas || !container) {
    console.error('Fatal: Game canvas or container element not found.');
    return;
  }

  // Create game instance
  const game = new window.DesiRoadster.Game(canvas);

  // Sync exact viewport dimensions to CSS variables (fixes mobile 100vh toolbar clipping)
  function syncViewportDimensions() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    document.documentElement.style.setProperty('--app-width', `${window.innerWidth}px`);
  }

  // Resize handler to ensure sharp rendering and proper letterboxing
  function handleResize() {
    syncViewportDimensions();

    // Keep canvas drawing buffer at crisp internal resolution
    const virtualW = window.DesiRoadster.Config.CANVAS_WIDTH;
    const virtualH = window.DesiRoadster.Config.CANVAS_HEIGHT;

    // Set internal resolution once
    if (canvas.width !== virtualW || canvas.height !== virtualH) {
      canvas.width = virtualW;
      canvas.height = virtualH;
    }
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
  }
  handleResize();

  // Kickstart game loop
  game.run();
});
