const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => console.log('Bot is online!'));
client.on('messageCreate', (msg) => {
  if (msg.content === 'ping') msg.reply('pong!');
});

client.login(process.env.DISCORD_TOKEN);
