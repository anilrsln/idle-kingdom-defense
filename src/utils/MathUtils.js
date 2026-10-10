/** Upgrade maliyeti: baseCost × (costMultiplier ^ currentLevel) */
export function calculateUpgradeCost(baseCost, costMultiplier, currentLevel) {
  return Math.floor(baseCost * Math.pow(costMultiplier, currentLevel));
}

/** Stat değeri: baseValue × (multiplier ^ currentLevel) */
export function calculateValue(baseValue, multiplier, currentLevel) {
  return baseValue * Math.pow(multiplier, currentLevel);
}

/** Düşman HP: baseHP × (hpScaling ^ (wave-1)) */
export function calculateEnemyHP(baseHP, hpScaling, waveNumber) {
  return Math.floor(baseHP * Math.pow(hpScaling, waveNumber - 1));
}

/** Düşman EXP: baseEXP × (expScaling ^ (wave-1)) */
export function calculateEnemyEXP(baseEXP, expScaling, waveNumber) {
  return Math.floor(baseEXP * Math.pow(expScaling, waveNumber - 1));
}

/** İki nokta arası mesafe */
export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/** Prestige çarpanı: 1 + (count × bonus) */
export function calculatePrestigeMultiplier(prestigeCount, bonusPerPrestige = 0.5) {
  return 1 + (prestigeCount * bonusPerPrestige);
}
