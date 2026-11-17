import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand-mark">VS</div>
      <div><h1>Visualizer Studio</h1><p class="subtitle">Convierte sonido en movimiento</p></div>
      <span class="version">0.1.0</span>
    </header>

    <section class="stage-card">
      <div class="stage-head"><span>VISTA PREVIA</span><span id="status">Esperando audio</span></div>
      <canvas id="visualizer" aria-label="Visualizador musical"></canvas>
      <div class="track-info">
        <div><strong id="track-name">Ninguna canción seleccionada</strong><small id="track-meta">MP3 / M4A · Vista previa en tiempo real</small></div>
        <span class="live-dot"></span>
      </div>
    </section>

    <section class="panel">
      <h2>Tu música</h2>
      <label class="file-button" for="audio-file">＋ Seleccionar archivo de audio</label>
      <input id="audio-file" type="file" accept="audio/mpeg,audio/mp4,audio/aac,.mp3,.m4a,.aac,.wav,.ogg" />
      <div class="controls">
        <button id="play" class="primary" disabled>▶ Reproducir</button>
        <button id="stop" disabled>■ Detener</button>
      </div>
      <audio id="audio" controls></audio>
      <p class="hint">La compatibilidad M4A depende del códec del archivo y del navegador Android.</p>
    </section>

    <section class="panel">
      <h2>Estilo visual</h2>
      <div class="style-grid">
        <button class="style-choice active" data-style="circular">◉<span>Circular</span></button>
        <button class="style-choice" data-style="wave">〰<span>Ondas</span></button>
        <button class="style-choice" data-style="particles">✧<span>Partículas</span></button>
      </div>
      <div class="setting">
        <label for="sensitivity">Sensibilidad <output id="sensitivity-value">1.4×</output></label>
        <input id="sensitivity" type="range" min="0.5" max="3" step="0.1" value="1.4" />
      </div>
      <div class="setting">
        <label for="color">Color principal</label>
        <input id="color" type="color" value="#8b5cf6" />
      </div>
      <div class="setting">
        <label for="glow">Brillo <output id="glow-value">65%</output></label>
        <input id="glow" type="range" min="0" max="100" value="65" />
      </div>
    </section>

    <section class="export-card">
      <div><h2>Exportación de vídeo</h2><p>El exportador MP4 1080p se incorporará en una siguiente etapa.</p></div>
      <span class="coming">PRÓXIMAMENTE</span>
    </section>
    <footer>Visualizer Studio · Proyecto en desarrollo</footer>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#visualizer")!;
const ctx = canvas.getContext("2d")!;
const audio = document.querySelector<HTMLAudioElement>("#audio")!;
const fileInput = document.querySelector<HTMLInputElement>("#audio-file")!;
const playButton = document.querySelector<HTMLButtonElement>("#play")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stop")!;
const status = document.querySelector<HTMLElement>("#status")!;
const trackName = document.querySelector<HTMLElement>("#track-name")!;
const sensitivityInput = document.querySelector<HTMLInputElement>("#sensitivity")!;
const sensitivityValue = document.querySelector<HTMLOutputElement>("#sensitivity-value")!;
const colorInput = document.querySelector<HTMLInputElement>("#color")!;
const glowInput = document.querySelector<HTMLInputElement>("#glow")!;
const glowValue = document.querySelector<HTMLOutputElement>("#glow-value")!;

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let data: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(1024));
let style = "circular";
let sensitivity = 1.4;
let glow = 65;
let hueColor = "#8b5cf6";
let animationId = 0;
let objectUrl: string | null = null;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function setupAudio() {
  if (audioContext) return;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.82;
  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
}

function average(start: number, end: number) {
  if (!analyser) return 0;
  let total = 0;
  const a = Math.max(0, start);
  const b = Math.min(data.length, end);
  for (let i = a; i < b; i++) total += data[i];
  return b > a ? total / (b - a) / 255 : 0;
}

function draw() {
  animationId = requestAnimationFrame(draw);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  if (analyser) analyser.getByteFrequencyData(data);
  const bass = average(0, 12);
  const mid = average(12, 90);
  const treble = average(90, 260);
  const energy = Math.min(1, (bass * 0.55 + mid * 0.3 + treble * 0.15) * sensitivity);
  const cx = w / 2;
  const cy = h / 2;
  const base = Math.min(w, h) * 0.19;
  const color = hueColor;
  ctx.save();
  ctx.shadowBlur = glow * 0.22;
  ctx.shadowColor = color;

  if (style === "circular") {
    const bars = 100;
    for (let i = 0; i < bars; i++) {
      const value = data.length ? data[Math.floor(i / bars * data.length * 0.72)] / 255 : 0;
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const inner = base;
      const outer = inner + 8 + value * 75 * sensitivity;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35 + value * 0.65;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, base - 7 + energy * 5, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, base * 0.55 + bass * 12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08 + energy * 0.16;
    ctx.fill();
  } else if (style === "wave") {
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const index = Math.floor(x / w * data.length);
      const v = data[index] / 255;
      const y = cy + Math.sin(x * 0.025) * (12 + v * 95 * sensitivity) * (0.3 + energy);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
  } else {
    const count = 90;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399;
      const value = data.length ? data[(i * 7) % data.length] / 255 : 0;
      const radius = 15 + ((i * 17) % 110) + value * 45 * sensitivity + energy * 18;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.arc(x, y, 1 + value * 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.25 + value * 0.75;
      ctx.fill();
    }
  }
  ctx.restore();
}

draw();

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  audio.src = objectUrl;
  trackName.textContent = file.name;
  status.textContent = "Audio cargado";
  playButton.disabled = false;
  stopButton.disabled = false;
  audio.load();
});

playButton.addEventListener("click", async () => {
  if (!audio.src) return;
  setupAudio();
  if (audioContext?.state === "suspended") await audioContext.resume();
  if (audio.paused) {
    await audio.play();
    playButton.textContent = "Ⅱ Pausar";
    status.textContent = "Reproduciendo";
  } else {
    audio.pause();
    playButton.textContent = "▶ Reproducir";
    status.textContent = "En pausa";
  }
});

stopButton.addEventListener("click", () => {
  audio.pause();
  audio.currentTime = 0;
  playButton.textContent = "▶ Reproducir";
  status.textContent = "Detenido";
});

audio.addEventListener("ended", () => {
  playButton.textContent = "▶ Reproducir";
  status.textContent = "Reproducción finalizada";
});

document.querySelectorAll<HTMLButtonElement>(".style-choice").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector(".style-choice.active")?.classList.remove("active");
    button.classList.add("active");
    style = button.dataset.style ?? "circular";
  });
});

sensitivityInput.addEventListener("input", () => {
  sensitivity = Number(sensitivityInput.value);
  sensitivityValue.textContent = `${sensitivity.toFixed(1)}×`;
});
colorInput.addEventListener("input", () => hueColor = colorInput.value);
glowInput.addEventListener("input", () => {
  glow = Number(glowInput.value);
  glowValue.textContent = `${glow}%`;
});

window.addEventListener("pagehide", () => {
  cancelAnimationFrame(animationId);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
    
