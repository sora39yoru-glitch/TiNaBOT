const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const http = require('http');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();

// Webサーバー起動（Render用）
http.createServer((req, res) => { res.write("I am alive!"); res.end(); }).listen(process.env.PORT || 8080);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const DATA_FILE = './data.json';
const loadData = () => fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : { notifyChannel: null, birthdays: {} };
const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// 通話通知
client.on('voiceStateUpdate', (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
        const data = loadData();
        const notifyChannel = client.channels.cache.get(data.notifyChannel);
        if (notifyChannel) {
            notifyChannel.send({ embeds: [new EmbedBuilder().setColor('#800080').setDescription(`<@${newState.member.user.id}> が通話に参加しました！`)] });
        }
    }
});

// スラッシュコマンド処理
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const data = loadData();

    if (interaction.commandName === 'set-notify') {
        data.notifyChannel = interaction.options.getChannel('channel').id;
        saveData(data);
        await interaction.reply('通知チャンネルを設定しました！');
    }
    if (interaction.commandName === 'set-birthday') {
        const user = interaction.options.getUser('user');
        const date = interaction.options.getString('date');
        data.birthdays[user.id] = { name: user.username, date: date };
        saveData(data);
        await interaction.reply(`${user.username} さんの誕生日を ${date} に登録しました！`);
    }
});

// 毎日0時に誕生日チェック
cron.schedule('0 0 * * *', () => {
    const data = loadData();
    const today = new Date().toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }).replace('/', '-');
    const channel = client.channels.cache.get(data.notifyChannel);
    if (!channel) return;

    for (const userId in data.birthdays) {
        if (data.birthdays[userId].date === today) {
            channel.send(`🎉 今日は ${data.birthdays[userId].name} さんのお誕生日です！おめでとう！`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
