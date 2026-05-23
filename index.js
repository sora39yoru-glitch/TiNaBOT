const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const http = require('http');
const fs = require('fs');
const cron = require('node-cron');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
require('dotenv').config();

// Webサーバー
http.createServer((req, res) => { res.write("I am alive!"); res.end(); }).listen(process.env.PORT || 8080);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const DATA_FILE = './data.json';
const loadData = () => fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : {};
const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

const notifyMsgs = ["が通話の深淵へ降り立ちました。", "なる魂が迷い込みました。", "の降臨です。宴の準備は整いました。"];
const bdayMsgs = ["🎉 今日は ${name} さんのお誕生日です！", "🎂 ${name} さんの記念すべき日！", "✨ 本日は ${name} さんの特別な記念日です！"];

// 通話通知（Embed形式へ修正）
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
        const data = loadData();
        const guildData = data[newState.guild.id];
        if (guildData && guildData.notifyChannel) {
            const channel = newState.guild.channels.cache.get(guildData.notifyChannel);
            if (channel) {
                const msg = notifyMsgs[Math.floor(Math.random() * notifyMsgs.length)];
                const embed = new EmbedBuilder()
                    .setTitle('--- 異邦の来訪 ---')
                    .setAuthor({ name: newState.member.displayName, iconURL: newState.member.user.displayAvatarURL() })
                    .setDescription(`<@${newState.member.id}>${msg}\n通話の宴は、幕を開けたばかりである。`)
                    .setColor(0x7289da);
                channel.send({ embeds: [embed] });
            }
        }
    }
});

// インタラクション処理
client.on('interactionCreate', async interaction => {
    const data = loadData();
    const guildId = interaction.guildId;
    if (!data[guildId]) data[guildId] = { notifyChannel: null, birthdays: {} };

    if (interaction.isCommand()) {
        if (interaction.commandName === 'setvc') {
            data[guildId].notifyChannel = interaction.options.getChannel('channel').id;
            saveData(data);
            await interaction.reply('通知チャンネルを設定しました！');
        } else if (interaction.commandName === 'birthday') {
            const sub = interaction.options.getSubcommand();
            if (sub === 'register') {
                const user = interaction.options.getUser('user');
                const date = interaction.options.getString('date');
                data[guildId].temp = { userId: user.id, username: user.username, iconURL: user.displayAvatarURL(), date: date };
                saveData(data);
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('confirm_bday').setLabel('登録を確定する').setStyle(ButtonStyle.Success));
                await interaction.reply({ content: `${user.username} さんの誕生日を ${date} に登録しますか？`, components: [row] });
            } else if (sub === 'list') {
                const list = Object.values(data[guildId].birthdays).map(b => `${b.name}: ${b.date}`).join('\n') || '登録はありません。';
                await interaction.reply(`🎂 **登録済み誕生日一覧**:\n${list}`);
            } else if (sub === 'delete') {
                const user = interaction.options.getUser('user');
                if (data[guildId].birthdays[user.id]) {
                    delete data[guildId].birthdays[user.id];
                    saveData(data);
                    await interaction.reply(`${user.username} さんのデータを削除しました。`);
                } else {
                    await interaction.reply('そのユーザーは登録されていません。');
                }
            }
        }
    } else if (interaction.isButton() && interaction.customId === 'confirm_bday') {
        const temp = data[guildId].temp;
        if (temp) {
            data[guildId].birthdays[temp.userId] = { name: temp.username, date: temp.date, iconURL: temp.iconURL };
            delete data[guildId].temp;
            saveData(data);
            await interaction.update({ content: `✅ ${temp.username} さんの誕生日を登録しました！`, components: [] });
        }
    }
});

// 誕生日自動通知
cron.schedule('0 0 * * *', () => {
    const data = loadData();
    const today = new Date().toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }).replace('/', '-');
    for (const gid in data) {
        const ch = client.channels.cache.get(data[gid].notifyChannel);
        if (ch) {
            for (const uid in data[gid].birthdays) {
                if (data[gid].birthdays[uid].date === today) {
                    const b = data[gid].birthdays[uid];
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: b.name, iconURL: b.iconURL })
                        .setDescription(bdayMsgs[Math.floor(Math.random() * bdayMsgs.length)].replace('${name}', b.name))
                        .setColor(0xffd700);
                    ch.send({ embeds: [embed] });
                }
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
