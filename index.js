const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
const loadData = () => fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : {};
const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// メッセージ集
const notifyMsgs = ["が通話の深淵へ降り立ちました。", "なる魂が迷い込みました。", "の降臨です。"];
const bdayMsgs = ["🎉 今日は ${name} さんのお誕生日です！", "🎂 ${name} さんの記念すべき日です！"];

client.on('voiceStateUpdate', (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
        const data = loadData();
        const guildData = data[newState.guild.id];
        if (guildData && guildData.notifyChannel) {
            const channel = newState.guild.channels.cache.get(guildData.notifyChannel);
            if (channel) {
                const msg = notifyMsgs[Math.floor(Math.random() * notifyMsgs.length)];
                channel.send(`<@${newState.member.user.id}>${msg}`);
            }
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const data = loadData();
        const guildId = interaction.guildId;
        if (!data[guildId]) data[guildId] = { notifyChannel: null, birthdays: {} };

        if (interaction.commandName === 'setvc') {
            data[guildId].notifyChannel = interaction.options.getChannel('channel').id;
            saveData(data);
            await interaction.reply('このサーバーの通知チャンネルを設定しました！');
        } else if (interaction.commandName === 'birthday') {
            const sub = interaction.options.getSubcommand();
            if (sub === 'register') {
                const user = interaction.options.getUser('user');
                const date = interaction.options.getString('date');
                // 一時的にデータを保存（ボタン押下後に確定させるためにIDを保存）
                data[guildId].temp = { userId: user.id, username: user.username, date: date };
                saveData(data);
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_bday').setLabel('登録を確定する').setStyle(ButtonStyle.Success)
                );
                await interaction.reply({ content: `${user.username} さんの誕生日を ${date} に登録しますか？`, components: [row] });
            }
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'confirm_bday') {
            const data = loadData();
            const guildId = interaction.guildId;
            const temp = data[guildId].temp;
            if (temp) {
                data[guildId].birthdays[temp.userId] = { name: temp.username, date: temp.date };
                delete data[guildId].temp;
                saveData(data);
                await interaction.update({ content: `✅ ${temp.username} さんの誕生日を登録しました！`, components: [] });
            }
        }
    }
});

cron.schedule('0 0 * * *', () => {
    const data = loadData();
    const today = new Date().toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }).replace('/', '-');
    for (const guildId in data) {
        const guildData = data[guildId];
        const channel = client.channels.cache.get(guildData.notifyChannel);
        if (!channel) continue;
        for (const userId in guildData.birthdays) {
            if (guildData.birthdays[userId].date === today) {
                const name = guildData.birthdays[userId].name;
                channel.send(bdayMsgs[Math.floor(Math.random() * bdayMsgs.length)].replace('${name}', name));
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
