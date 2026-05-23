const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const http = require('http');
const fs = require('fs');
const cron = require('node-cron');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
require('dotenv').config();

http.createServer((req, res) => { res.write("I am alive!"); res.end(); }).listen(process.env.PORT || 8080);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const DATA_FILE = './data.json';
const loadData = () => fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : { notifyChannel: null, birthdays: {} };
const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// --- 1. 通話通知 ---
client.on('voiceStateUpdate', (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
        const data = loadData();
        const notifyChannel = client.channels.cache.get(data.notifyChannel);
        if (notifyChannel) {
            notifyChannel.send({ embeds: [new EmbedBuilder().setColor('#800080').setDescription(`<@${newState.member.user.id}> が通話に参加しました！`)] });
        }
    }
});

// --- 2. スラッシュコマンド受け取り ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const data = loadData();

    if (interaction.commandName === 'setvc') {
        data.notifyChannel = interaction.options.getChannel('channel').id;
        saveData(data);
        await interaction.reply('通知チャンネルを更新しました！');
    }
    if (interaction.commandName === 'birthday') {
        const sub = interaction.options.getSubcommand();
        if (sub === 'register') {
            const user = interaction.options.getUser('user');
            const date = interaction.options.getString('date');
            data.birthdays[user.id] = { name: user.username, date: date };
            saveData(data);
            await interaction.reply(`${user.username} さんの誕生日を ${date} に登録しました！`);
        }
    }
});

// --- 3. 誕生日チェック ---
cron.schedule('0 0 * * *', () => {
    const data = loadData();
    const today = new Date().toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }).replace('/', '-');
    const channel = client.channels.cache.get(data.notifyChannel);
    if (channel) {
        for (const userId in data.birthdays) {
            if (data.birthdays[userId].date === today) channel.send(`🎉 今日は ${data.birthdays[userId].name} さんのお誕生日です！`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

// --- 4. コマンド自動登録 ---
const commands = [
  new SlashCommandBuilder().setName('setvc').setDescription('通知チャンネルを設定').addChannelOption(o => o.setName('channel').setDescription('チャンネル').setRequired(true)),
  new SlashCommandBuilder().setName('birthday').setDescription('誕生日機能').addSubcommand(s => s.setName('register').addUserOption(o => o.setName('user').setDescription('人').setRequired(true)).addStringOption(o => o.setName('date').setDescription('日付(05-23)').setRequired(true)))
].map(c => c.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('コマンド登録完了！');
    } catch (e) { console.error(e); }
})();
