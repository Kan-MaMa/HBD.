// --- Default Photos (Your uploaded friend's photos) ---
const DEFAULT_PHOTOS = [
  'images/photo1.jpg',
  'images/photo2.jpg',
  'images/photo3.jpg',
  'images/photo4.jpg'
];

// State
let userPhotos = [...DEFAULT_PHOTOS];
let activeFlyingItems = [];
let isOpened = false;
let soundEnabled = true;
let audioCtx = null;
let bgmInterval = null;

// DOM Elements
const giftScreen = document.getElementById('giftScreen');
const giftBox = document.getElementById('giftBox');
const giftLid = document.getElementById('giftLid');
const boomSplash = document.getElementById('boomSplash');
const chaosContainer = document.getElementById('chaosContainer');
const marqueeText = document.getElementById('marqueeText');
const hbdMainTitle = document.getElementById('hbdMainTitle');
const hbdSubTitle = document.getElementById('hbdSubTitle');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==========================================
// Web Audio API Synthesizer
// ==========================================
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 💥 Big Cartoon Explosion Sound
function playExplosionSound() {
  if (!soundEnabled) return;
  initAudio();

  const now = audioCtx.currentTime;

  // 1. Noise Burst
  const bufferSize = audioCtx.sampleRate * 0.8;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, now);
  filter.frequency.exponentialRampToValueAtTime(30, now + 0.7);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(1.5, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start(now);

  // 2. Sub-Bass Punch Sweep
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.5);

  oscGain.gain.setValueAtTime(1.0, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}

// 🎶 8-Bit Upbeat Birthday Melody
const HBD_NOTES = [
  261.63, 261.63, 293.66, 261.63, 349.23, 329.63,
  261.63, 261.63, 293.66, 261.63, 392.00, 349.23,
  261.63, 261.63, 523.25, 440.00, 349.23, 329.63, 293.66,
  466.16, 466.16, 440.00, 349.23, 392.00, 349.23
];

const NOTE_DURATIONS = [
  0.25, 0.25, 0.5, 0.5, 0.5, 0.9,
  0.25, 0.25, 0.5, 0.5, 0.5, 0.9,
  0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.9,
  0.25, 0.25, 0.5, 0.5, 0.5, 1.0
];

let currentNoteIdx = 0;
function playNextNote() {
  if (!soundEnabled || !isOpened || !audioCtx) return;

  const freq = HBD_NOTES[currentNoteIdx];
  const dur = NOTE_DURATIONS[currentNoteIdx] * 0.7;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + dur * 0.9);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + dur);

  currentNoteIdx = (currentNoteIdx + 1) % HBD_NOTES.length;
  bgmInterval = setTimeout(playNextNote, dur * 1000);
}

function startBirthdayMusic() {
  if (bgmInterval) clearTimeout(bgmInterval);
  currentNoteIdx = 0;
  playNextNote();
}

function playPopSound() {
  if (!soundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}

// ==========================================
// Particle & Confetti Engine
// ==========================================
let particles = [];
const PARTICLE_COLORS = [
  '#ff0055', '#00f0ff', '#ffe600', '#7928ca', '#00ff88', '#ff7700', '#ffffff', '#ff00ea'
];

class Particle {
  constructor(x, y, isExplosion = false) {
    this.x = x;
    this.y = y;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    this.size = Math.random() * 12 + 6;
    this.rotation = Math.random() * 360;
    this.rotSpeed = (Math.random() - 0.5) * 15;
    
    if (isExplosion) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 22 + 6;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.gravity = 0.35;
      this.life = 1.0;
      this.decay = Math.random() * 0.015 + 0.008;
    } else {
      this.vx = (Math.random() - 0.5) * 4;
      this.vy = Math.random() * 4 + 3;
      this.gravity = 0.05;
      this.life = 1.0;
      this.decay = 0.005;
    }
    this.shape = Math.random() > 0.4 ? 'rect' : 'circle';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.98;
    this.rotation += this.rotSpeed;
    this.life -= this.decay;
  }

  draw(c) {
    c.save();
    c.globalAlpha = Math.max(0, this.life);
    c.translate(this.x, this.y);
    c.rotate((this.rotation * Math.PI) / 180);
    c.fillStyle = this.color;
    if (this.shape === 'rect') {
      c.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    } else {
      c.beginPath();
      c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
}

function spawnExplosion(x, y, count = 200) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, true));
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isOpened && Math.random() < 0.4) {
    particles.push(new Particle(Math.random() * canvas.width, -10, false));
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw(ctx);
    if (p.life <= 0 || p.y > canvas.height + 50) {
      particles.splice(i, 1);
    }
  }

  requestAnimationFrame(animateParticles);
}
animateParticles();

// ==========================================
// Bouncing Photos of the Birthday Person
// ==========================================
class BouncingPhoto {
  constructor(imgSrc, startX, startY) {
    this.element = document.createElement('img');
    this.element.src = imgSrc;
    this.element.className = 'flying-photo';
    document.body.appendChild(this.element);

    this.width = window.innerWidth < 768 ? 100 : 140;
    this.height = this.width;

    this.x = startX || Math.random() * (window.innerWidth - this.width);
    this.y = startY || Math.random() * (window.innerHeight - this.height);

    // Fast dynamic bouncing speeds
    const speed = Math.random() * 5 + 4;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.rotation = Math.random() * 360;
    this.rotSpeed = (Math.random() - 0.5) * 7;

    // Interactive click on photo
    this.element.addEventListener('click', (e) => {
      e.stopPropagation();
      playPopSound();
      this.vx *= -1.25;
      this.vy *= -1.25;
      spawnExplosion(this.x + this.width / 2, this.y + this.height / 2, 35);
    });

    this.updatePosition();
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Bounce off edges
    if (this.x <= 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
      this.rotSpeed = (Math.random() - 0.5) * 8;
    } else if (this.x + this.width >= screenW) {
      this.x = screenW - this.width;
      this.vx = -Math.abs(this.vx);
      this.rotSpeed = (Math.random() - 0.5) * 8;
    }

    if (this.y <= 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy);
    } else if (this.y + this.height >= screenH) {
      this.y = screenH - this.height;
      this.vy = -Math.abs(this.vy);
    }

    this.updatePosition();
  }

  updatePosition() {
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
    this.element.style.transform = `rotate(${this.rotation}deg)`;
  }

  destroy() {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

function updatePhysicsLoop() {
  for (const item of activeFlyingItems) {
    item.update();
  }
  requestAnimationFrame(updatePhysicsLoop);
}
updatePhysicsLoop();

// ==========================================
// Gift Box Opening & Explosion Trigger
// ==========================================
function openGift() {
  if (isOpened) return;
  isOpened = true;

  // 1. Play lid fly-off animation
  giftLid.classList.add('lid-flying');

  // 2. Screen shake & audio blast
  document.body.classList.add('shake-active');
  playExplosionSound();

  const rect = giftBox.getBoundingClientRect();
  const boxCenterX = rect.left + rect.width / 2;
  const boxCenterY = rect.top + rect.height / 2;

  // 3. Huge Confetti Explosion
  spawnExplosion(boxCenterX, boxCenterY, 350);

  // 4. Boom Comic Splash
  boomSplash.classList.add('boom-active');

  // 5. Hide gift screen, activate party background & chaos mode
  setTimeout(() => {
    giftScreen.classList.add('fade-out');
    document.body.classList.add('party-mode');
    chaosContainer.classList.remove('hidden');
    startBirthdayMusic();

    // 6. Launch a swarm of your friend's photos from the explosion!
    launchFlyingPhotos(boxCenterX, boxCenterY);
  }, 450);

  setTimeout(() => {
    document.body.classList.remove('shake-active');
  }, 800);
}

function launchFlyingPhotos(originX, originY) {
  // Clear any existing
  activeFlyingItems.forEach(item => item.destroy());
  activeFlyingItems = [];

  // Spawn 16-20 photos flying out in all directions
  const spawnCount = Math.max(16, userPhotos.length * 4);
  for (let i = 0; i < spawnCount; i++) {
    const photoSrc = userPhotos[i % userPhotos.length];
    setTimeout(() => {
      const item = new BouncingPhoto(photoSrc, originX - 50, originY - 50);
      activeFlyingItems.push(item);
    }, i * 45);
  }
}

// Click to trigger box
giftBox.addEventListener('click', openGift);
giftBox.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    openGift();
  }
});

// Click screen anywhere when opened to spawn more photos!
document.addEventListener('click', (e) => {
  if (!isOpened) return;

  playPopSound();
  spawnExplosion(e.clientX, e.clientY, 40);

  // Add more bouncing photos of the friend from click location
  if (activeFlyingItems.length < 35 && userPhotos.length > 0) {
    const randomPhoto = userPhotos[Math.floor(Math.random() * userPhotos.length)];
    const newItem = new BouncingPhoto(randomPhoto, e.clientX - 50, e.clientY - 50);
    activeFlyingItems.push(newItem);
  }
});
