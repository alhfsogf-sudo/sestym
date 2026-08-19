const { GlobalFonts } = require('@napi-rs/canvas');

// خط Cairo - النسخة الثابتة (static) وليس Variable Font
// السبب: @napi-rs/canvas ما يدعم رسم خطوط الـ Variable Fonts (woff2-variations) بشكل صحيح
// فكانت النصوص تطلع مربعات فاضية حتى بعد تسجيل الملف بنجاح.
// الحل: نستخدم ملفات وزن ثابت (400 عادي / 700 عريض) لكل من العربي واللاتيني (فيه الأرقام والرموز ★)
const FONT_VERSION = '5.3.0';
const FILES = [
  `arabic-400-normal`,
  `arabic-700-normal`,
  `latin-400-normal`,
  `latin-700-normal`,
].map(name => `https://cdn.jsdelivr.net/fontsource/fonts/cairo@${FONT_VERSION}/${name}.woff2`);

// نحتفظ بمرجع دائم للبيانات - GlobalFonts.register يستخدم نفس الذاكرة مباشرة
// ولو انجمعت (Garbage Collected) الخط ينكسر لاحقًا، فنخليه حي طول عمر البرنامج
const fontBuffers = [];
let loaded = false;

async function loadArabicFont() {
  if (loaded) return true;

  try {
    const responses = await Promise.all(FILES.map(url => fetch(url)));
    responses.forEach((res, i) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} (${FILES[i]})`);
    });

    const buffers = await Promise.all(responses.map(res => res.arrayBuffer()));
    let allOk = true;

    buffers.forEach((buf, i) => {
      const buffer = Buffer.from(buf);
      fontBuffers.push(buffer);
      // نسجل الملفات الأربعة (عربي/لاتيني × عادي/عريض) تحت نفس اسم العائلة "Cairo"
      // حتى يغطوا بعض: الأرقام والرموز مثل ★ موجودة بملفات الـ latin فقط
      const ok = GlobalFonts.register(buffer, 'Cairo');
      if (!ok) {
        allOk = false;
        console.error(`❌ فشل تسجيل ${FILES[i]}`);
      }
    });

    loaded = allOk;

    if (loaded) {
      console.log('✅ تم تحميل خط Cairo (عربي + لاتيني، عادي + عريض) بنجاح - النصوص بالصور راح تشتغل صح');
    } else {
      console.error('❌ صار خلل بتسجيل بعض ملفات خط Cairo');
    }
    return loaded;
  } catch (err) {
    console.error('❌ فشل تحميل خط Cairo:', err.message);
    console.error('⚠️ النصوص بالصور (بروفايل، ترحيب، مقارنة) ما راح تظهر لين ما ينحل هذا');
    return false;
  }
}

module.exports = { loadArabicFont };
