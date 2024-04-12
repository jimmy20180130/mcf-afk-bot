const mineflayer = require("mineflayer");
const readline = require("readline");
const autoeat = require('mineflayer-auto-eat').plugin
const fs = require("fs");

let config = JSON.parse(fs.readFileSync("config.json"), 'utf8');

let bot;

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const botArgs = {
    host: config.bot_args.host,
    port: config.bot_args.port,
    username: config.bot_args.username,
    version: config.bot_args.version,
    auth: config.bot_args.auth
};

const initBot = () => {
    bot = mineflayer.createBot(botArgs);
    bot.loadPlugin(autoeat)

    let trade_and_lottery;
    let facility;
    let auto_warp;

    const ad = () => {
        trade_and_lottery = setInterval(function () {
            config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, 'utf8'))
            try {
                if (config.trade_text && config.trade_text !== '') bot.chat(`$${config.trade_text}`)
                if (config.lottery_text && config.lottery_text !== '') bot.chat(`%${config.lottery_text}`)
            } catch {}
        }, 605000)

        facility = setInterval(function () {
            config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, 'utf8'))
            try { if (config.facility_text && config.facility_text !== '') bot.chat(`!${config.facility_text}`) } catch {}
        }, 1805000)

        auto_warp = setInterval(function () {
            config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, 'utf8'))
            try { bot.chat(config.warp) } catch {}
        }, 600000)
    }

    bot.once("login", () => {
        let botSocket = bot._client.socket;
        console.log(
            `已成功登入 ${botSocket.server ? botSocket.server : botSocket._host}`
        );
    });

    bot.once("spawn", () => {
        bot.chat('bot is online')
        console.log(`地圖已載入`);

        try {
            if (config.trade_text && config.trade_text !== '') bot.chat(`$${config.trade_text}`)
            if (config.lottery_text && config.lottery_text !== '') bot.chat(`%${config.lottery_text}`)
            if (config.facility_text && config.facility_text !== '') bot.chat(`!${config.facility_text}`)
        } catch {}

        setTimeout(() => {
            ad()
        }, 5000);

        rl.on("line", function (line) {
            bot.chat(line)
        });
    });

    bot.on("message", (jsonMsg) => {
        var regex = /Summoned to server(\d+) by CONSOLE/;
        if (regex.exec(jsonMsg.toString())) {
            bot.chat(config.server)
            bot.chat(config.warp)
        }

        console.log(jsonMsg.toAnsi());
    });

    bot.on("end", () => {
        console.log(`機器人已斷線，將於 5 秒後重啟`);
        for (listener of rl.listeners('line')) {
            rl.removeListener('line', listener)
        }
        clearInterval(trade_and_lottery)
        clearInterval(facility)
        clearInterval(auto_warp)
        setTimeout(initBot, 5000);
    });

    bot.on("kicked", (reason) => {
        console.log(`機器人被伺服器踢出\n原因：${reason}`);
    });

    bot.on("error", (err) => {
        if (err.code === "ECONNREFUSED") {
            console.log(`連線到 ${err.address}:${err.port} 時失敗`);
        } else {
            console.log(`發生無法預期的錯誤: ${err}`);
        }

        process.exit(1);
    });

    bot.on('autoeat_started', (item, offhand) => {
        console.log(`正在吃 ${offhand ? '副手中' : '主手中'} 的 ${item.name}`)
    })
    
    bot.on('autoeat_finished', (item, offhand) => {
        console.log(`已吃完 ${offhand ? '副手中' : '主手中'} 的 ${item.name}`)
    })
    
    bot.on('autoeat_error', error => {
        if (error.message == 'No food found.') {
            console.log('找不到食物')
        } else {
            console.log(`吃東西時發生錯誤: ${error.message}`)
        }
    })
};

initBot();

process.on("unhandledRejection", async (error) => {
    console.log(error)
    process.exit(1)
});

process.on("uncaughtException", async (error) => {
    console.log(error)
    process.exit(1)
});

process.on("uncaughtExceptionMonitor", async (error) => {
    console.log(error)
    process.exit(1)
});