import { resetGame, gameLoop, startCountdown, restartGame, flap, resizeCanvas, getGameState, setGameState } from './core.js';
import { AudioManager } from './audio.js';
import { showBanner, hideBanner } from './ui.js';

// --- DOM Elements ---
const canvas = document.getElementById('game-canvas');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameContainer = document.getElementById('game-container');
const muteBtn = document.getElementById('mute-btn');

// --- Responsive Canvas ---
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Focus canvas only when clicking on canvas, not entire container
canvas.addEventListener('click', () => canvas.focus());

// --- Button Events ---
startBtn.addEventListener('click', () => {
  console.log('Start button clicked, current state:', getGameState());
  const currentState = getGameState();
  if (currentState === 'init' || currentState === 'gameover') {
    console.log('Starting countdown...');
    startCountdown();
    startBtn.style.display = 'none';
  } else {
    console.log('Cannot start, state is:', currentState);
  }
});

restartBtn.addEventListener('click', () => {
  const currentState = getGameState();
  if (currentState === 'gameover') {
    window.analytics && window.analytics.track('game_restart');
    restartGame();
    restartBtn.style.display = 'none';
    startBtn.style.display = '';
  }
});

if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    const muted = AudioManager.toggleMute();
    muteBtn.textContent = muted ? '🔈' : '🔊';
  });
}

// --- Keyboard ---
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const currentState = getGameState();
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    flap();
    e.preventDefault();
  } else if (e.code === 'KeyS') {
    if (currentState === 'init' || currentState === 'gameover') startCountdown();
  } else if (e.code === 'KeyR') {
      if (currentState === 'gameover') {
        restartGame();
      }
  } else if (e.code === 'Escape') {
    resetGame();
  } else if (e.code === 'KeyP') {
    if (currentState === 'running') {
      setGameState('paused');
      showBanner('Paused - Press P', 0);
    } else if (currentState === 'paused') {
      setGameState('running');
      hideBanner();
    }
  }
});

// --- Touch/Pointer ---
function handleTouch(e) {
  const currentState = getGameState();
  if (e.type === 'touchstart' || e.type === 'pointerdown') {
    // Only respond to touches on the canvas, not UI buttons
    if (e.target !== canvas) {
      return;
    }
    
    if (currentState === 'gameover') {
      // In game over state, only restart button should work, not canvas touches
      return;
    } else if (currentState === 'init') {
      startCountdown();
    } else if (currentState === 'running') {
      flap();
    }
    e.preventDefault();
  }
}

canvas.addEventListener('touchstart', handleTouch, { passive: false });
canvas.addEventListener('pointerdown', handleTouch, { passive: false });

// --- Start ---
window.analytics && window.analytics.track('game_start');
resetGame();
gameLoop();
