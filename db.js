const { Pool } = require('pg');

// الاتصال بقاعدة بيانات PostgreSQL (Railway يعطيك DATABASE_URL جاهز تلقائي)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// الإعدادات الافتراضية لأي سيرفر جديد (نفس شكل الإعدادات القديم تماماً)
const DEFAULT_SETTINGS = {
  welcome: { enabled: false, channelId: null, message: 'أهلاً {user} بسيرفر {server}! 🎉', withImage: true },
  autoRole: { enabled: false, roleId: null },
  logs: {
    enabled: false, channelId: null,
    events: { messageDelete: true, messageEdit: true, memberJoin: true, memberLeave: true, roleChange: true, banKick: true }
  },
  moderation: {
    badWordsEnabled: false, badWords: [], linkFilterEnabled: false, allowedLinkDomains: [],
    warnLimit: 3, warnAction: 'mute'
  },
  suggestions: { enabled: false, channelId: null, upvoteEmoji: '✅', downvoteEmoji: '❌' },
  leveling: { enabled: false, xpPerMessage: 15, cooldownSeconds: 60, levelUpChannelId: null, roleRewards: [] },
  autoResponses: [],
  adminRoleIds: []
};

const DEFAULT_MEMBER = { xp: 0, level: 0, messageCount: 0, lastXpTimestamp: null, warnings: [], joinedAt: new Date().toISOString() };

// ---------- إنشاء الجداول أول مرة ----------
async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS members (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      PRIMARY KEY (guild_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS suggestions (
      message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS polls (
      message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS backups (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS daily_activity (
      guild_id TEXT NOT NULL,
      day DATE NOT NULL,
      message_count INT NOT NULL DEFAULT 0,
      new_members INT NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, day)
    );
  `);
  console.log('✅ تم التأكد من وجود كل الجداول');
}

// ---------- إعدادات السيرفر ----------
async function getSettings(guildId) {
  const res = await pool.query('SELECT data FROM guild_settings WHERE guild_id = $1', [guildId]);
  if (res.rows.length === 0) {
    await pool.query('INSERT INTO guild_settings (guild_id, data) VALUES ($1, $2)', [guildId, DEFAULT_SETTINGS]);
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...res.rows[0].data };
}

// يحدث قسم واحد بس من الإعدادات (نفس سلوك الكود القديم بالضبط)
async function updateSettings(guildId, partialSection) {
  await getSettings(guildId); // يتأكد إن السطر موجود
  const current = (await pool.query('SELECT data FROM guild_settings WHERE guild_id = $1', [guildId])).rows[0].data;
  const merged = { ...current, ...partialSection };
  await pool.query('UPDATE guild_settings SET data = $2 WHERE guild_id = $1', [guildId, merged]);
  return merged;
}

// ---------- بيانات الأعضاء ----------
async function getMember(guildId, userId) {
  const res = await pool.query('SELECT data FROM members WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
  if (res.rows.length === 0) {
    const fresh = { ...DEFAULT_MEMBER };
    await pool.query('INSERT INTO members (guild_id, user_id, data) VALUES ($1, $2, $3)', [guildId, userId, fresh]);
    return fresh;
  }
  return { ...DEFAULT_MEMBER, ...res.rows[0].data };
}

async function saveMember(guildId, userId, data) {
  await pool.query(
    `INSERT INTO members (guild_id, user_id, data) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET data = $3`,
    [guildId, userId, data]
  );
}

async function getAllMembersSorted(guildId, limit = 10) {
  const res = await pool.query(
    `SELECT user_id, data FROM members WHERE guild_id = $1 ORDER BY (data->>'xp')::bigint DESC LIMIT $2`,
    [guildId, limit]
  );
  return res.rows.map(r => ({ userId: r.user_id, ...r.data }));
}

async function countMembersAbove(guildId, xp) {
  const res = await pool.query(
    `SELECT COUNT(*) FROM members WHERE guild_id = $1 AND (data->>'xp')::bigint > $2`,
    [guildId, xp]
  );
  return parseInt(res.rows[0].count);
}

// ---------- الاقتراحات ----------
async function createSuggestion({ guildId, messageId, channelId, authorId, content }) {
  const data = { authorId, content, upvotes: 0, downvotes: 0, status: 'pending' };
  await pool.query(
    'INSERT INTO suggestions (message_id, guild_id, channel_id, data) VALUES ($1, $2, $3, $4)',
    [messageId, guildId, channelId, data]
  );
}

async function getSuggestion(messageId) {
  const res = await pool.query('SELECT * FROM suggestions WHERE message_id = $1', [messageId]);
  return res.rows[0] || null;
}

async function updateSuggestionVotes(messageId, upvotes, downvotes) {
  const res = await pool.query('SELECT data FROM suggestions WHERE message_id = $1', [messageId]);
  if (!res.rows.length) return;
  const merged = { ...res.rows[0].data, upvotes, downvotes };
  await pool.query('UPDATE suggestions SET data = $2 WHERE message_id = $1', [messageId, merged]);
}

// ---------- الاستطلاعات ----------
async function createPoll({ guildId, messageId, channelId, question, options, emojis, authorId }) {
  const data = { question, options, emojis, authorId, closed: false };
  await pool.query(
    'INSERT INTO polls (message_id, guild_id, channel_id, data) VALUES ($1, $2, $3, $4)',
    [messageId, guildId, channelId, data]
  );
}

// ---------- النسخ الاحتياطية ----------
async function createBackup(guildId, createdBy, data) {
  const res = await pool.query(
    'INSERT INTO backups (guild_id, created_by, data) VALUES ($1, $2, $3) RETURNING id',
    [guildId, createdBy, data]
  );
  return res.rows[0].id;
}

async function getBackupById(id) {
  const res = await pool.query('SELECT * FROM backups WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function getLatestBackup(guildId) {
  const res = await pool.query(
    'SELECT * FROM backups WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 1',
    [guildId]
  );
  return res.rows[0] || null;
}

// ---------- إحصائيات عامة للوحة التحكم ----------
async function getGuildAggregateStats(guildId) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS tracked_members,
            COALESCE(SUM((data->>'messageCount')::bigint), 0)::bigint AS total_messages,
            COALESCE(SUM(jsonb_array_length(data->'warnings')), 0)::int AS total_warnings,
            COALESCE(MAX((data->>'level')::bigint), 0)::bigint AS top_level
     FROM members WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows[0];
}

async function getGuildSuggestionStats(guildId) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS total FROM suggestions WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows[0];
}

// ---------- إدارة الإنذارات من الموقع ----------
async function getMembersWithWarnings(guildId) {
  const res = await pool.query(
    `SELECT user_id, data FROM members
     WHERE guild_id = $1 AND jsonb_array_length(data->'warnings') > 0
     ORDER BY jsonb_array_length(data->'warnings') DESC`,
    [guildId]
  );
  return res.rows.map(r => ({ userId: r.user_id, ...r.data }));
}

async function clearOneWarning(guildId, userId, index) {
  const member = await getMember(guildId, userId);
  member.warnings.splice(index, 1);
  await saveMember(guildId, userId, member);
}

async function clearAllWarningsFor(guildId, userId) {
  const member = await getMember(guildId, userId);
  member.warnings = [];
  await saveMember(guildId, userId, member);
}

// ---------- تتبع النشاط اليومي (للرسم البياني بالموقع) ----------
async function incrementDailyMessage(guildId) {
  await pool.query(
    `INSERT INTO daily_activity (guild_id, day, message_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (guild_id, day) DO UPDATE SET message_count = daily_activity.message_count + 1`,
    [guildId]
  );
}

async function incrementDailyNewMember(guildId) {
  await pool.query(
    `INSERT INTO daily_activity (guild_id, day, new_members)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (guild_id, day) DO UPDATE SET new_members = daily_activity.new_members + 1`,
    [guildId]
  );
}

async function getDailyActivity(guildId, days = 14) {
  const res = await pool.query(
    `SELECT day, message_count, new_members FROM daily_activity
     WHERE guild_id = $1 AND day >= CURRENT_DATE - $2::int
     ORDER BY day ASC`,
    [guildId, days]
  );
  return res.rows;
}

// ---------- تصفير بيانات المستويات (XP/رسائل/مستوى) ----------
async function resetMemberLeveling(guildId, userId) {
  const member = await getMember(guildId, userId);
  member.xp = 0;
  member.level = 0;
  member.messageCount = 0;
  member.lastXpTimestamp = null;
  await saveMember(guildId, userId, member);
}

async function resetAllLeveling(guildId) {
  await pool.query(
    `UPDATE members SET data = data || '{"xp":0,"level":0,"messageCount":0,"lastXpTimestamp":null}'::jsonb WHERE guild_id = $1`,
    [guildId]
  );
}

module.exports = {
  pool, initTables,
  getSettings, updateSettings,
  getMember, saveMember, getAllMembersSorted, countMembersAbove,
  createSuggestion, getSuggestion, updateSuggestionVotes,
  createPoll,
  createBackup, getBackupById, getLatestBackup,
  getGuildAggregateStats, getGuildSuggestionStats,
  getMembersWithWarnings, clearOneWarning, clearAllWarningsFor,
  incrementDailyMessage, incrementDailyNewMember, getDailyActivity,
  resetMemberLeveling, resetAllLeveling
};
