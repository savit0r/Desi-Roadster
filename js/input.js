/**
 * DESI ROADSTER - UNIFIED INPUT HANDLER
 * Manages continuous keyboard states, single-press action triggers,
 * and multi-touch mobile on-screen buttons (D-pad & action triggers).
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  class InputHandler {
    constructor() {
      // Keyboard states
      this.keys = new Set();
      this.justPressedKeys = new Set();
      this.justReleasedKeys = new Set();

      // Mobile / Virtual Touch button states
      this.virtualActions = new Set();
      this.justPressedVirtual = new Set();

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

      this._initKeyboardListeners();
      this._initTouchListeners();
    }

    _initKeyboardListeners() {
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
        this.virtualActions.clear();
        this.justPressedVirtual.clear();
      });
    }

    _initTouchListeners() {
      // Bind to all on-screen touch buttons using Pointer Events for multi-touch support
      const bindButtons = () => {
        const touchButtons = document.querySelectorAll('.touch-btn[data-action]');
        touchButtons.forEach(btn => {
          const action = btn.getAttribute('data-action');
          if (!action) return;

          const handleDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.add('pressed');
            this.setVirtualAction(action, true);
            if (navigator.vibrate) {
              navigator.vibrate(10); // Subtle haptic tap
            }
          };

          const handleUp = (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.classList.remove('pressed');
            this.setVirtualAction(action, false);
          };

          // Pointer events handle both mobile touch and desktop mouse clicking seamlessly
          btn.addEventListener('pointerdown', handleDown, { passive: false });
          btn.addEventListener('pointerup', handleUp, { passive: false });
          btn.addEventListener('pointercancel', handleUp, { passive: false });
          btn.addEventListener('pointerleave', handleUp, { passive: false });
        });
      };

      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', bindButtons);
      } else {
        bindButtons();
      }
    }

    /**
     * Sets virtual action state from mobile touch controls
     */
    setVirtualAction(action, isDown) {
      if (isDown) {
        if (!this.virtualActions.has(action)) {
          this.justPressedVirtual.add(action);
        }
        this.virtualActions.add(action);
      } else {
        this.virtualActions.delete(action);
      }
    }

    /**
     * Checks if an action is currently held down (Keyboard OR Touch)
     * @param {string} action - 'up' | 'down' | 'left' | 'right' | 'jump' etc.
     */
    isDown(action) {
      if (this.virtualActions.has(action)) return true;
      const mapped = this.actionMap[action];
      if (!mapped) return false;
      return mapped.some(code => this.keys.has(code));
    }

    /**
     * Checks if an action was just pressed in this frame (Keyboard OR Touch)
     * @param {string} action 
     */
    isJustPressed(action) {
      if (this.justPressedVirtual.has(action)) return true;
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
      this.justPressedVirtual.clear();
    }
  }

  window.DesiRoadster.InputHandler = InputHandler;
})();
