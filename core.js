import { AudioManager } from './audio.js';
import { showBanner, showMilestone, hideBanner, showScore, showGameOverBanner, showMilestoneBanner, showCountdownBanner, showStartBanner, showResetBanner } from './ui.js';

// --- Game Constants ---
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;
export const GROUND_HEIGHT = 80;
export const PIPE_WIDTH = 60;
export const PIPE_GAP_START = 220;
export const PIPE_GAP_MIN = 140;
export const PIPE_MIN = 80;
export const PIPE_MAX = GAME_HEIGHT - GROUND_HEIGHT - PIPE_GAP_START - 40;
export const PIPE_SPEED_START = 1.6;
export const PIPE_SPEED_INC = 0.15;
export const PIPE_FREQ_START = 1800;
export const PIPE_FREQ_MIN = 900;
export const GRAVITY = 0.38;
export const FLAP_VELOCITY = -7.2;
export const MAX_DROP = 10.5;
export const MAN_X = GAME_WIDTH * 0.25;
export const MAN_RADIUS = 28;
export const ANIM_FREQ = 60;
export const MILESTONES = [5, 10, 20, 50, 100];
export const DIFFICULTY_INTERVAL = 20;
export const COLOR_TESTING_MODE = false;

// --- Game State ---
function getState() {
  return canvas.dataset.gameState || 'init';
}

function setState(newState) {
  canvas.dataset.gameState = newState;
  console.log('State changed to:', newState);
}

// Export state functions for external use
export function getGameState() {
  return getState();
}

export function setGameState(newState) {
  setState(newState);
}

export let score = 0;
export let highScore = parseInt(localStorage.getItem('flappyManHighScore') || '0', 10);
export let pipes = [];
export let pipeSpeed = PIPE_SPEED_START;
export let pipeFreq = PIPE_FREQ_START;
export let pipeGap = PIPE_GAP_START;
export let pipeCount = 0;
export let difficultyLevel = 0;
export let lastPipeTime = 0;
export let man = null;
export let animTimer = 0;
export let milestoneIdx = 0;
export let bannerTimeout = null;
export let countdown = 3;
export let countdownTimer = null;
export let touchFlap = false;

// --- DOM Elements ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreBubble = document.getElementById('score-bubble');
const milestoneBanner = document.getElementById('milestone-banner');
const banner = document.getElementById('banner');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameContainer = document.getElementById('game-container');
const highScoreBubble = document.getElementById('high-score-bubble');

// --- Utility Functions ---
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// --- Game Classes ---
export class Pipe {
  constructor(x, gapY, variant = 'normal') {
    this.x = x;
    this.gapY = gapY;
    this.gapSize = pipeGap;
    this.passed = false;
    this.variant = variant;
    this.animOffset = Math.random() * Math.PI * 2;
    this.pulsePhase = 0;
    this.colorTheme = this.getColorTheme();
  }
  
  update(dt) {
    this.x -= pipeSpeed * dt / 16.67;
    this.pulsePhase += dt / 200;
  }
  
  getColorTheme() {
    const colorThemes = [
      { name: 'forest_green', hue: 120, saturation: 60, lightness: 42 },
      { name: 'ocean_blue', hue: 210, saturation: 55, lightness: 48 },
      { name: 'earth_brown', hue: 25, saturation: 45, lightness: 40 },
      { name: 'slate_gray', hue: 200, saturation: 25, lightness: 45 },
      { name: 'deep_purple', hue: 270, saturation: 50, lightness: 45 },
      { name: 'teal', hue: 180, saturation: 50, lightness: 45 },
      { name: 'coral', hue: 15, saturation: 60, lightness: 55 },
      { name: 'sage', hue: 90, saturation: 35, lightness: 48 }
    ];
    
    if (COLOR_TESTING_MODE) {
      return colorThemes[Math.floor(Math.random() * colorThemes.length)];
    } else {
      const availableColors = Math.min(difficultyLevel + 1, colorThemes.length);
      return colorThemes[Math.floor(Math.random() * availableColors)];
    }
  }
  
  draw(ctx) {
    ctx.save();
    
    let wiggle = 0;
    let colorShift = 0;
    let glowIntensity = 0;
    
    switch(this.variant) {
      case 'wiggle':
        wiggle = Math.sin(this.pulsePhase + this.animOffset) * 3;
        break;
      case 'pulse':
        const pulse = (Math.sin(this.pulsePhase * 2) + 1) * 0.5;
        glowIntensity = pulse * 0.3;
        break;
      case 'rainbow':
        colorShift = Math.sin(this.pulsePhase) * 30;
        break;
    }
    
    const baseHue = this.colorTheme.hue + colorShift;
    const baseColor = `hsl(${baseHue}, ${this.colorTheme.saturation}%, ${this.colorTheme.lightness}%)`;
    const highlightColor = `hsl(${baseHue}, ${this.colorTheme.saturation - 10}%, ${this.colorTheme.lightness + 20}%)`;
    const darkColor = `hsl(${baseHue}, ${this.colorTheme.saturation + 10}%, ${this.colorTheme.lightness - 20}%)`;
    
    const gradient = ctx.createLinearGradient(this.x, 0, this.x + PIPE_WIDTH, 0);
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(0.3, highlightColor);
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, darkColor);
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 3;
    
    if (glowIntensity > 0) {
      ctx.shadowColor = highlightColor;
      ctx.shadowBlur = 15 * glowIntensity;
    }
    
    // Top pipe
    ctx.beginPath();
    ctx.roundRect(this.x + wiggle, 0, PIPE_WIDTH, this.gapY, [0, 0, 15, 15]);
    ctx.fill();
    ctx.stroke();
    
    // Bottom pipe
    ctx.beginPath();
    ctx.roundRect(this.x + wiggle, this.gapY + this.gapSize, PIPE_WIDTH, 
                 GAME_HEIGHT - GROUND_HEIGHT - this.gapY - this.gapSize, [15, 15, 0, 0]);
    ctx.fill();
    ctx.stroke();
    
    // Pipe caps
    ctx.shadowBlur = 0;
    ctx.fillStyle = highlightColor;
    ctx.fillRect(this.x - 5 + wiggle, this.gapY - 20, PIPE_WIDTH + 10, 20);
    ctx.fillRect(this.x - 5 + wiggle, this.gapY + this.gapSize, PIPE_WIDTH + 10, 20);
    ctx.strokeRect(this.x - 5 + wiggle, this.gapY - 20, PIPE_WIDTH + 10, 20);
    ctx.strokeRect(this.x - 5 + wiggle, this.gapY + this.gapSize, PIPE_WIDTH + 10, 20);
    
    ctx.restore();
  }
  
  collides(man) {
    if (
      man.x + MAN_RADIUS > this.x &&
      man.x - MAN_RADIUS < this.x + PIPE_WIDTH
    ) {
      if (man.y - MAN_RADIUS < this.gapY || man.y + MAN_RADIUS > this.gapY + this.gapSize) {
        return true;
      }
    }
    return false;
  }
}

export class Man {
  constructor() {
    this.x = MAN_X;
    this.y = GAME_HEIGHT / 2;
    this.vy = 0;
    this.animPhase = 0;
    this.flapAnim = 0;
    this.rotation = 0;
  }
  
  flap() {
    this.vy = FLAP_VELOCITY;
    this.flapAnim = 1.0;
  }
  
  update(dt) {
    this.vy += GRAVITY * dt / 16.67;
    this.vy = clamp(this.vy, -12, MAX_DROP);
    this.y += this.vy * dt / 16.67;
    this.y = clamp(this.y, MAN_RADIUS, GAME_HEIGHT - GROUND_HEIGHT - MAN_RADIUS);
    
    this.animPhase += dt / ANIM_FREQ;
    if (this.flapAnim > 0) this.flapAnim -= dt / 120;
    else this.flapAnim = 0;
    
    this.rotation = clamp(this.vy * 0.07, -0.45, 0.55);
  }
  
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    // --- Draw body parts using CSS-like colors ---
    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(0, MAN_RADIUS + 12, MAN_RADIUS * 0.9, 8, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();
    // Torso with gradient and details
    ctx.save();
    const torsoGrad = ctx.createLinearGradient(-18, -10, 18, 30);
    torsoGrad.addColorStop(0, '#2196f3');
    torsoGrad.addColorStop(0.3, '#2196f3');
    torsoGrad.addColorStop(1, '#1565c0');
    ctx.beginPath();
    ctx.ellipse(0, 10, 18, 28, 0, 0, 2 * Math.PI);
    ctx.fillStyle = torsoGrad;
    ctx.fill();
    // Shirt details
    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 5, 12, 2, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
    // Head with enhanced features
    ctx.save();
    // Head shadow for depth
    ctx.beginPath();
    ctx.arc(1, -20, 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#e0a060';
    ctx.fill();
    // Main head
    ctx.beginPath();
    ctx.arc(0, -22, 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffcc80';
    ctx.fill();
    // Hair with highlights
    ctx.beginPath();
    ctx.arc(0, -28, 10, Math.PI * 1.1, Math.PI * 1.9, false);
    ctx.lineTo(0, -22);
    ctx.closePath();
    ctx.fillStyle = '#6d4c41';
    ctx.fill();
    // Hair highlights
    ctx.beginPath();
    ctx.arc(-3, -30, 4, Math.PI * 1.2, Math.PI * 1.6, false);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8d6e63';
    ctx.stroke();
    // Eyes with highlights
    ctx.beginPath();
    ctx.arc(-5, -25, 2.2, 0, 2 * Math.PI);
    ctx.arc(5, -25, 2.2, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    // Eye highlights
    ctx.beginPath();
    ctx.arc(-4, -26, 0.8, 0, 2 * Math.PI);
    ctx.arc(6, -26, 0.8, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // Enhanced mouth
    ctx.beginPath();
    ctx.arc(0, -16, 4, Math.PI * 0.1, Math.PI * 1.0, false);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#e53935';
    ctx.stroke();
    ctx.restore();
    // Arms (animated) with black sleeves and skin hands
    for (let i = 0; i < 2; i++) {
      ctx.save();
      const side = i === 0 ? -1 : 1;
      let swing = Math.sin(this.animPhase * 1.5 + i * Math.PI) * 0.5 + (this.flapAnim * 0.7);
      ctx.rotate(side * (0.5 + swing * 0.5));
      
      // Black sleeve/arm
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * 22, 18);
      ctx.lineWidth = 7.5;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Skin-colored hand/palm
      ctx.beginPath();
      ctx.arc(side * 22, 18, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffcc80';
      ctx.fill();
      ctx.restore();
    }
    // Legs with enhanced styling
    for (let i = 0; i < 2; i++) {
      ctx.save();
      const side = i === 0 ? -1 : 1;
      let kick = Math.sin(this.animPhase * 1.2 + i * Math.PI) * 0.5 - (this.flapAnim * 0.5);
      ctx.rotate(side * (0.25 + kick * 0.4));
      
      // Leg gradient
      const legGrad = ctx.createLinearGradient(0, 28, side * 13, 48);
      legGrad.addColorStop(0, '#424242');
      legGrad.addColorStop(1, '#212121');
      
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(side * 13, 48);
      ctx.lineWidth = 8.5;
      ctx.strokeStyle = legGrad;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Enhanced shoe with gradient
      const shoeGrad = ctx.createRadialGradient(side * 13, 48, 2, side * 13, 48, 6);
      shoeGrad.addColorStop(0, '#a1887f');
      shoeGrad.addColorStop(1, '#795548');
      
      ctx.beginPath();
      ctx.arc(side * 13, 48, 6, 0, 2 * Math.PI);
      ctx.fillStyle = shoeGrad;
      ctx.fill();
      
      // Shoe sole
      ctx.beginPath();
      ctx.ellipse(side * 13, 52, 7, 2, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#795548';
      ctx.fill();
      
      ctx.restore();
    }
    ctx.restore();
  }
}

// --- Game Logic ---
export function _resetGameState(showStartUI) {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (bannerTimeout) { clearTimeout(bannerTimeout); bannerTimeout = null; }

  setState('init');
  score = 0;
  pipes = [];
  pipeSpeed = PIPE_SPEED_START;
  pipeFreq = PIPE_FREQ_START;
  pipeGap = PIPE_GAP_START;
  pipeCount = 0;
  difficultyLevel = 0;
  lastPipeTime = 0;
  milestoneIdx = 0;
  countdown = 3;
  animTimer = 0;
  touchFlap = false;
  man = new Man();
  man.x = MAN_X;
  man.y = GAME_HEIGHT / 2;
  man.vy = 0;
  man.animPhase = 0;
  man.flapAnim = 0;
  man.rotation = 0;

  showScore();
  hideBanner();
  if (showStartUI) {
    showStartBanner();
    startBtn.style.display = '';
  } else {
    startBtn.style.display = 'none';
  }
  restartBtn.style.display = 'none';

  // Update score display
  scoreBubble.textContent = score;
  highScoreBubble.textContent = highScore;

  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  draw();
}

export function resetGame() { 
  _resetGameState(true); 
}

export function startCountdown() {
  setState('countdown');
  window.analytics && window.analytics.track('game_start_countdown');
  countdown = 3;
  showCountdownBanner(countdown);
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  countdownTimer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      showCountdownBanner(countdown);
    } else if (countdown === 0) {
      showCountdownBanner('GO!');
      setTimeout(() => {
        clearInterval(countdownTimer);
        hideBanner();
        startGame();
      }, 500);
    }
  }, 700);
}

export function startGame() {
  setState('running');
  lastPipeTime = performance.now();
  hideBanner();
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  AudioManager.init();
}

export function gameOver() {
  setState('gameover');
  window.analytics && window.analytics.track('game_over', { score: score, highScore: highScore });
  try { AudioManager.playHit(); } catch (e) {}
  
  // Save to leaderboard
  let leaderboard = JSON.parse(localStorage.getItem('flappyManLeaderboard') || '[]');
  leaderboard.push(score);
  leaderboard.sort((a, b) => b - a);
  leaderboard = leaderboard.slice(0, 10);
  localStorage.setItem('flappyManLeaderboard', JSON.stringify(leaderboard));
  
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('flappyManHighScore', String(highScore));
    showBanner(`New High Score: ${highScore}!`, 1800);
    window.analytics && window.analytics.track('new_high_score', { score: highScore });
  } else {
    showGameOverBanner();
  }
  restartBtn.style.display = '';
  startBtn.style.display = 'none';
  scoreBubble.textContent = score;
  highScoreBubble.textContent = highScore;
}

export function restartGame() {
  _resetGameState(true);
}

export function updateDifficulty() {
  const newDifficultyLevel = Math.floor(pipeCount / DIFFICULTY_INTERVAL);
  
  if (newDifficultyLevel > difficultyLevel) {
    difficultyLevel = newDifficultyLevel;
    pipeSpeed = PIPE_SPEED_START + (difficultyLevel * PIPE_SPEED_INC);
    pipeFreq = Math.max(PIPE_FREQ_MIN, PIPE_FREQ_START - (difficultyLevel * 100));
    pipeGap = Math.max(PIPE_GAP_MIN, PIPE_GAP_START - (difficultyLevel * 8));
    
    if (difficultyLevel > 0) {
      showDifficultyBanner(difficultyLevel);
    }
  }
}

export function getPipeVariant() {
  const rand = Math.random();
  if (rand < 0.15) return 'wiggle';
  if (rand < 0.25) return 'pulse';
  if (rand < 0.35) return 'rainbow';
  if (rand < 0.4) return 'narrow';
  return 'normal';
}

export function showDifficultyBanner(level) {
  const messages = [
    '', 
    'Getting Warmer!',
    'Picking Up Speed!',
    'Things Get Interesting...',
    'Visual Chaos Begins!',
    'Maximum Difficulty!'
  ];
  
  if (level < messages.length) {
    showMilestone(messages[level]);
  }
}

export function flap() {
  if (getState() === 'running') {
    man.flap();
    try { AudioManager.playFlap(); } catch(e) {}
  }
}

export function update(dt) {
  const currentState = getState();
  
  if (currentState === 'init') {
    return;
  }
  
  if (currentState === 'countdown') {
    man.animPhase += dt / ANIM_FREQ;
    if (man.flapAnim > 0) man.flapAnim -= dt / 120;
    else man.flapAnim = 0;
    return;
  }
  
  if (currentState === 'paused') {
    man.animPhase += dt / (ANIM_FREQ * 1.2);
    return;
  }
  
  if (currentState === 'running') {
    man.update(dt);
    
    for (let pipe of pipes) pipe.update(dt);
    pipes = pipes.filter(p => p.x + PIPE_WIDTH > 0);
    
    if (performance.now() - lastPipeTime > pipeFreq) {
      let gapY = PIPE_MIN + Math.random() * (PIPE_MAX - PIPE_MIN);
      const maxGapY = GAME_HEIGHT - GROUND_HEIGHT - pipeGap - 40;
      if (gapY > maxGapY) gapY = maxGapY;
      
      const variant = getPipeVariant();
      if (variant === 'narrow') {
        const narrowPipe = new Pipe(GAME_WIDTH, gapY, variant);
        narrowPipe.gapSize = Math.max(120, pipeGap - 20);
        pipes.push(narrowPipe);
      } else {
        pipes.push(new Pipe(GAME_WIDTH, gapY, variant));
      }
      lastPipeTime = performance.now();
      pipeCount++;
      updateDifficulty();
    }
    
    for (let pipe of pipes) {
      if (pipe.collides(man)) {
        gameOver();
        return;
      }
    }
    
    if (man.y + MAN_RADIUS >= GAME_HEIGHT - GROUND_HEIGHT) {
      gameOver();
      return;
    }
    
    for (let pipe of pipes) {
      if (!pipe.passed && pipe.x + PIPE_WIDTH < man.x) {
        pipe.passed = true;
        score++;
        scoreBubble.textContent = score;
        window.analytics && window.analytics.track('score_point', { score: score });
        try { AudioManager.playScore(); } catch(e) {}
        if (milestoneIdx < MILESTONES.length && score === MILESTONES[milestoneIdx]) {
          showMilestoneBanner(score);
          window.analytics && window.analytics.track('milestone', { score: score, milestone: milestoneIdx });
          milestoneIdx++;
        }
      }
    }
  }
}

export function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const time = performance.now() * 0.0001;
  
  // Enhanced forest landscape background
  ctx.save();
  
  // Sky gradient
  let skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT * 0.6);
  skyGrad.addColorStop(0, '#87ceeb');
  skyGrad.addColorStop(0.15, '#9dd4f2');
  skyGrad.addColorStop(0.3, '#b8e6ff');
  skyGrad.addColorStop(0.6, '#cef0ff');
  skyGrad.addColorStop(0.85, '#e1f5fe');
  skyGrad.addColorStop(1, '#f0f9ff');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.6);
  
  // Mountains layers
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#2c5f2d';
  const distantOffset = Math.sin(time * 0.6) * (GAME_WIDTH * 0.005);
  ctx.beginPath();
  ctx.moveTo(0 + distantOffset, GAME_HEIGHT * 0.35);
  ctx.lineTo(GAME_WIDTH * 0.2 + distantOffset, GAME_HEIGHT * 0.25);
  ctx.lineTo(GAME_WIDTH * 0.4 + distantOffset, GAME_HEIGHT * 0.3);
  ctx.lineTo(GAME_WIDTH * 0.7 + distantOffset, GAME_HEIGHT * 0.2);
  ctx.lineTo(GAME_WIDTH + distantOffset, GAME_HEIGHT * 0.28);
  ctx.lineTo(GAME_WIDTH + distantOffset, GAME_HEIGHT * 0.6);
  ctx.lineTo(0 + distantOffset, GAME_HEIGHT * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  
  // Mid-range mountains
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#3e7b40';
  const midOffset = Math.sin(time * 0.9 + 0.5) * (GAME_WIDTH * 0.01);
  ctx.beginPath();
  ctx.moveTo(0 + midOffset, GAME_HEIGHT * 0.45);
  ctx.lineTo(GAME_WIDTH * 0.15 + midOffset, GAME_HEIGHT * 0.35);
  ctx.lineTo(GAME_WIDTH * 0.35 + midOffset, GAME_HEIGHT * 0.4);
  ctx.lineTo(GAME_WIDTH * 0.6 + midOffset, GAME_HEIGHT * 0.3);
  ctx.lineTo(GAME_WIDTH * 0.85 + midOffset, GAME_HEIGHT * 0.38);
  ctx.lineTo(GAME_WIDTH + midOffset, GAME_HEIGHT * 0.42);
  ctx.lineTo(GAME_WIDTH + midOffset, GAME_HEIGHT * 0.6);
  ctx.lineTo(0 + midOffset, GAME_HEIGHT * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  
  // Foreground hills
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#4a9d4e';
  const frontOffset = Math.sin(time * 1.2 + 1.2) * (GAME_WIDTH * 0.02);
  ctx.beginPath();
  ctx.moveTo(0 + frontOffset, GAME_HEIGHT * 0.55);
  ctx.lineTo(GAME_WIDTH * 0.25 + frontOffset, GAME_HEIGHT * 0.45);
  ctx.lineTo(GAME_WIDTH * 0.5 + frontOffset, GAME_HEIGHT * 0.5);
  ctx.lineTo(GAME_WIDTH * 0.75 + frontOffset, GAME_HEIGHT * 0.4);
  ctx.lineTo(GAME_WIDTH + frontOffset, GAME_HEIGHT * 0.48);
  ctx.lineTo(GAME_WIDTH + frontOffset, GAME_HEIGHT * 0.6);
  ctx.lineTo(0 + frontOffset, GAME_HEIGHT * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  
  // Trees
  for (let i = 0; i < 8; i++) {
    ctx.save();
    const treeX = (GAME_WIDTH / 8) * i + (i * 20);
    const treeY = GAME_HEIGHT * (0.45 + Math.sin(i) * 0.05);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#1b4332';
    drawPineTree(ctx, treeX, treeY, 15, 35);
    ctx.restore();
  }
  
  for (let i = 0; i < 6; i++) {
    ctx.save();
    const treeX = (GAME_WIDTH / 6) * i + (i * 30) + 40;
    const treeY = GAME_HEIGHT * (0.5 + Math.sin(i * 1.5) * 0.03);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#2d5016';
    drawOakTree(ctx, treeX, treeY, 20, 45);
    ctx.restore();
  }
  
  for (let i = 0; i < 4; i++) {
    ctx.save();
    const treeX = (GAME_WIDTH / 4) * i + (i * 50) + 60;
    const treeY = GAME_HEIGHT * (0.52 + Math.sin(i * 2) * 0.02);
    ctx.globalAlpha = 0.8;
    drawBirchTree(ctx, treeX, treeY, 12, 50);
    ctx.restore();
  }
  
  ctx.restore();

  // Simple green gradient for mid-area
  ctx.save();
  const midGrad = ctx.createLinearGradient(0, GAME_HEIGHT * 0.60, 0, GAME_HEIGHT - GROUND_HEIGHT);
  midGrad.addColorStop(0, '#b8e0b2');
  midGrad.addColorStop(0.5, '#a4d49d');
  midGrad.addColorStop(1, '#8ac07f');
  ctx.fillStyle = midGrad;
  ctx.fillRect(0, GAME_HEIGHT * 0.60, GAME_WIDTH, (GAME_HEIGHT - GROUND_HEIGHT) - GAME_HEIGHT * 0.60);
  ctx.restore();
  
  // Pipes
  for (let pipe of pipes) pipe.draw(ctx);
  
  // Ground
  ctx.save();
  const groundGrad = ctx.createLinearGradient(0, GAME_HEIGHT - GROUND_HEIGHT, 0, GAME_HEIGHT);
  groundGrad.addColorStop(0, '#6d4c41');
  groundGrad.addColorStop(0.3, '#8d6e63');
  groundGrad.addColorStop(1, '#5d4037');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
  
  // Ground details
  ctx.fillStyle = '#4e342e';
  for (let i = 0; i < GAME_WIDTH; i += 25) {
    ctx.fillRect(i, GAME_HEIGHT - GROUND_HEIGHT + 8, 12, 4);
    ctx.fillRect(i + 10, GAME_HEIGHT - GROUND_HEIGHT + 20, 8, 3);
  }
  
  ctx.fillStyle = '#3e2723';
  for (let i = 0; i < GAME_WIDTH; i += 40) {
    ctx.beginPath();
    ctx.arc(i + 5, GAME_HEIGHT - GROUND_HEIGHT + 15, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
  
  // Man
  man.draw(ctx);
}

export function drawPineTree(ctx, x, y, width, height) {
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(x - 2, y, 4, height * 0.3);
  
  ctx.fillStyle = '#1b4332';
  for (let i = 0; i < 3; i++) {
    const layerY = y - (height * 0.25 * i);
    const layerWidth = width - (i * 3);
    ctx.beginPath();
    ctx.moveTo(x, layerY - height * 0.3);
    ctx.lineTo(x - layerWidth/2, layerY);
    ctx.lineTo(x + layerWidth/2, layerY);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawOakTree(ctx, x, y, width, height) {
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(x - 3, y, 6, height * 0.4);
  
  ctx.fillStyle = '#2d5016';
  ctx.beginPath();
  ctx.arc(x, y - height * 0.3, width/2, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(x - width/3, y - height * 0.2, width/3, 0, 2 * Math.PI);
  ctx.arc(x + width/3, y - height * 0.25, width/3, 0, 2 * Math.PI);
  ctx.fill();
}

export function drawBirchTree(ctx, x, y, width, height) {
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(x - 2, y, 4, height * 0.6);
  
  ctx.fillStyle = '#333';
  ctx.fillRect(x - 2, y + height * 0.1, 4, 2);
  ctx.fillRect(x - 2, y + height * 0.3, 4, 1);
  ctx.fillRect(x - 2, y + height * 0.45, 4, 2);
  
  ctx.fillStyle = '#66bb6a';
  ctx.beginPath();
  ctx.arc(x, y - height * 0.2, width/2, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.strokeStyle = '#66bb6a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - width/3, y - height * 0.15);
  ctx.quadraticCurveTo(x - width/2, y - height * 0.05, x - width/2.5, y);
  ctx.moveTo(x + width/3, y - height * 0.15);
  ctx.quadraticCurveTo(x + width/2, y - height * 0.05, x + width/2.5, y);
  ctx.stroke();
}

// --- Canvas Setup ---
export function resizeCanvas() {
  if (!window._assetsLoaded) {
    window._assetsLoaded = true;
  }
  const containerW = gameContainer.clientWidth;
  const containerH = gameContainer.clientHeight;
  const scale = Math.max(containerW / GAME_WIDTH, containerH / GAME_HEIGHT);
  const EPS = 1;
  let displayW = Math.round(GAME_WIDTH * scale) + EPS;
  let displayH = Math.round(GAME_HEIGHT * scale) + EPS;

  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';
  canvas.style.left = '50%';
  canvas.style.top = '50%';
  canvas.style.transform = 'translate(-50%,-50%)';

  const canvasRect = canvas.getBoundingClientRect();
  const ui = document.querySelector('.ui');
  if (ui) {
    const containerRect = gameContainer.getBoundingClientRect();
    ui.style.position = 'absolute';
    ui.style.left = (canvasRect.left - containerRect.left) + 'px';
    ui.style.top = (canvasRect.top - containerRect.top) + 'px';
    ui.style.width = canvasRect.width + 'px';
    ui.style.height = canvasRect.height + 'px';
    ui.style.pointerEvents = 'none';
    const interactive = ui.querySelectorAll('.btns, button');
    interactive.forEach(el => el.style.pointerEvents = 'auto');
    
    const uiScale = Math.max(0.55, Math.min(1.15, canvasRect.width / GAME_WIDTH));
    if (scoreBubble) {
      scoreBubble.style.fontSize = Math.round(20 * uiScale) + 'px';
      scoreBubble.style.padding = Math.round(10 * uiScale) + 'px ' + Math.round(14 * uiScale) + 'px';
      scoreBubble.style.minWidth = Math.round(48 * uiScale) + 'px';
      scoreBubble.style.borderRadius = Math.round(28 * uiScale) + 'px';
    }
    if (highScoreBubble) {
      highScoreBubble.style.fontSize = Math.round(20 * uiScale) + 'px';
      highScoreBubble.style.padding = Math.round(10 * uiScale) + 'px ' + Math.round(14 * uiScale) + 'px';
      highScoreBubble.style.minWidth = Math.round(48 * uiScale) + 'px';
      highScoreBubble.style.borderRadius = Math.round(28 * uiScale) + 'px';
    }
    if (startBtn) {
      startBtn.style.fontSize = Math.round(15 * uiScale) + 'px';
      startBtn.style.padding = Math.round(8 * uiScale) + 'px ' + Math.round(18 * uiScale) + 'px';
      startBtn.style.borderRadius = Math.round(26 * uiScale) + 'px';
    }
    if (restartBtn) {
      restartBtn.style.fontSize = Math.round(15 * uiScale) + 'px';
      restartBtn.style.padding = Math.round(8 * uiScale) + 'px ' + Math.round(18 * uiScale) + 'px';
      restartBtn.style.borderRadius = Math.round(26 * uiScale) + 'px';
    }
    if (banner) {
      banner.style.fontSize = Math.round(21 * uiScale) + 'px';
      banner.style.padding = Math.round(20 * uiScale) + 'px ' + Math.round(18 * uiScale) + 'px';
      banner.style.borderRadius = Math.round(24 * uiScale) + 'px';
    }
    if (milestoneBanner) {
      milestoneBanner.style.fontSize = Math.round(16 * uiScale) + 'px';
      milestoneBanner.style.padding = Math.round(10 * uiScale) + 'px ' + Math.round(14 * uiScale) + 'px';
      milestoneBanner.style.borderRadius = Math.round(18 * uiScale) + 'px';
    }
  }

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(GAME_WIDTH * dpr) || canvas.height !== Math.round(GAME_HEIGHT * dpr)) {
    canvas.width = Math.round(GAME_WIDTH * dpr);
    canvas.height = Math.round(GAME_HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

// --- Main Loop ---
let lastTime = performance.now();
export function gameLoop() {
  let now = performance.now();
  let dt = clamp(now - lastTime, 8, 32);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}
