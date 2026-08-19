const { GlobalFonts } = require('@napi-rs/canvas');

// خط Cairo العربي - من CDN رسمي موثوق (Fontsource عبر jsDelivr، مستخدم بملايين المواقع)
const FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/cairo:vf@5.3.0/arabic-wght-normal.woff2';
const FONT_FALLBACK_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/cairo:vf@5.3.0/latin-wght-normal.woff2';

// نحتفظ بمرجع دائم للبيانات - GlobalFonts.register يستخدم نفس الذاكرة مباشرة
// ولو انجمعت (Garbage Collected) الخط ينكسر لاحقًا، فنخليه حي طول عمر البرنامج
let fontBufferArabic = null;
let fontBufferLatin = null;
let loaded = false;

async function loadArabicFont() {
  if (loaded) return true;

  try {
    const [resAr, resLat] = await Promise.all([fetch(FONT_URL), fetch(FONT_FALLBACK_URL)]);
    if (!resAr.ok) throw new Error(`HTTP ${resAr.status} (arabic)`);
    if (!resLat.ok) throw new Error(`HTTP ${resLat.status} (latin)`);

    fontBufferArabic = Buffer.from(await resAr.arrayBuffer());
    fontBufferLatin = Buffer.from(await resLat.arrayBuffer());

    // نسجل الاثنين تحت نفس اسم العائلة "Cairo" حتى يكمل أحدهم الثاني
    // (الأرقام والنجمة ★ وأي حرف لاتيني موجودة بس بملف الـ latin)
    const okAr = GlobalFonts.register(fontBufferArabic, 'Cairo');
    const okLat = GlobalFonts.register(fontBufferLatin, 'Cairo');
    loaded = okAr && okLat;

    if (loaded) {
      console.log('✅ تم تحميل خط Cairo (عربي + لاتيني) بنجاح - النصوص بالصور راح تشتغل صح');
    } else {
      console.error('❌ فشل تسجيل خط Cairo رغم نجاح التحميل');
    }
    return loaded;
  } catch (err) {
    console.error('❌ فشل تحميل خط Cairo:', err.message);
    console.error('⚠️ النصوص بالصور (بروفايل، ترحيب، مقارنة) ما راح تظهر لين ما ينحل هذا');
    return false;
  }
}

module.exports = { loadArabicFont };
