const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createComparisonCard({ memberA, memberB, docA, docB }) {
  const W = 900, H = 420;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ألوان كل طرف - نستخدم لون أعلى رتبة لكل عضو، وإلا لون افتراضي مميز
  const colorA = memberA.roles.highest.hexColor !== '#000000' ? memberA.roles.highest.hexColor : '#7c5cff';
  const colorB = memberB.roles.highest.hexColor !== '#000000' ? memberB.roles.highest.hexColor : '#00b8e5';

  // خلفية عامة داكنة بلمسة بنفسجية-وردية (هوية بطاقة المقارنة)
  ctx.fillStyle = '#0a0c16';
  ctx.fillRect(0, 0, W, H);

  // نقشة خطوط مائلة خفيفة جدًا بالخلفية (عمق زخرفي)
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = -H; i < W; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // نص خلفية متدرجة لكل نصف بلون العضو (شفافة خفيفة)
  const gradA = ctx.createLinearGradient(0, 0, W / 2, 0);
  gradA.addColorStop(0, hexToRgba(colorA, 0.28));
  gradA.addColorStop(1, hexToRgba(colorA, 0.04));
  ctx.fillStyle = gradA;
  ctx.fillRect(0, 0, W / 2, H);

  const gradB = ctx.createLinearGradient(W, 0, W / 2, 0);
  gradB.addColorStop(0, hexToRgba(colorB, 0.28));
  gradB.addColorStop(1, hexToRgba(colorB, 0.04));
  ctx.fillStyle = gradB;
  ctx.fillRect(W / 2, 0, W / 2, H);

  // ------- الصورتين -------
  const avatarSize = 150;
  await drawAvatar(ctx, memberA.user.displayAvatarURL({ extension: 'png', size: 256 }), W * 0.25 - avatarSize / 2, 40, avatarSize, colorA);
  await drawAvatar(ctx, memberB.user.displayAvatarURL({ extension: 'png', size: 256 }), W * 0.75 - avatarSize / 2, 40, avatarSize, colorB);

  // ------- الأسماء -------
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Cairo';
  ctx.fillText(truncate(memberA.user.username, 14), W * 0.25, 220);
  ctx.fillText(truncate(memberB.user.username, 14), W * 0.75, 220);

  // ------- VS بدائرة توهج خلفه (بدل نص مجرد) -------
  const vsCx = W / 2, vsCy = 125;
  const vsGlow = ctx.createRadialGradient(vsCx, vsCy, 0, vsCx, vsCy, 55);
  vsGlow.addColorStop(0, 'rgba(255,176,32,0.35)');
  vsGlow.addColorStop(1, 'rgba(255,176,32,0)');
  ctx.fillStyle = vsGlow;
  ctx.beginPath();
  ctx.arc(vsCx, vsCy, 55, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = '#ffb020';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffb020';
  ctx.font = 'bold 46px Cairo';
  ctx.fillText('VS', vsCx, vsCy + 15);
  ctx.shadowBlur = 0;

  // خط فاصل بالنص
  ctx.strokeStyle = '#232840';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 20);
  ctx.lineTo(W / 2, H - 20);
  ctx.stroke();

  // ------- شريط XP مقارن (بار أفقي وسط الصورة) -------
  const totalXp = Math.max(docA.xp + docB.xp, 1);
  const ratioA = docA.xp / totalXp;
  const barY = 250, barH = 26, barX = 60, barW = W - 120;

  roundRect(ctx, barX, barY, barW, barH, 13);
  ctx.fillStyle = '#1c2038';
  ctx.fill();

  roundRect(ctx, barX, barY, barW * ratioA, barH, 13);
  ctx.fillStyle = colorA;
  ctx.fill();

  roundRect(ctx, barX + barW * ratioA, barY, barW * (1 - ratioA), barH, 13);
  ctx.fillStyle = colorB;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.font = 'bold 16px Cairo';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${docA.xp.toLocaleString('en-US')} XP`, barX, barY - 8);
  ctx.textAlign = 'right';
  ctx.fillText(`${docB.xp.toLocaleString('en-US')} XP`, barX + barW, barY - 8);

  // ------- المقارنة حسب الفئات -------
  const categories = [
    {
      label: 'المستوى',
      valA: docA.level, valB: docB.level,
      dispA: docA.level.toLocaleString('en-US'), dispB: docB.level.toLocaleString('en-US')
    },
    {
      label: 'الرسائل',
      valA: docA.messageCount, valB: docB.messageCount,
      dispA: docA.messageCount.toLocaleString('en-US'), dispB: docB.messageCount.toLocaleString('en-US')
    },
    {
      label: 'الأقدمية',
      valA: -new Date(docA.joinedAt).getTime(), valB: -new Date(docB.joinedAt).getTime(),
      dispA: new Date(docA.joinedAt).toLocaleDateString('ar-EG'), dispB: new Date(docB.joinedAt).toLocaleDateString('ar-EG')
    }
  ];

  let winsA = 0, winsB = 0;
  const rows = categories.map(cat => {
    const winner = cat.valA > cat.valB ? 'A' : cat.valA < cat.valB ? 'B' : 'tie';
    if (winner === 'A') winsA++;
    if (winner === 'B') winsB++;
    return { ...cat, winner };
  });

  let y = 320;
  for (const row of rows) {
    // القيمة يمين ويسار + علامة صح ✓ مرسومة يدويًا بجنب الطرف الفايز بهالفئة
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px Cairo';

    ctx.fillStyle = row.winner === 'A' ? colorA : '#b9bbbe';
    ctx.fillText(row.dispA, W * 0.25, y);
    if (row.winner === 'A') drawCheckmark(ctx, W * 0.25 + 55, y - 6, 10, colorA);

    ctx.fillStyle = row.winner === 'B' ? colorB : '#b9bbbe';
    ctx.fillText(row.dispB, W * 0.75, y);
    if (row.winner === 'B') drawCheckmark(ctx, W * 0.75 - 55, y - 6, 10, colorB);

    // التسمية بالنص: "القيمة : اسم الفئة : القيمة"
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '18px Cairo';
    ctx.fillText(`: ${row.label} :`, W / 2, y);

    y += 32;
  }

  // ------- الفايز الإجمالي + إبراز نقطة تميز الطرف التاني -------
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px Cairo';
  if (winsA !== winsB) {
    const winnerName = winsA > winsB ? memberA.user.username : memberB.user.username;
    const winnerColor = winsA > winsB ? colorA : colorB;
    ctx.fillStyle = winnerColor;
    ctx.fillText(`${winnerName} يتصدر بـ ${Math.max(winsA, winsB)} من ${rows.length} فئات`, W / 2, y + 20);
  } else {
    ctx.fillStyle = '#ffb020';
    ctx.fillText('تعادل تام بين الطرفين!', W / 2, y + 20);
  }

  return canvas.toBuffer('image/png');
}

async function drawAvatar(ctx, url, x, y, size, borderColor) {
  const img = await loadImage(url);
  const cx = x + size / 2, cy = y + size / 2;

  // هالة توهج خلف الصورة بلون العضو
  ctx.save();
  ctx.shadowColor = borderColor;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 3, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor + '55';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2, true);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 5;
  ctx.stroke();
}

// علامة صح ✓ مرسومة يدويًا (بدل إيموجي 👑) تُستخدم كعلامة تفوّق بجدول المقارنة
function drawCheckmark(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - size * 0.5, cy);
  ctx.lineTo(cx - size * 0.12, cy + size * 0.4);
  ctx.lineTo(cx + size * 0.5, cy - size * 0.35);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
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

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

module.exports = { createComparisonCard };
 
