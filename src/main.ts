import "./style.css";
import MusicLibrary, { getSongUrl, type MusicSong } from "./music-library";

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
<section class="panel">
  <h2>Biblioteca musical</h2>
  <p class="hint">Explora las canciones guardadas en tu teléfono.</p>

  <button id="load-library" class="primary">
    ♫ Abrir biblioteca
  </button>

  <p id="library-status" class="hint">
    Biblioteca sin cargar
  </p>

  <div id="song-list"></div>
</section>
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
const libraryButton =
  document.querySelector<HTMLButtonElement>("#load-library")!;

const libraryStatus =
  document.querySelector<HTMLElement>("#library-status")!;

const songList =
  document.querySelector<HTMLDivElement>("#song-list")!;

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;
let data: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(1024));
let style = "circular";
let sensitivity = 1.4;
let glow = 65;
let hueColor = "#8b5cf6";
let animationId = 0;
let lastFrameTime = 0;
const FRAME_INTERVAL = 1000 / 30;
let objectUrl: string | null = null;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
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


function draw(timestamp: number = 0) {
  animationId = requestAnimationFrame(draw);

  if (timestamp - lastFrameTime < FRAME_INTERVAL) return;
  lastFrameTime = timestamp;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const time = performance.now() * 0.001;

  ctx.clearRect(0, 0, w, h);

  if (analyser) analyser.getByteFrequencyData(data);

  const bass = average(0, 12);
  const mid = average(12, 90);
  const treble = average(90, 260);

  const energy = Math.min(
    1,
    (bass * 0.55 + mid * 0.3 + treble * 0.15) * sensitivity
  );

  const cx = w / 2;
  const cy = h / 2;
  const base = Math.min(w, h) * 0.19;
  const color = hueColor;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = glow * 0.20;
  ctx.shadowColor = color;
  ctx.globalCompositeOperation = "lighter";

  if (style === "circular") {

    // Anillos reactivos
    for (let ring = 0; ring < 3; ring++) {
      const radius = base + ring * 17 + bass * 25 * sensitivity;

      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        radius + Math.sin(time * 2 + ring) * energy * 7,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.2 + energy * 0.35;
      ctx.lineWidth = 1.5 + energy * 2;
      ctx.stroke();
    }

    // Barras de frecuencia
    const bars = 144;

    for (let i = 0; i < bars; i++) {
      const index = Math.floor(i / bars * data.length * 0.75);
      const value = data[index] / 255;

      const angle = i / bars * Math.PI * 2;
      const pulse = bass * 18 * sensitivity;

      const inner = base + pulse;
      const length = 8 + Math.pow(value, 0.8) * 125 * sensitivity;

      const outer = inner + length;

      ctx.beginPath();
      ctx.moveTo(
        cx + Math.cos(angle) * inner,
        cy + Math.sin(angle) * inner
      );

      ctx.lineTo(
        cx + Math.cos(angle) * outer,
        cy + Math.sin(angle) * outer
      );

      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35 + value * 0.65;
      ctx.lineWidth = 1.5 + value * 2.5;
      ctx.stroke();
    }

    // Núcleo pulsante
    ctx.beginPath();
    ctx.arc(cx, cy, base * 0.48 + bass * 18, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08 + energy * 0.28;
    ctx.fill();

  } else if (style === "wave") {

    // Tres capas independientes de ondas
    const layers = [
      { amplitude: 0.75, frequency: 0.020, speed: 1.0, alpha: 0.45 },
      { amplitude: 1.15, frequency: 0.032, speed: 1.5, alpha: 0.75 },
      { amplitude: 1.55, frequency: 0.045, speed: 2.0, alpha: 1.0 }
    ];

   const low = average(0, 18);

layers.forEach((layer, layerIndex) => {
      ctx.beginPath();

      for (let x = 0; x <= w; x += 2) {
        const index = Math.min(
          data.length - 1,
          Math.floor(x / w * data.length * 0.65)
        );

        const value = data[index] / 255;

        const amplitude =
          (20 + bass * 100 + mid * 35) *
          sensitivity *
          layer.amplitude;

        const primary = Math.sin(
          x * layer.frequency + time * layer.speed
        );

        const secondary = Math.sin(
          x * 0.012 - time * 2.2 + layerIndex
        );

        const y =
          cy +
          primary * amplitude * (0.25 + value) +
          secondary * (15 + low * 35) +
          (value - 0.5) * treble * 45;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = color;
      ctx.globalAlpha = layer.alpha;
      ctx.lineWidth = 2 + layerIndex * 1.3 + energy * 2;
      ctx.stroke();
    });

    // Línea central luminosa
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.2 + energy * 0.3;
    ctx.lineWidth = 1;
    ctx.stroke();

  } else {

    // Campo de partículas
    const count = 150;

    for (let i = 0; i < count; i++) {
      const angle = i * 2.399;
      const value = data[(i * 7) % data.length] / 255;

      const orbit = (i * 19) % 135;
      const movement = Math.sin(time * 1.8 + i) * 9;

      const radius =
        12 +
        orbit +
        value * 65 * sensitivity +
        energy * 20 +
        movement;

      const x = cx + Math.cos(angle + time * 0.12) * radius;
      const y = cy + Math.sin(angle + time * 0.12) * radius;

      const size = 1 + value * 4 + energy * 1.5;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.25 + value * 0.75;
      ctx.fill();
    }
  }

  ctx.restore();
}
draw();

let loadedSongs: MusicSong[] = [];

libraryButton.addEventListener("click", async () => {
  libraryButton.disabled = true;
  libraryStatus.textContent = "Buscando canciones...";

  try {
    const result = await MusicLibrary.requestAccess();
    loadedSongs = result.songs;

    songList.innerHTML = "";

    if (loadedSongs.length === 0) {
      libraryStatus.textContent = "No encontramos canciones en tu biblioteca.";
      return;
    }

    libraryStatus.textContent =
      `${loadedSongs.length} canciones encontradas`;

    loadedSongs.forEach((song) => {
      const item = document.createElement("button");
      item.className = "song-item";
      item.textContent =
        `${song.title || song.name} — ${song.artist || "Artista desconocido"}`;

      item.addEventListener("click", async () => {
        try {
          libraryStatus.textContent = "Preparando canción...";

          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }

          audio.src = await getSongUrl(song.id);
          audio.load();

          trackName.textContent = song.title || song.name;
          libraryStatus.textContent = "Canción cargada";

          playButton.disabled = false;
          stopButton.disabled = false;

          setupAudio();

          if (audioContext?.state === "suspended") {
            await audioContext.resume();
          }

          await audio.play();

          playButton.textContent = "Ⅱ Pausar";
          status.textContent = "Reproduciendo";
        } catch (error) {
          console.error(error);
          libraryStatus.textContent =
            "No se pudo reproducir esta canción.";
        }
      });

      songList.appendChild(item);
    });

  } catch (error) {
    console.error(error);
    libraryStatus.textContent =
      "No se pudo acceder a la biblioteca musical.";
  } finally {
    libraryButton.disabled = false;
  }
});


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
    
