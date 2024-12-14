const mineflayer = require("mineflayer");
const readline = require("readline");
const autoeat = require("mineflayer-auto-eat").plugin;
const fs = require("fs");
const moment = require('moment-timezone');
const Logger = require('./logger');

let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, 'utf8'))

let bot;

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let intervals = [];

const botArgs = {
    host: config.bot_args.host,
    port: config.bot_args.port,
    username: config.bot_args.username,
    version: '1.20.1',
    auth: 'microsoft',
    physicsEnabled: true,
};

const initBot = () => {
    bot = mineflayer.createBot(botArgs);
    bot.loadPlugin(autoeat);

    const ad = () => {
        let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, 'utf8'))

        for (let item of config.advertisement) {
            intervals.push(setInterval(async () => {
                try {
                    bot.chat(item.text)
                    Logger.log(`發送廣告: ${item.text}`)
                } catch (e) {
                    Logger.error(`發送廣告時發生錯誤: ${e}`)
                }
            }, item.interval))
        }
    }

    bot.once("login", () => {
        let botSocket = bot._client.socket;
        Logger.log(`已成功登入 ${botSocket.server ? botSocket.server : botSocket._host}`);
    });

    bot.once("spawn", () => {
        bot.chat(`[${moment(new Date()).tz('Asia/Taipei').format('HH:mm:ss')}] Jimmy Bot 已上線!`);
        Logger.log(`地圖已載入`);
        let config = JSON.parse(fs.readFileSync(`${process.cwd()}/config.json`, 'utf8'))

        try {
            for (let item of config.advertisement) {
                if (item.text && item.interval) bot.chat(item.text);
            }
        } catch (e) {
            Logger.error(`發送廣告時發生錯誤: ${e}`)
        }

        setTimeout(() => {
            ad();
        }, 5000);

        rl.on("line", function (line) {
            bot.chat(line);
        });
    });

    bot.on("message", (jsonMsg) => {
        var regex = /Summoned to server(\d+) by Logger/;
        if (regex.exec(jsonMsg.toString())) {
            bot.chat(config.server);
            bot.chat(config.warp);
        }

        Logger.log(jsonMsg.toAnsi());
    });

    bot.on("physicsTick", () => {
        for (const entity of Object.values(bot.entities)) {
            if (entity === bot.entity) {
                continue;
            }
            applyEntityCollision(entity);
        }
    });

    bot.on("end", () => {
        Logger.warn(`機器人已斷線，將於 5 秒後重啟`);
        for (listener of rl.listeners("line")) {
            rl.removeListener("line", listener);
        }
        
        for (let interval of intervals) {
            clearInterval(interval);
        }

        setTimeout(initBot, 5000);
    });

    bot.on("kicked", (reason) => {
        Logger.warn(`機器人被伺服器踢出\n原因：${reason}`);
    });

    bot.on("error", (err) => {
        if (err.code === "ECONNREFUSED") {
            Logger.error(`連線到 ${err.address}:${err.port} 時失敗`);
        } else {
            Logger.error(`發生無法預期的錯誤: ${err}`);
        }

        process.exit(1);
    });

    bot.on("autoeat_started", (item, offhand) => {
        Logger.log(`正在吃 ${offhand ? "副手中" : "主手中"} 的 ${item.name}`);
    });

    bot.on("autoeat_finished", (item, offhand) => {
        Logger.log(`已吃完 ${offhand ? "副手中" : "主手中"} 的 ${item.name}`);
    });

    bot.on("autoeat_error", (error) => {
        if (error.message == "No food found.") {
            Logger.warn("找不到食物");
        } else {
            Logger.error(`吃東西時發生錯誤: ${error.message}`);
        }
    });

    function applyEntityCollision(other) {
        let dx = other.position.x - bot.entity.position.x;
        let dy = other.position.y - bot.entity.position.y;
        let dz = other.position.z - bot.entity.position.z;
        let largestDistance = Math.max(Math.abs(dx), Math.abs(dz));
        if (largestDistance >= 0.01) {
            let vx = dx / 20;
            let vz = dz / 20;

            if (largestDistance < 1) {
                vx /= Math.sqrt(largestDistance);
                vz /= Math.sqrt(largestDistance);
            } else {
                vx /= largestDistance;
                vz /= largestDistance;
            }
            bot.entity.xVelocity -= vx;
            bot.entity.xVelocity -= vz;

            other.xVelocity += vx;
            other.zVelocity += vz;
        }
    }
};

initBot();

process.on("unhandledRejection", async (error) => {
    Logger.error(error);
    process.exit(1);
});

process.on("uncaughtException", async (error) => {
    Logger.error(error);
    process.exit(1);
});

process.on("uncaughtExceptionMonitor", async (error) => {
    Logger.error(error);
    process.exit(1);
});
