const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureGuildAdmin } = require('./auth-middleware');
const db = require('./db');

const base = '/:guildId';

router.post(`${base}/welcome`, ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
  const { enabled, channelId, message, withImage } = req.body;
  await db.updateSettings(req.params.guildId, {
    welcome: {
      enabled: enabled === 'on',
      channelId: channelId || null,
      message: message || 'أهلاً {user} بسيرفر {server}! 🎉',
      withImage: withImage === 'on'
    }
  });
  res.redirect(`/dashboard/${req.params.guildId}?saved=welcome`);
});

router.post(`${base}/autorole`, ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
  const { enabled, roleId } = req.body;
  await db.updateSettings(req.params.guildId, { autoRole: { enabled: enabled === 'on', roleId: roleId || null } });
  res.redirect(`/dashboard/${req.params.guildId}?saved=autorole`);
});

router.post(`${base}/logs`, ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
  const { enabled, channelId, messageDelete, messageEdit, memberJoin, memberLeave, roleChange, banKick } = req.body;
  await db.updateSettings(req.params.guildId, {
    logs: {
      enabled: enabled === 'on',
      channelId: channelId || null,
      events: {
        messageDelete: messageDelete === 'on',
        messageEdit: messageEdit === 'on',
        memberJoin: memberJoin === 'on',
        memberLeave: memberLeave === 'on',
        roleChange: roleChange === 'on',
        banKick: banKick === 'on'
      }
    }
  });
  res.redirect(`/dashboard/${req.params.guildId}?saved=logs`);
});

router.post(`${base}/moderation`, ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
  const { badWordsEnabled, badWords, linkFilterEnabled, allowedLinkDomains, warnLimit, warnAction } = req.body;
  await db.updateSettings(req.params.guildId, {
    moderation: {
      badWordsEnabled: badWordsEnabled === 'on',
      badWords: (badWords || '').split(',').map(w => w.trim()).filter(Boolean),
      linkFilterEnabled: linkFilterEnabled === 'on',
      allowedLinkDomains: (allowedLinkDomains || '').split(',').map(d => d.trim()).filter(Boolean),
      warnLimit: parseInt(warnLimit) || 3,
      warnAction: warnAction || 'mute'
    }
  });
  res.redirect(`/dashboard/${req.params.guildId}?saved=moderation`);
});

router.post(`${base}/suggestions`, ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
  const { enabled, channelId, upvoteEmoji, downvoteEmoji } = req.body;
  await db.updateSettings(req.params.guildId, {
    suggestions: { enabled: enabled === 'on', channelId: channelId || null, upvoteEmoji: upvoteEmoji || '✅', downvoteEmoji: downvoteEmoji || '❌' }
  });
  res.redirect(`/dashboard/${req.params.guildId}?saved=suggestions`);
});

router.post(`${base}/leveling`, ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
  const { enabled, xpPerMessage, cooldownSeconds, levelUpChannelId, rewardLevels, rewardRoles } = req.body;

  const levels = Array.isArray(rewardLevels) ? rewardLevels : [rewardLevels].filter(Boolean);
  const roles = Array.isArray(rewardRoles) ? rewardRoles : [rewardRoles].filter(Boolean);
  const roleRewards = levels.map((lvl, i) => ({ level: parseInt(lvl), roleId: roles[i] })).filter(r => r.level && r.roleId);

  // حماية من أرقام خاطئة (زي لصق معرف ديسكورد بالغلط) تفسد نظام الـ XP بالكامل
  const safeXpPerMessage = clamp(parseInt(xpPerMessage) || 15, 1, 1000);
  const safeCooldown = clamp(parseInt(cooldownSeconds) || 60, 0, 86400);

  await db.updateSettings(req.params.guildId, {
    leveling: {
      enabled: enabled === 'on',
      xpPerMessage: safeXpPerMessage,
      cooldownSeconds: safeCooldown,
      levelUpChannelId: levelUpChannelId || null,
      roleRewards
    }
  });
  res.redirect(`/dashboard/${req.params.guildId}?saved=leveling`);
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

router.post(`${base}/autoresponses`, ensureAuthenticated, ensureGuildAdmin, async (req, res) => {
  const { triggers, responses, exactMatches } = req.body;

  const triggerList = Array.isArray(triggers) ? triggers : [triggers].filter(Boolean);
  const responseList = Array.isArray(responses) ? responses : [responses].filter(Boolean);
  const exactList = Array.isArray(exactMatches) ? exactMatches : [exactMatches].filter(Boolean);

  const autoResponses = triggerList.map((trigger, i) => ({
    trigger, response: responseList[i] || '', exactMatch: exactList.includes(String(i))
  })).filter(a => a.trigger && a.response);

  await db.updateSettings(req.params.guildId, { autoResponses });
  res.redirect(`/dashboard/${req.params.guildId}?saved=autoresponses`);
});

module.exports = router;
