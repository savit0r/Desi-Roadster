/**
 * DESI ROADSTER - JUGAAD UPGRADE SHOP & ECONOMY SYSTEM
 * Manages permanent garage upgrades, coin currency persistence (localStorage),
 * per-run consumables (Pothole Shield), and vehicle performance modifiers.
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  const { Config } = window.DesiRoadster;

  class UpgradeManager {
    constructor() {
      this.storageKeyBank = 'desi_roadster_bank';
      this.storageKeyUpgrades = 'desi_roadster_upgrades';

      this.bank = this._loadBank();
      this.unlockedUpgrades = this._loadUpgrades();

      // Per-run transient consumable states
      this.potholeShieldCharges = 0;
      this.boosterCooldown = 0;
      this.hornCooldown = 0;
    }

    _loadBank() {
      try {
        const val = localStorage.getItem(this.storageKeyBank);
        return val ? parseInt(val, 10) || 0 : 0;
      } catch (e) {
        return 0;
      }
    }

    _saveBank() {
      try {
        localStorage.setItem(this.storageKeyBank, this.bank.toString());
      } catch (e) {}
    }

    _loadUpgrades() {
      try {
        const val = localStorage.getItem(this.storageKeyUpgrades);
        return val ? JSON.parse(val) : {};
      } catch (e) {
        return {};
      }
    }

    _saveUpgrades() {
      try {
        localStorage.setItem(this.storageKeyUpgrades, JSON.stringify(this.unlockedUpgrades));
      } catch (e) {}
    }

    addCoins(amount) {
      if (!amount || amount <= 0) return;
      this.bank += Math.floor(amount);
      this._saveBank();
    }

    getBank() {
      return this.bank;
    }

    hasUpgrade(id) {
      return !!this.unlockedUpgrades[id];
    }

    buyUpgrade(id) {
      const upgradeDef = Config.UPGRADES[id.toUpperCase()];
      if (!upgradeDef) return { success: false, reason: 'INVALID_UPGRADE' };

      if (this.hasUpgrade(id)) {
        return { success: false, reason: 'ALREADY_OWNED' };
      }

      if (this.bank < upgradeDef.cost) {
        return { success: false, reason: 'INSUFFICIENT_FUNDS' };
      }

      this.bank -= upgradeDef.cost;
      this.unlockedUpgrades[id] = {
        purchasedAt: Date.now(),
        level: 1
      };

      this._saveBank();
      this._saveUpgrades();
      return { success: true, upgrade: upgradeDef, remainingBank: this.bank };
    }

    /**
     * Initializes per-run charges when a new run begins
     */
    initRun() {
      this.potholeShieldCharges = this.hasUpgrade('shield') ? 2 : 0;
      this.boosterCooldown = 0;
      this.hornCooldown = 0;
    }

    consumePotholeShield() {
      if (this.potholeShieldCharges > 0) {
        this.potholeShieldCharges--;
        return true;
      }
      return false;
    }

    hasSuspension() {
      return this.hasUpgrade('suspension');
    }

    hasExtraBattery() {
      return this.hasUpgrade('battery');
    }

    hasRadar() {
      return this.hasUpgrade('radar');
    }

    hasHorn() {
      return this.hasUpgrade('horn');
    }

    hasBooster() {
      return this.hasUpgrade('booster');
    }
  }

  window.DesiRoadster.UpgradeManager = UpgradeManager;
})();
