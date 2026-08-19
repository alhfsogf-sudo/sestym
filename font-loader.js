const { GlobalFonts } = require('@napi-rs/canvas');

// خط Cairo - النسخة الثابتة (static) وليس Variable Font
// السبب: @napi-rs/canvas ما يرسم خطوط الـ Variable Fonts (woff2-variations) بشكل صحيح
// فكانت النصوص تطلع مربعات فاضية حتى بعد تسجيل الملف بنجاح.
// نستخدم بدالها ملفات وزن ثابت (400 عادي / 700 عريض) لكل من العربي واللاتيني
const FONT_TAG = 'CAIRO-STATIC-V3'; // علامة تأكيد بالـ log إننا على النسخة الصح
const FONT_VERSION = '5.3.0';
const FILES = [
  'arabic-400-normal',
  'arabic-700-normal',
  'latin-400-normal',
  'latin-700-normal',
].map(name => `https://cdn.jsdelivr.net/fontsource/fonts/cairo@${FONT_VERSION}/${name}.woff2`);

const fontBuffers = [];
let loaded = false;

async function loadArabicFont() {
  console.log(`ℹ️ [${FONT_TAG}] بدء تحميل خط Cairo (ثابت، غير Variable)...`);

  if (loaded) return true;

  try {
    let allOk = true;

    for (const url of FILES) {
      const res = await fetch(url);
      console.log(`   → ${url} : HTTP ${res.status}`);
      if (!res.ok) {
        allOk = false;
        console.error(`   ❌ فشل تحميل ${url}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fontBuffers.push(buffer);
      const ok = GlobalFonts.register(buffer, 'Cairo');
      if (!ok) {
        allOk = false;
        console.error(`   ❌ فشل تسجيل ${url}`);
      } else {
        console.log(`   ✅ تسجّل: ${url}`);
      }
    }

    loaded = allOk;

    if (loaded) {
      console.log(`✅ [${FONT_TAG}] تم تحميل خط Cairo (عربي + لاتيني، عادي + عريض) بنجاح - النصوص بالصور راح تشتغل صح`);
    } else {
      console.error(`❌ [${FONT_TAG}] صار خلل بتحميل/تسجيل بعض ملفات خط Cairo (شوف التفاصيل فوق)`);
    }
    return loaded;
  } catch (err) {
    console.error(`❌ [${FONT_TAG}] فشل تحميل خط Cairo:`, err.message);
    console.error('⚠️ النصوص بالصور (بروفايل، ترحيب، مقارنة) ما راح تظهر لين ما ينحل هذا');
    return false;
  }
}

module.exports = { loadArabicFont };
