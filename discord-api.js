const BASE_URL = 'https://discord.com/api/v10';

async function botFetch(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
  return res.json();
}

async function getGuildChannels(guildId) {
  const channels = await botFetch(`/guilds/${guildId}/channels`);
  return channels.filter(c => c.type === 0);
}

async function getGuildRoles(guildId) {
  const roles = await botFetch(`/guilds/${guildId}/roles`);
  return roles.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position);
}

async function getGuildInfo(guildId) {
  return botFetch(`/guilds/${guildId}?with_counts=true`);
}

async function getUserInfo(userId) {
  return botFetch(`/users/${userId}`);
}

module.exports = { getGuildChannels, getGuildRoles, getGuildInfo, getUserInfo };
