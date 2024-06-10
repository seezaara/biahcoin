
// ================================================ setup

const token = ""
const link = "https://.....com"
const key = fs.readFileSync(__dirname + "/key.pem")
const cert = fs.readFileSync(__dirname + "/cert.pem")

// ================================================ 

const bot = require("./bot"),
    fs = require("fs"),
    port = 443


bot.on("init", async function (e) {
    // const rex = await bot.send("deleteWebhook")
    const res = await bot.send("getWebhookInfo")
    console.log(res)
    if (res.ok && (res.result.url == '' || res.result.pending_update_count > 0)) {
        const rex = await bot.send("deleteWebhook")
        const set = await bot.send("setWebhook", { url: link + ":" + port + "/" })
        console.log(set)
    }
})

bot.init({
    token,
    port: port,
    get: {
        app: app,
        update,
        pp
    },
    tls: {
        key,
        cert
    },
    debug: true,
    version: 2,
})

bot.on("data", async function (e) {
    if (!e.message || !e.message.chat)
        return
    bot.send("sendMessage", {
        chat_id: e.message.chat.id,
        text: "for using the bot click on play button 😊",
    })
})

//=================================================

if (!bot.storage.users)
    bot.storage.users = {}
var users = bot.storage.users

if (!bot.storage.data)
    bot.storage.data = {
        rank: [],
        max: 500000000000000,
    }
var data = bot.storage.data


//===================================================
async function pp(d, req, res) {
    const user = users[d.id]
    if (!user && user.p == d.p)
        return
    await bot.getFile(res, user.p)
}


async function new_user(d) {
    var pp = await bot.send("getChat", {
        chat_id: d.id,
    })
    if (!pp.ok)
        return false

    users[d.id] = {
        id: d.id,
        p: pp.result.photo ? pp.result.photo.small_file_id : "",
        n: pp.result.first_name,
        u: 0,
        c: 0
    }
    return true
}
async function update(d) {
    if (!users[d.id] && !(await new_user(d))) {
        return
    }
    var time = new Date().getTime()
    const user = users[d.id]
    d.clicks = +(d.clicks || 0)
    if (user.u + 51000 > time && d.clicks > 50)
        return
    user.u = time
    user.c += d.clicks
    data.max -= d.clicks
    //==================== rank 
    var last = data.rank[data.rank.length - 1]
    if (!last || last.c < user.c || data.rank.length < 100) {
        var index = data.rank.findIndex(item => item.id === user.id);
        if (index == -1)
            data.rank.push(user)
        else
            data.rank[index] = user
    }
    //====================   
    return JSON.stringify({
        c: user.c,
        data,
    })
}

setInterval(() => {
    //==================== rank   
    data.rank.sort(function (a, b) { return a.c - b.c });
    if (data.rank.length > 100)
        data.rank.length = 100;
}, 3000);

//========================================
const url = require('url');
const path = require('path');
function app(e, req, res) {
    const parsedUrl = url.parse(req.url);
    let pathname = __dirname + parsedUrl.pathname
    var ext = path.parse(pathname).ext;
    const map = {
        '.ico': 'image/x-icon',
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword'
    };
    if (ext == "") {
        pathname += "/index.html"
        ext = ".html"
    }
    fs.exists(pathname, function (exist) {
        if (!exist) {
            // if the file is not found, return 404
            res.statusCode = 404;
            res.end(`File ${pathname} not found!`);
            return;
        }

        // if is a directory search for index file matching the extension
        if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

        // read file from file system
        fs.readFile(pathname, function (err, data) {
            if (err) {
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            } else {
                // if the file is found, set Content-type and send data
                res.setHeader('Content-type', map[ext] || 'text/plain');
                res.end(data);
            }
        });
    });
}