const { errorEmbed } = require('./embed-helper');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // ------- أوامر السلاش -------
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`❌ خطأ بتنفيذ أمر السلاش "${interaction.commandName}":`, err);
        const payload = { embeds: [errorEmbed('صار خطأ', 'تعذر تنفيذ الأمر، حاول مرة ثانية.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // ------- القائمة التفاعلية لأمر مساعدة -------
    if (interaction.isStringSelectMenu() && interaction.customId === 'help-category-select') {
      const { getCategoryEmbed, buildSelectRow } = require('./text-help');
      const embed = getCategoryEmbed(interaction.values[0]);
      if (embed) await interaction.update({ embeds: [embed], components: [buildSelectRow()] });
    }
  }
};
