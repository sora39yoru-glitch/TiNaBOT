const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const http = require('http');

// RenderのWebサーバー用（これがないとRenderが止まるため必要です）
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 魂の宿る通知メッセージ
const messages = [
  "が無窮の静寂を切り裂き、通話の深淵へ降り立ちました。彼/彼女が求めるは、混沌か、それとも安らぎか。",
  "なる魂が、通話という名の迷宮に迷い込みました。誰か、その光なき道を照らしてあげようとする者はおりませぬか？",
  "の降臨です。鼓膜を揺らす声の調べを求める者がまた一人。宴の準備は整いました。",
  "が、この閉ざされた楽園の扉を開きました。さぁ、共に語り、共に夢を語らいましょう。"
];

client.on('voiceStateUpdate', (oldState, newState) => {
  // 通話に入ったときだけ（かつ、bot自身ではないとき）
  if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
    const user = newState.member.user;
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    
    // 【重要】ここに通知させたいチャンネルIDを入れ替えてください！
    const notifyChannel = client.channels.cache.get('1172895472021684375'); 
    
    if (notifyChannel) {
      const embed = new EmbedBuilder()
        .setColor('#800080')
        .setTitle('--- 異邦人の来訪 ---')
        .setDescription(`<@${user.id}>${randomMsg}`)
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: '通話の宴は、幕を開けたばかりである。' })
        .setTimestamp();

      notifyChannel.send({ content: '@everyone', embeds: [embed] });
    }
  }
});

client.on('ready', () => console.log('Bot is online!'));
client.login(process.env.DISCORD_TOKEN);


// --- サーバー起動用（UptimeRobot対策） ---
const http = require('http');
http.createServer((req, res) => {
  res.write("I am alive!");
  res.end();
}).listen(8080);

// サーバーを立ててUptimeRobotの呼びかけに応答する
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write("I am alive!");
  res.end();
}).listen(8080);

const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder().setName('set-notify').setDescription('通知チャンネルを設定します').addChannelOption(option => option.setName('channel').setDescription('対象のチャンネル').setRequired(true)),
  new SlashCommandBuilder().setName('set-birthday').setDescription('誕生日を登録します').addUserOption(option => option.setName('user').setDescription('対象ユーザー').setRequired(true)).addStringOption(option => option.setName('date').setDescription('日付(例: 05-23)').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('スラッシュコマンドの登録に成功しました！');
  } catch (error) {
    console.error(error);
  }
})();


