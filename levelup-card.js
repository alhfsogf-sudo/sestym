const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createLevelUpBanner(member, newLevel) {
  const W = 700, H = 220;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ------- خلفية بتدرج ذهبي-برتقالي مميز لهذا النوع -------
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1a1408');
  grad.addColorStop(0.45, '#3d2a0f');
  grad.addColorStop(1, '#1a1408');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // إشعاع دائري خفيف خلف المنتصف (إحساس "انفجار طاقة")
  const radial = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W / 1.3);
  radial.addColorStop(0, 'rgba(255,176,32,0.18)');
  radial.addColorStop(1, 'rgba(255,176,32,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, H);

  // كونفيتي ملون (ذهبي + أخضر + وردي)
  const confettiColors = ['#ffb020', '#00e5a0', '#ff7ac6', '#ffffff'];
  for (let i = 0; i < 35; i++) {
    ctx.fillStyle = confettiColors[i % confettiColors.length];
    const x = Math.random() * W, y = Math.random() * H;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.fillRect(-2, -4, 4, 8);
    ctx.restore();
  }

  // إطار مزدوج
  ctx.strokeStyle = '#ffb02040';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.strokeStyle = '#ffb020';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, W - 28, H - 28);

  // ------- الصورة الشخصية بهالة توهج ذهبية -------
  const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
  const size = 128, x = 46, y = 46;
  const cx = x + size / 2, cy = y + size / 2;

  ctx.save();
  ctx.shadowColor = '#ffb020';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffb02066';
  ctx.lineWidth = 8;
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
  ctx.strokeStyle = '#ffb020';
  ctx.lineWidth = 5;
  ctx.stroke();

  // ------- النصوص -------
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 10;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Cairo';
  ctx.fillText(`🎉 ${member.user.username}`, 210, 95);

  ctx.fillStyle = '#ffb020';
  ctx.font = 'bold 30px Cairo';
  ctx.fillText(`وصل للمستوى ${newLevel}!`, 210, 138);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c9cdd6';
  ctx.font = '19px Cairo';
  ctx.fillText('استمر بنفس الحماس 🔥', 210, 172);

  return canvas.toBuffer('image/png');
}

module.exports = { createLevelUpBanner };
