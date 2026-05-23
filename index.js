const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const http = require('http');
const fs = require('fs');
const cron = require('node-cron');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
require('dotenv').config();

// 1. Webサーバー（Render用）
http.createServer((req, res) => { res.write("I am alive!"); res.end(); }).listen(process.env.PORT || 8080);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const DATA_FILE = './data.json';
const loadData = () => fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : { notifyChannel: null, birthdays: {} };
const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// 2. メッセージバリエーション
const notifyMsgs = [
  "が無窮の静寂を切り裂き、通話の深淵へ降り立ちました。彼/彼女が求めるは、混沌か、それとも安らぎか。",
  "なる魂が、通話という名の迷宮に迷い込みました。誰か、その光なき道を照らしてあげようとする者はおりませぬか？",
  "の降臨です。鼓膜を揺らす声の調べを求める者がまた一人。宴の準備は整いました。",
  "が、この閉ざされた楽園の扉を開きました。さぁ、共に語り、共に夢を語らいましょう。"
];

const bdayMsgs = [
  "🎉 今日は ${name} さんのお誕生日です！素晴らしい一年になりますように！",
  "🎂 ${name} さんの生誕の日！心からお祝い申し上げます。",
  "✨ 本日は ${name} さんの記念日。喜び溢れる一日となりますように！",
  "🎈 今日という特別な日に、${name} さんへ祝福の調べを贈ります。"
];

// 3. 通話通知機能
client.on('voiceStateUpdate', (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
        const data = loadData();
        const notifyChannel = client.channels.cache.get(data.notifyChannel);
        if (notifyChannel) {
            const randomMsg = notifyMsgs[Math.floor(Math.random() * notifyMsgs.length)];
            const embed = new EmbedBuilder()
                .setColor('#800080')
                .setTitle('--- 異邦人の来訪 ---')
                .setDescription(`<@${newState.member.user.id}>${randomMsg}`)
                .setThumbnail(newState.member.user.displayAvatarURL())
                .setFooter({ text: '通話の宴は、幕を開けたばかりである。' })
                .setTimestamp();
            notifyChannel.send({ embeds: [embed] });
        }
    }
});

// 4. コマンド処理
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

// 5. 誕生日自動お祝い
cron.schedule('0 0 * * *', () => {
    const data = loadData();
    const today = new Date().toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }).replace('/', '-');
    const channel = client.channels.cache.get(data.notifyChannel);
    if (!channel) return;

    for (const userId in data.birthdays) {
        if (data.birthdays[userId].date === today) {
            const name = data.birthdays[userId].name;
            const randomMsg = bdayMsgs[Math.floor(Math.random() * bdayMsgs.length)].replace('${name}', name);
            channel.send(randomMsg);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

// 6. コマンド登録
const commands = [
  new SlashCommandBuilder().setName('setvc').setDescription('通知チャンネルを設定').addChannelOption(o => o.setName('channel').setDescription('チャンネル').setRequired(true)),
  new SlashCommandBuilder().setName('birthday').setDescription('誕生日機能')
    .addSubcommand(s => s.setName('register').setDescription('誕生日を登録').addUserOption(o => o.setName('user').setDescription('人').setRequired(true)).addStringOption(o => o.setName('date').setDescription('日付(05-23)').setRequired(true)))
].map(c => c.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('★ スラッシュコマンドの自動登録が完了しました！');
    } catch (e) { console.error(e); }
})();
