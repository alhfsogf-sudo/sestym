const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { xpForLevel } = require('./xp-util');
const { framesToGif } = require('./gif-utils');

const FRAME_COUNT = 10;
const FRAME_DELAY_MS = 100; // إجمالي دورة الحركة = ثانية وحدة تقريبًا

// حدود ملونة حسب المركز: ذهبي/فضي/برونزي لأول 3، بنفسجي افتراضي للباقي
const RANK_COLORS = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

async function createProfileCard({ member, memberDoc, rank, roleName }) {
  const W = 900, H = 300;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
  const avatar = await loadImage(avatarURL);
  const borderColor = RANK_COLORS[rank] || '#5865F2';

  const frames = [];
  for (let f = 0; f < FRAME_COUNT; f++) {
    const t = f / FRAME_COUNT; // 0 → 1 دورة كاملة
    drawFrame(ctx, { W, H, avatar, member, memberDoc, rank, roleName, borderColor, t });
    const imageData = ctx.getImageData(0, 0, W, H);
    frames.push({ data: imageData.data, width: W, height: H });
  }

  return framesToGif(frames, FRAME_DELAY_MS);
}

function drawFrame(ctx, { W, H, avatar, member, memberDoc, rank, roleName, borderColor, t }) {
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2); // نبضة سلسة 0→1→0

  // خلفية
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, '#1e1e2f');
  gradient.addColorStop(1, '#2d2d44');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // نقشة نجوم صغيرة متناثرة بلون المركز (خفيفة جدًا)
  ctx.save();
  ctx.globalAlpha = 0.05 + 0.03 * pulse;
  ctx.fillStyle = borderColor;
  for (let i = 0; i < 18; i++) {
    const sx = (i * 173) % W;
    const sy = (i * 97) % H;
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = '#5865F2';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  // ------- الصورة الشخصية + هالة متوهجة متحركة -------
  const size = 180, x = 50, y = 60;
  const cx = x + size / 2, cy = y + size / 2;

  ctx.save();
  ctx.globalAlpha = 0.25 + 0.35 * pulse;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 8 + pulse * 6, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, x, y, size, size);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2, true);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  // تاج فوق الصورة لصاحب المركز الأول
  if (rank === 1) drawCrown(ctx, cx, y - 6, 46, pulse);

  // ------- النصوص -------
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Cairo';
  ctx.fillText(member.user.username, 270, 100);

  ctx.fillStyle = '#b9bbbe';
  ctx.font = '24px Cairo';
  ctx.fillText(`الرتبة: ${roleName || 'بدون رتبة'}`, 270, 140);
  ctx.shadowBlur = 0;

  // أيقونة نجمة مرسومة متلألئة جنب المستوى
  drawTwinkleStar(ctx, 252, 172, 11, pulse);

  ctx.fillStyle = '#FEE75C';
  ctx.font = 'bold 24px Cairo';
  ctx.fillText(`المستوى ${memberDoc.level}  •  الترتيب #${rank}`, 270, 180);

  ctx.fillStyle = '#57F287';
  ctx.font = '22px Cairo';
  ctx.fillText(`💬 عدد الرسائل: ${memberDoc.messageCount.toLocaleString('en-US')}`, 270, 215);

  const joinDate = new Date(memberDoc.joinedAt).toLocaleDateString('ar-EG');
  ctx.fillStyle = '#b9bbbe';
  ctx.font = '22px Cairo';
  ctx.fillText(`📅 تاريخ الانضمام: ${joinDate}`, 270, 245);

  // ------- شريط XP -------
  const xpNeeded = xpForLevel(memberDoc.level + 1);
  const progress = Math.min(memberDoc.xp / xpNeeded, 1);
  const barX = 270, barY = 265, barWidth = 580, barHeight = 20;

  roundRect(ctx, barX, barY, barWidth, barHeight, 10);
  ctx.fillStyle = '#3a3a55';
  ctx.fill();

  roundRect(ctx, barX, barY, barWidth * progress, barHeight, 10);
  ctx.fillStyle = borderColor;
  ctx.fill();
}

// نجمة خماسية مرسومة يدويًا (بدل إيموجي)، تتلألأ بتغيير الحجم مع النبضة
function drawTwinkleStar(ctx, cx, cy, baseRadius, pulse) {
  const radius = baseRadius * (0.8 + 0.3 * pulse);
  const spikes = 5;
  const innerRadius = radius * 0.45;

  ctx.save();
  ctx.globalAlpha = 0.7 + 0.3 * pulse;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : innerRadius;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#FEE75C';
  ctx.fill();
  ctx.restore();
}

// تاج بسيط مرسوم بثلاث رؤوس، يظهر فوق صاحب المركز الأول
function drawCrown(ctx, cx, topY, width, pulse) {
  const h = 24, w = width;
  const baseY = topY + h;

  ctx.save();
  ctx.globalAlpha = 0.85 + 0.15 * pulse;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, baseY);
  ctx.lineTo(cx - w / 2, baseY - h * 0.4);
  ctx.lineTo(cx - w / 4, baseY - h);
  ctx.lineTo(cx, baseY - h * 0.5);
  ctx.lineTo(cx + w / 4, baseY - h);
  ctx.lineTo(cx + w / 2, baseY - h * 0.4);
  ctx.lineTo(cx + w / 2, baseY);
  ctx.closePath();
  ctx.fillStyle = '#FFD700';
  ctx.fill();
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  width = Math.max(width, 0);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

module.exports = { createProfileCard };
