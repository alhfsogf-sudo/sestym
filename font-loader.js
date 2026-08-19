const { GlobalFonts } = require('@napi-rs/canvas');

// خط Cairo العربي - من CDN رسمي موثوق (Fontsource عبر jsDelivr، مستخدم بملايين المواقع)
const FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/cairo:vf@5.3.0/arabic-wght-normal.woff2';
const FONT_FALLBACK_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/cairo:vf@5.3.0/latin-wght-normal.woff2';

// نحتفظ بمرجع دائم للبيانات - GlobalFonts.register يستخدم نفس الذاكرة مباشرة
// ولو انجمعت (Garbage Collected) الخط ينكسر لاحقًا، فنخليه حي طول عمر البرنامج
let fontBuffer = null;
let loaded = false;

async function loadArabicFont() {
  if (loaded) return true;

  try {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fontBuffer = Buffer.from(await res.arrayBuffer());

    const ok = GlobalFonts.register(fontBuffer, 'Cairo');
    loaded = ok;

    if (ok) {
      console.log('✅ تم تحميل خط Cairo العربي بنجاح - النصوص بالصور راح تشتغل صح');
    } else {
      console.error('❌ فشل تسجيل خط Cairo رغم نجاح التحميل');
    }
    return ok;
  } catch (err) {
    console.error('❌ فشل تحميل خط Cairo:', err.message);
    console.error('⚠️ النصوص بالصور (بروفايل، ترحيب، مقارنة) ما راح تظهر لين ما ينحل هذا');
    return false;
  }
}

module.exports = { loadArabicFont };
