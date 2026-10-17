/**
 * DESI ROADSTER - INPUT HANDLER
 * Manages continuous keyboard states and single-press action triggers.
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  class InputHandler {
    constructor() {
      // Current continuous key states
      this.keys = new Set();
      // Single frame trigger tracking
      this.justPressedKeys = new Set();
      this.justReleasedKeys = new Set();

      // Action mappings
      this.actionMap = {
        up: ['ArrowUp', 'KeyW'],
        down: ['ArrowDown', 'KeyS'],
        left: ['ArrowLeft', 'KeyA'],
        right: ['ArrowRight', 'KeyD'],
        jump: ['Space'],
        toggleFlight: ['KeyF', 'ShiftLeft', 'ShiftRight'],
        pause: ['KeyP', 'Escape'],
        start: ['Space', 'Enter'],
        restart: ['KeyR', 'Space', 'Enter'],
        mute: ['KeyM']
      };

      this._initListeners();
    }

    _initListeners() {
      window.addEventListener('keydown', (e) => {
        // Prevent default scrolling for game keys
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }

        if (!this.keys.has(e.code)) {
          this.justPressedKeys.add(e.code);
        }
        this.keys.add(e.code);
      });

      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
        this.justReleasedKeys.add(e.code);
      });

      // Clear stuck keys if window loses focus
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.justPressedKeys.clear();
        this.justReleasedKeys.clear();
      });
    }

    /**
     * Checks if an action is currently held down
     * @param {string} action - 'up' | 'down' | 'left' | 'right' | 'jump' etc.
     */
    isDown(action) {
      const mapped = this.actionMap[action];
      if (!mapped) return false;
      return mapped.some(code => this.keys.has(code));
    }

    /**
     * Checks if an action was just pressed in this frame
     * @param {string} action 
     */
    isJustPressed(action) {
      const mapped = this.actionMap[action];
      if (!mapped) return false;
      return mapped.some(code => this.justPressedKeys.has(code));
    }

    /**
     * Must be called at the end of each game loop tick
     */
    update() {
      this.justPressedKeys.clear();
      this.justReleasedKeys.clear();
    }
  }

  window.DesiRoadster.InputHandler = InputHandler;
})();
