import axios from 'axios';
import dotenv from 'dotenv';
import { Client, GuildChannel, Intents, MessageEmbed } from 'discord.js';
dotenv.config();

const SLEEP_TIME = parseInt(process.env.SLEEP_TIME) * 60 * 1000;
const DISCORD_LISTEN = process.env.DISCORD_LISTEN.split(',');
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_PREFIX = process.env.DISCORD_PREFIX;

const GATE_IO_API = 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=wit_usdt';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let currentPrice = null;
let currentPriceChange = null;

const requestGateIo = () => new Promise((resolve) => {
  axios.get(GATE_IO_API)
    .then(res => {
      resolve(res.data);
    })
    .catch(err => {
      console.log(err);
      resolve(null);
    });
});

const main = async () => {
  while (true) {
    const data = await requestGateIo();

    if (data) {
      console.log('- received gate.io data');

      const wit = data[0];
      const price = wit.last;
      const priceChange = wit.change_percentage;

      let priceChangeStatus = '';

      if (priceChange > 0) {
        priceChangeStatus += '+';
      } else if (priceChange < 0) {
        priceChangeStatus += '-';
      }

      priceChangeStatus += `${priceChange}%`;
      const status = `$${price} (${priceChangeStatus})`;
      
      try {
        client.user.setActivity(status);

        console.log(`- status updated`)
      } catch (err) {
        console.log(err);
      }

      currentPrice = price;
      currentPriceChange = priceChange;
    } else {
      console.log('- gate.io request error');
    }

    await sleep(SLEEP_TIME);
  }
}

client.on('messageCreate', msg => {
  if (msg.author.bot || currentPrice === null || !msg.content.startsWith(DISCORD_PREFIX)) return;

  let listen = false;
  if (DISCORD_LISTEN[0] !== '') { 
    for (const discordListen of DISCORD_LISTEN) {
      const chatGuildChannel = `${msg.guildId}/${msg.channelId}`;
      if (chatGuildChannel == discordListen) {
        listen = true;
        break;
      }
    }
  } else {
    listen = true;
  }
  
  if (listen) {
    let args = msg.content.slice(DISCORD_PREFIX.length).split(/ +/);
    let cmd = args.shift().toLocaleLowerCase();

    if (cmd === 'price') {
      let changeStatus = '';
      let rep = 'Current price: ';
      if (currentPriceChange > 0) {
        changeStatus += '+';
      } else if (currentPriceChange < 0) {
        changeStatus += '-';
      } else {
        rep += '\n';
      }
      rep += `**$${currentPrice.toLocaleString()}** (*${changeStatus}${currentPriceChange}%*)`;

      msg.reply(rep)
        .then(m => {
          setTimeout(() => {
            m.delete()
              .then(() => {
                msg.delete()
                  .catch(err => {
                    console.log(err);
                  });
              }).catch(err => {
                console.log(err);
              });
          }, 30000);
        }).catch(err => {
          console.log(err);
        });
    } else if (cmd == 'links') {
      const embed = new MessageEmbed()
        .setTitle('Official Links')
        .setAuthor({ name: 'Witnet Network', iconURL: 'https://avatars.githubusercontent.com/u/33759927?s=280&v=4', url: 'https://witnet.io/' })
        .addField('Website', '[witnet.io](https://witnet.io/)')
        .addField('Wallet', '[sheikah](https://sheikah.app/)')
        .addField('Explorer', '[witnet.network](https://witnet.network/)')
        .addField('Twitter', '[@witnet.io](https://twitter.com/witnet_io)')
        .addField('Reddit', '[r/witnet](https://www.reddit.com/r/witnet/)')
        .addField('Telegram', '[witnetio](https://t.me/witnetio)')
        .addField('Whitepaper', '[witnet-whitepaper.pdf](https://witnet.io/witnet-whitepaper.pdf)')
        .setFooter({ text: 'The next generation crypto Oracle.' });

      msg.reply({ embeds: [embed] })
        .then(m => {
          setTimeout(() => {
            m.delete()
              .then(() => {
                msg.delete()
                  .catch(err => {
                    console.log(err);
                  });
              }).catch(err => {
                console.log(err);
              });
          }, 60000);
        }).catch(err => {
          console.log(err);
        });
    } else if (cmd == 'help') {
      const embed = new MessageEmbed()
        .setTitle('Witnet Bot Commands')
        .addField('/price', 'See the current price per WIT and the 24h change.')
        .addField('/links', 'See the list of official links in Witnet community.');

      msg.reply({ embeds: [embed] })
        .then(m => {
          setTimeout(() => {
            m.delete()
              .then(() => {
                msg.delete()
                  .catch(err => {
                    console.log(err);
                  });
              }).catch(err => {
                console.log(err);
              });
          }, 30000);
        }).catch(err => {
          console.log(err);
        });
    }
  }
});

client.once('ready', () => {
  console.log(`Discord bot running...`);
  main();
});

client.login(DISCORD_BOT_TOKEN);

// Graceful exits
process.once('SIGINT', () => {
  client.destroy();
  process.exit(0);
});
process.once('SIGTERM', () => {
  client.destroy();
  process.exit(0);
});
