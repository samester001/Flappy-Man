// AudioManager module
export const AudioManager = (function(){
  let ctx = null;
  let masterGain = null;
  let musicSource = null;
  let muted = false;

  function init() {
    if (ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
  }

  function playTone(freq, type='sine', when=0, duration=0.12, gain=0.12){
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(masterGain);
    o.start(ctx.currentTime + when);
    g.gain.setValueAtTime(gain, ctx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration);
    o.stop(ctx.currentTime + when + duration + 0.02);
  }

  function playFlap(){ init(); if (!ctx) return; playTone(880, 'sine', 0, 0.08, 0.08); }
  function playScore(){ init(); if (!ctx) return; playTone(1240,'triangle',0,0.18,0.10); playTone(1560,'sine',0.04,0.12,0.07); }
  function playHit(){ init(); if (!ctx) return; playTone(220,'sawtooth',0,0.28,0.18); }

  function toggleMute(){ init(); if (!masterGain) return; muted = !muted; masterGain.gain.value = muted ? 0 : 0.9; return muted; }

  return { init, playFlap, playScore, playHit, toggleMute };
})();
