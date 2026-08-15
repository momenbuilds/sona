export interface ShareCardData {
  score: number | null;
  scoreLabel: string;
  wordCount: number | null;
  wpm: number | null;
  recordingCount: number;
  dateLabel: string;
}

const WIDTH = 1200;
const HEIGHT = 630;

export function renderShareCard(canvas: HTMLCanvasElement, data: ShareCardData): void {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const radius = 40;
  ctx.save();
  roundedRectPath(ctx, 0, 0, WIDTH, HEIGHT, radius);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#f2601f");
  bg.addColorStop(1, "#f4a05f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawNoise(ctx, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "600 30px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "middle";

  // Logo mark
  ctx.beginPath();
  ctx.arc(70, 68, 16, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(70, 68, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "600 30px system-ui, -apple-system, sans-serif";
  ctx.fillText("Sona", 100, 68);

  ctx.textAlign = "right";
  ctx.font = "500 22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(data.dateLabel, WIDTH - 70, 68);
  ctx.textAlign = "left";

  // Big stat
  const scoreText = data.score !== null ? String(data.score) : "—";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 150px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(scoreText, 68, 340);

  const scoreWidth = ctx.measureText(scoreText).width;
  ctx.font = "500 34px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillText("Voice Stability", 68 + scoreWidth + 24, 340);

  ctx.font = "400 26px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(data.scoreLabel, 70, 390);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, 460);
  ctx.lineTo(WIDTH - 70, 460);
  ctx.stroke();

  // Bottom stat row
  const stats: [string, string][] = [
    [data.wordCount !== null ? data.wordCount.toLocaleString() : "—", "Words spoken"],
    [data.wpm !== null ? String(Math.round(data.wpm)) : "—", "Words / min"],
    [String(data.recordingCount), "Recordings"],
  ];
  const colWidth = (WIDTH - 140) / 3;
  stats.forEach(([value, label], i) => {
    const x = 70 + i * colWidth;
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px system-ui, -apple-system, sans-serif";
    ctx.fillText(value, x, 545);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "400 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(label, x, 580);
  });

  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  roundedRectPath(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, radius);
  ctx.stroke();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Cheap film-grain texture so the flat gradient doesn't look too clean.
function drawNoise(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 14;
    data[i] += grain;
    data[i + 1] += grain;
    data[i + 2] += grain;
  }
  ctx.putImageData(imageData, 0, 0);
}
