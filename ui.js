// UI helpers and overlays
export function showBanner(text, duration = 1200) {
  const banner = document.getElementById('banner');
  banner.textContent = text;
  banner.classList.remove('countdown');
  banner.classList.add('show');
  if (window._bannerTimeout) clearTimeout(window._bannerTimeout);
  if (duration > 0) {
    window._bannerTimeout = setTimeout(() => banner.classList.remove('show'), duration);
  }
}

export function showMilestone(text) {
  const milestoneBanner = document.getElementById('milestone-banner');
  milestoneBanner.textContent = text;
  milestoneBanner.classList.add('show');
  setTimeout(() => {
    milestoneBanner.classList.remove('show');
  }, 3000);
}

export function hideBanner() {
  const banner = document.getElementById('banner');
  banner.classList.remove('show', 'countdown');
  if (window._bannerTimeout) clearTimeout(window._bannerTimeout);
}

export function showScore() {
  const scoreBubble = document.getElementById('score-bubble');
  const highScoreBubble = document.getElementById('high-score-bubble');
  const score = parseInt(scoreBubble.textContent || '0');
  const highScore = parseInt(localStorage.getItem('flappyManHighScore') || '0', 10);
  scoreBubble.textContent = score;
  highScoreBubble.textContent = highScore;
}

export function showGameOverBanner() {
  const banner = document.getElementById('banner');
  const score = document.getElementById('score-bubble').textContent;
  showBanner(`Game Over! Score: ${score}`, 0);
}

export function showMilestoneBanner(val) {
  showMilestone(`Milestone! Score: ${val}`);
}

export function showCountdownBanner(num) {
  const banner = document.getElementById('banner');
  banner.textContent = num;
  banner.classList.add('show', 'countdown');
}

export function showStartBanner() {
  const banner = document.getElementById('banner');
  banner.classList.remove('countdown');
  showBanner('Press S or Click Start', 0);
}

export function showResetBanner() {
  const banner = document.getElementById('banner');
  banner.classList.remove('countdown');
  showBanner('Game Reset - Press ESC anytime', 1500);
}
