const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { COLORS, errorEmbed } = require('./embed-helper');

// كل الأوامر مبوبة يدويًا بترتيب منطقي - نص وصفي قصير لكل وحد
const CATEGORIES = [
  {
    id: 'welcome',
    title: '👋 الترحيب والانضمام',
    note: 'يُدار من لوحة التحكم على الموقع، ما فيه أوامر مباشرة',
    commands: []
  },
  {
    id: 'members',
    title: '🔨 إدارة الأعضاء',
    commands: [
      ['دي @عضو [سبب]', 'طرد العضو من السيرفر'],
      ['اعدام @عضو [سبب]', 'حظر العضو نهائيًا'],
      ['اعفاء [آيدي]', 'فك الحظر عن عضو بالآيدي'],
      ['سجن @عضو 10د [سبب]', 'حظر مؤقت يرفع تلقائي (د/س/ي أو m/h/d)'],
      ['محي @عضو [سبب]', 'سوفت بان: طرد + حذف رسائله بدون حظر دائم'],
      ['لتمضرط @عضو 10د [سبب]', 'كتم مؤقت (Timeout)'],
      ['مضرط @عضو', 'فك الكتم'],
      ['دلع @عضو [اسم]', 'تغيير الاسم المستعار (نك نيم)']
    ]
  },
  {
    id: 'warnings',
    title: '⚠️ الإنذارات',
    commands: [
      ['تحذير @عضو [سبب]', 'إعطاء إنذار للعضو'],
      ['تحذيرات @عضو', 'عرض كل إنذارات العضو'],
      ['شيل @عضو [رقم]', 'حذف إنذار معين'],
      ['شيل_الكل @عضو', 'مسح كل إنذارات العضو']
    ]
  },
  {
    id: 'messages',
    title: '💬 الرسائل',
    commands: [
      ['مسح [عدد]', 'حذف عدد رسائل بالجملة'],
      ['مسح_عضو @عضو [عدد]', 'حذف رسائل عضو معين بس'],
      ['مسح_يحتوي [كلمة]', 'حذف الرسائل اللي تحتوي كلمة'],
      ['مسح_بوتات', 'حذف رسائل البوتات'],
      ['تثبيت / الغاء_تثبيت', 'رد على رسالة واكتب الأمر']
    ]
  },
  {
    id: 'channels',
    title: '📁 القنوات',
    commands: [
      ['قفل / فتح', 'قفل أو فتح القناة الحالية'],
      ['قفل_الكل / فتح_الكل', 'قفل أو فتح كل قنوات السيرفر'],
      ['انشاء_قناة [اسم]', 'إنشاء قناة نصية'],
      ['حذف_قناة', 'حذف القناة الحالية'],
      ['تسمية_قناة [اسم]', 'تغيير اسم القناة'],
      ['تصنيف [اسم]', 'إنشاء فئة (Category)'],
      ['بطء [ثواني] / بطء_الغاء', 'تفعيل أو إلغاء السلومود'],
      ['نقل_قناة [تصنيف]', 'نقل القناة لفئة ثانية']
    ]
  },
  {
    id: 'roles',
    title: '🎭 الرتب',
    commands: [
      ['اعطاء_رتبه / سحب_رتبه @عضو [رتبة]', 'إعطاء أو سحب رتبة'],
      ['انشاء_رتبه [#لون] [اسم]', 'إنشاء رتبة جديدة'],
      ['حذف_رتبه [اسم]', 'حذف رتبة'],
      ['اعطاء_رتبه_للكل [رتبة]', 'إعطاء رتبة لكل الأعضاء دفعة وحدة']
    ]
  },
  {
    id: 'voice',
    title: '🔊 الصوتيات',
    commands: [
      ['دخول', 'البوت يدخل الروم الصوتي وياخذ AFK دائم'],
      ['خروج', 'البوت يطلع من الروم الصوتي'],
      ['سحب_صوت @عضو', 'إخراج عضو من الروم الصوتي'],
      ['نقل_صوت @عضو [روم]', 'نقل عضو لروم صوتي ثاني'],
      ['كتم_صوت / فك_كتم_صوت @عضو', 'كتم صوت العضو بالروم'],
      ['قفل_الروم_الصوتي [اسم]', 'منع الدخول لروم صوتي']
    ]
  },
  {
    id: 'server',
    title: '🌐 السيرفر العام',
    commands: [
      ['اعلان [نص]', 'إرسال إعلان منسق'],
      ['معلومات_السيرفر', 'بطاقة معلومات السيرفر (الشعار، البوستات...)'],
      ['الدعوات', 'عرض روابط الدعوة الفعالة'],
      ['حذف_دعوة [كود]', 'حذف رابط دعوة'],
      ['تغيير_اسم_السيرفر [اسم]', 'تغيير اسم السيرفر'],
      ['تغيير_شعار_السيرفر', 'أرفق صورة مع الأمر']
    ]
  },
  {
    id: 'emoji',
    title: '😀 الايموجي',
    commands: [
      ['اضافة_ايموجي [رابط] [اسم]', 'إضافة ايموجي مخصص'],
      ['حذف_ايموجي [اسم]', 'حذف ايموجي'],
      ['قائمة_الايموجي', 'عرض كل ايموجيات السيرفر']
    ]
  },
  {
    id: 'other',
    title: '🗂️ أخرى',
    commands: [
      ['بروفايل [@عضو]', 'بطاقة الملف الشخصي (لك أو لعضو ثاني)'],
      ['احصائياتي', 'إحصائياتك الشخصية: ترتيبك، تقدير المستوى الجاي'],
      ['مقارنة @عضو @عضو', 'مقارنة بصرية بين عضوين'],
      ['معلومات', 'معلومات البوت (مدة التشغيل، السرعة...)'],
      ['سجل_عضو @عضو', 'ملف شامل عن العضو (تاريخ، رتب، إنذارات...)'],
      ['نسخة_احتياطية', 'حفظ نسخة من الرتب والقنوات'],
      ['استعادة [آيدي]', 'استعادة آخر نسخة أو نسخة محددة'],
      ['اعاده_تعيين_المستويات @عضو أو الكل', 'تصفير XP والمستوى (لعضو أو للسيرفر كامل)']
    ]
  }
];

const SLASH_COMMANDS = [
  ['/اقتراح', 'تقديم اقتراح مع تصويت وخط تقدم'],
  ['/استطلاع', 'إنشاء استطلاع رأي بخيارات متعددة'],
  ['/المتصدرين', 'أفضل 10 أعضاء بالمستوى']
];

module.exports = {
  'مساعدة': {
    permission: PermissionFlagsBits.SendMessages,
    label: 'الاستخدام العام',
    deleteInvoke: false,
    async execute(message, args) {
      const query = args.join(' ').trim();

      if (!query) return sendOverview(message);

      const match = CATEGORIES.find(cat => cat.title.includes(query));
      if (match) return sendCategory(message, match);

      return message.reply({ embeds: [errorEmbed('غير موجود', 'ما لقيت قسم بهذا الاسم. اكتب `مساعدة` بروحها بدون كلمة زايدة لعرض كل الأقسام.')] });
    }
  }
};

function buildSelectRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('help-category-select')
    .setPlaceholder('📖 اختر قسم لعرض تفاصيله...')
    .addOptions(CATEGORIES.map(cat => ({ label: cat.title.replace(/[^\u0600-\u06FF\s]/g, '').trim(), value: cat.id, emoji: cat.title.split(' ')[0] })));

  return new ActionRowBuilder().addComponents(menu);
}

function buildOverviewEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setAuthor({ name: `دليل أوامر ${guild.name}`, iconURL: guild.iconURL() || undefined })
    .setDescription(
      'كل أوامر الإدارة تُكتب **مباشرة بالرسالة بدون /** (عدا الأوامر أسفل القائمة، هذي بس اللي بسلاش).\n' +
      'كل أمر يظهر لك بس لو عندك صلاحيته الفعلية بديسكورد.\n\n' +
      '**استخدم القائمة تحت لعرض قسم معين بالتفصيل** 👇'
    )
    .setTimestamp();

  for (const cat of CATEGORIES) {
    if (cat.commands.length === 0) {
      embed.addFields({ name: cat.title, value: cat.note || '​', inline: false });
      continue;
    }
    const preview = cat.commands.slice(0, 3).map(([cmd]) => `\`${cmd.split(' ')[0]}\``).join(' ');
    const more = cat.commands.length > 3 ? ` +${cat.commands.length - 3}` : '';
    embed.addFields({ name: cat.title, value: `${preview}${more}`, inline: true });
  }

  embed.addFields({
    name: '⚡ أوامر السلاش',
    value: SLASH_COMMANDS.map(([cmd, desc]) => `${cmd} — ${desc}`).join('\n')
  });

  return embed;
}

async function sendOverview(message) {
  await message.reply({ embeds: [buildOverviewEmbed(message.guild)], components: [buildSelectRow()] });
}

async function sendCategory(message, category) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(category.title)
    .setDescription(
      category.commands.length === 0
        ? category.note
        : category.commands.map(([cmd, desc]) => `\`${cmd}\`\n${desc}`).join('\n\n')
    )
    .setTimestamp();

  await message.reply({ embeds: [embed], components: [buildSelectRow()] });
}

// يستخدمها event-interactionCreate.js لما حد يختار من القائمة التفاعلية
function getCategoryEmbed(categoryId) {
  const category = CATEGORIES.find(c => c.id === categoryId);
  if (!category) return null;

  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(category.title)
    .setDescription(
      category.commands.length === 0
        ? category.note
        : category.commands.map(([cmd, desc]) => `\`${cmd}\`\n${desc}`).join('\n\n')
    )
    .setTimestamp();
}

module.exports.getCategoryEmbed = getCategoryEmbed;
module.exports.buildSelectRow = buildSelectRow;
module.exports.CATEGORIES = CATEGORIES;
module.exports.SLASH_COMMANDS = SLASH_COMMANDS;
