
const https = require('https'),
    url = require('url'),
    FormData = require('form-data'),
    fs = require('fs'),
    events = require('events'),
    event = new events.EventEmitter(),
    ipchecker = require('./ip.js'),
    invite = require('./invite'),
    menu = require('./menu'),
    _storage = require("./storage")
_storage.location = __dirname + "/app.json"
const storage = _storage.read({ users: {}, invites: {} })


const badrq = 'HTTP/1.1 400 Bad Request\r\n\r\n'

var options = {}
var post
var get

menu.send = send
menu.log = log
menu.storage = storage
invite.storage = storage
event.on("message", menu.onmessage)
event.on("query", menu.onquery)
event.on("command", menu.oncommand)
event.on("button", menu.onbutton)
// =================================== server
const check = ipchecker.checker(
    [
        '173.245.48.0/20',
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '141.101.64.0/18',
        '108.162.192.0/18',
        '190.93.240.0/20',
        '188.114.96.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17',
        '162.158.0.0/15',
        '104.16.0.0/12',
        '172.64.0.0/13',
        '131.0.72.0/22'
    ],
    [
        '2400:cb00::/32',
        '2606:4700::/32',
        '2803:f800::/32',
        '2405:b500::/32',
        '2405:8100::/32',
        '2a06:98c0::/29',
        '2c0f:f248::/32'
    ]
)

function check_telegram_server(sip) {
    var ip = sip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ip) {
        var eip = (+ip[1] << 24) + (+ip[2] << 16) + (+ip[3] << 8) + (+ip[4]);
        return ((eip & (-1 << (32 - 20))) == -1785028608) || ((eip & (-1 << (32 - 22))) == 1533805568)
    }
    return false
}


async function server(req, res) {
    try {
        if (!check(req.connection.remoteAddress)) {
            req.socket.end(badrq);
            return;
        }
        if (req.method == "POST" && req.url) {
            if (check_telegram_server(req.headers['cf-connecting-ip'])) {
                res.end();
                var wstream = Buffer.alloc(0)
                req.on('data', function (chunk) {
                    wstream = Buffer.concat([wstream, chunk]);
                });
                req.once('end', function () {
                    try {
                        const data = JSON.parse(wstream)
                        event.emit("data", data)
                        if ("message" in data) {
                            if ('text' in data.message) {
                                if (data.message.entities && data.message.entities[0].type == "bot_command") {
                                    event.emit("command", data)
                                } else
                                    event.emit("message", data)
                            } else {
                                event.emit("file", data)
                            }
                        } else if ("callback_query" in data || "chosen_inline_result" in data) {
                            event.emit("button", data)
                        } else if ("inline_query" in data) {
                            event.emit("query", data)
                        }

                    } catch (e) {
                        return;
                    }
                });
            } else if (post) {
                const queryData = url.parse(req.url, true);
                const key = getkey(queryData.pathname)
                var data = Buffer.alloc(0);
                req.on('data', function (chunk) {
                    data = Buffer.concat([data, chunk])
                })
                req.on("close", async function () {
                    try {
                        data = JSON.parse(data.toString() || "{}")
                        if (key != "") {
                            const out = await post_open(key, data, req, res)
                            if (out)
                                return res.end(out);
                            else if (out == false)
                                req.socket.end(badrq);
                        }
                    } catch (error) { }
                    req.socket.end(badrq);
                })
            } else
                req.socket.end(badrq);
        } else if (req.method == "GET" && get) {
            const queryData = url.parse(req.url, true);
            const out = await get_open(getkey(queryData.pathname), queryData.query, req, res)
            if (out)
                res.end(out);
            else if (out == false)
                req.socket.end(badrq);
        } else
            req.socket.end(badrq);
    } catch (error) {
        log(error)
    }
};


function getkey(url) {
    url = url.substring(1)
    if (url.includes("/"))
        return url.substring(0, url.indexOf("/"))
    return url
}
function post_open(key, data, req, res) {
    if (key in post && typeof post[key] == "function") {
        return post[key](data || {}, req, res)
    }
    return false
}
function get_open(key, data, req, res) {
    if (key in get && typeof get[key] == "function") {
        return get[key](data || {}, req, res)
    }
    return false
}
const bad = { ok: false }
// ================================================================== functions 
async function send(method, data = {}) {
    try {
        data = JSON.stringify(data);
        const res = (await request({
            host: 'api.telegram.org',
            path: options.api + method,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, data)).body.toString()
        try {
            var out = JSON.parse(res);
        } catch (error) {
            var out = bad
        }

        if (!out.ok && !(out.error_code == 400 && out.description == 'Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message'))
            log(out)
        return out
    } catch (error) {
        log(error)
        return bad
    }
}
function sendFile(method, data = {}) {
    var form = new FormData();
    for (const i in data) {
        if (typeof data[i] == "object" && data[i].length == 2)
            form.append(i, data[i][0], data[i][1]);
        else
            form.append(i, data[i]);
    }
    return new Promise(function (resolve, reject) {
        const res = { ok: false }
        form.on('error', function (e) {
            log(e)
            resolve(res)
        })
        form.submit('https://api.telegram.org' + options.api + method, function (err, pushResponse) {
            if (err) {
                log(err)
                return resolve(res)
            }
            var responseText = Buffer.alloc(0)
            pushResponse.on('data', function (chunk) {
                responseText = Buffer.concat([responseText, chunk]);
            });
            pushResponse.on('error', function (e) {
                log(e)
                resolve(res)
            });
            pushResponse.on('end', function () {
                try {
                    var out = JSON.parse(responseText)
                } catch (error) {
                    log(error)
                    resolve(res);
                }
                if (!out.ok) {
                    log(err)
                }
                resolve(out);
            });
        });
    })
}


function getFile(file, fileid) {
    return new Promise((resolve, reject) => {
        request({
            host: 'api.telegram.org',
            path: options.api + 'getFile?file_id=' + fileid,
            method: 'GET',
        }).then(function (response) {
            response = JSON.parse(response.body)
            if (response.ok) {
                if (typeof file == "string")
                    file = fs.createWriteStream(file);
                https.get('https://api.telegram.org/file' + options.api + response.result.file_path, function (res) {
                    res.pipe(file);
                    res.once('end', resolve);
                });
            }
        });
    })
}

const nullarray = []
function request(obj = {}, end) {
    const http_option = {
        host: obj.host,
        path: obj.path,
        method: obj.method || "GET",
        headers: obj.headers || (end ? {
            'Content-Length': end.length,
        } : {})
    }
    return new Promise(function (resolve, reject) {
        https.request(http_option, function (pushResponse) {
            var responseText = Buffer.alloc(0)
            pushResponse.on('data', function (chunk) {
                responseText = Buffer.concat([responseText, chunk]);
            });
            pushResponse.on('error', function (e) {
                resolve({
                    error: e,
                    body: '',
                    headers: nullarray
                });
            });
            pushResponse.on('end', function () {
                resolve({
                    statusCode: pushResponse.statusCode,
                    body: responseText,
                    headers: pushResponse.headers
                });
            });
        }).on('error', function (e) {
            resolve({
                error: e,
                body: '',
                headers: nullarray
            });
        }).end(end);
    });
}

function init(opt) {
    post = opt.post
    get = opt.get
    options = opt
    options.api = "/bot" + options.token + "/"
    var httpsServer = https.createServer(options.tls, server);
    httpsServer.listen(options.port || 443);
    menu.menu = opt.menu
    menu.query = opt.query
    menu.init()
    event.emit("init")
}
function log(...a) {
    if (options.debug)
        console.error(...a)
}
module.exports = {
    on: event.on.bind(event),
    menu: menu.custom,
    storage,
    invite,
    location: _storage.location,
    init,
    send,
    sendFile,
    getFile,
}
