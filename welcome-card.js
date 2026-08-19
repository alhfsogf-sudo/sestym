const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createWelcomeCard(member) {
  const W = 900, H = 300;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ------- خلفية بتدرج أخضر-أزرق مميز لهذا النوع من البطاقات -------
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0b2b26');
  bg.addColorStop(0.5, '#0f3d3e');
  bg.addColorStop(1, '#0a1a2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // نقشة دوائر شفافة خفيفة بالخلفية (عمق بدون تشتيت)
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 14; i++) {
    const r = 20 + (i % 4) * 18;
    const x = (i * 137) % W;
    const y = (i * 89) % H;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#57F287';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // إطار مزدوج (خط رفيع خارجي + خط سميك داخلي)
  ctx.strokeStyle = '#57F28755';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.strokeStyle = '#57F287';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, W - 36, H - 36);

  // ------- الصورة الشخصية بظل وهالة توهج -------
  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
  const avatar = await loadImage(avatarURL);
  const size = 176, x = 62, y = 62;
  const cx = x + size / 2, cy = y + size / 2;

  ctx.save();
  ctx.shadowColor = '#57F287';
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#57F28766';
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
  ctx.strokeStyle = '#57F287';
  ctx.lineWidth = 5;
  ctx.stroke();

  // ------- النصوص بظل خفيف خلفها -------
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Cairo';
  ctx.fillText(`أهلاً ${member.user.username}! 🎉`, 290, 130);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8fe8c0';
  ctx.font = '26px Cairo';
  ctx.fillText(`العضو رقم ${member.guild.memberCount.toLocaleString('en-US')} بالسيرفر`, 290, 172);

  // خط فاصل زخرفي صغير
  ctx.strokeStyle = '#57F28770';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(290, 195);
  ctx.lineTo(500, 195);
  ctx.stroke();

  ctx.fillStyle = '#b9bbbe';
  ctx.font = '20px Cairo';
  ctx.fillText('نتمنى لك وقت ممتع بالسيرفر معنا 🌿', 290, 225);

  return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeCard };
