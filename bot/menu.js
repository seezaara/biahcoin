
const that = {
    storage: undefined,
    send: undefined,
    menu: undefined,
    query: undefined,
    log: undefined,
    onmessage,
    custom,
    oncommand: onmessage,
    onquery,
    onbutton,
    init

}
const buttons_names = []
const buttons_keys = []
const spc = ""
function init() {
    const menu = that.menu
    for (let level in menu) {
        for (let keys in menu[level]) {
            if (typeof menu[level][keys].button != "undefined") {
                if (!buttons_keys.includes(keys))
                    buttons_keys.push(keys)
                for (let btn_keys in menu[level][keys].button) {
                    if (!buttons_names.includes(btn_keys))
                        buttons_names.push(btn_keys)
                }
            }
        }
    }
}

function custom(id, input) {
    return onmessage({
        update_id: 0,
        message: {
            message_id: 0,
            from: {
                id: id,
                is_bot: false,
            },
            chat: {
                id: id,
                type: 'private'
            },
            date: Math.round(new Date() / 1000),
            text: input
        }
    })
}

// function check_inline(a1, a2) {
//     return array1.length === array2.length && a1.every((value, index) => value === a2[index])
// }

async function onbutton(data) {
    const menu = that.menu
    if (!menu)
        return
    const id = data.callback_query.from.id
    var input = data.callback_query.data.split(spc)
    try {
        const user = get_user(data.callback_query.from)
        var level = get_user_level(menu, user.l)
        var key = buttons_keys[input[1]] + "$%@-" + buttons_names[input[2]]
        input = input[0]
        user.b = input
        key = parse_key(level, key, menu)
        var item = parse_item(level, key, id, input, user, key, data)
        var next_data = await parse_data_item(id, item, input, user, key, data)
        if (!next_data)
            throw Error('BOTMENU: data in inline menu is empty: level "' + Object.keys(menu)[Object.values(menu).indexOf(level)] + "\" index \"" + key + '"')

        parse_button(next_data, key)

        next_data.message_id = data.callback_query.message.message_id
        next_data.chat_id = id

        var method = "answerCallbackQuery"
        if (item.method)
            method = item.method
        if (next_data.method) {
            method = next_data.method
            delete next_data.method
        }
        if (method == "answerCallbackQuery")
            next_data.callback_query_id = data.callback_query.id
        that.send(method, next_data);
        user.i = key
    } catch (error) {
        that.log(error)
    }
}
async function onquery(data) {
    const menu = that.query
    if (!menu)
        return
    const id = data.inline_query.from.id
    const input = data.inline_query.query.trim()

    try {
        const user = get_user(data.inline_query.from)
        var level = get_user_level(menu, user.l)
        var key = input
        if (key == "") {
            key = "start"
        }
        key = parse_key(level, key, menu)
        var item = parse_item(level, key, id, input, user, key, data)
        var next_data = await parse_data_item(id, item, input, user, key, data)
        if (!next_data)
            throw Error('BOTMENU: data in query menu is empty: level "' + Object.keys(menu)[Object.values(menu).indexOf(level)] + "\" index \"" + key + '"')

        parse_button(next_data, key)
        next_data.inline_query_id = data.inline_query.id
        that.send("answerInlineQuery", next_data);
    } catch (error) {
        that.log(error)
    }
}

async function onmessage(data) {
    const menu = that.menu
    if (data.message.via_bot || data.message.from.is_bot || !menu)
        return;

    const id = data.message.from.id
    const input = data.message.text.trim() 

    try {
        const user = get_user(data.message.from)
        const level = get_user_level(menu, user.l)

        if (input[0] == "/") {
            var cmd = parse_cmd(input)
            var key = parse_key(level, cmd[0], menu, false)
            var item = parse_item(level, key, id, cmd[1], user, cmd[0], data)
            var next_data = await parse_data_item(id, item, cmd[1], user, cmd[0], data)
            if (!next_data)
                throw Error('BOTMENU: data in menu is not defined: level "' + Object.keys(menu)[Object.values(menu).indexOf(level)] + "\" index \"" + key + '"')

        } else if (data.message.chat.type == 'private') {
            var last_item = get_item(level, user.i)
            var key = await parse_text(id, user, last_item, input, level, menu, data)
            if (key == false)
                return
            key = parse_key(level, key, menu, false)
            var item = parse_item(level, key, id, input, user, key, data)
            var next_data = await parse_data_item(id, item, input, user, key, data)

        }
        if (!next_data)
            throw Error('BOTMENU: data in menu is not defined: level "' + Object.keys(menu)[Object.values(menu).indexOf(level)] + "\" index \"" + key + '"')

        parse_button(next_data, key)
        next_data.chat_id = id
        var method = "sendMessage"
        if (item.method)
            method = item.method
        if (next_data.method) {
            method = next_data.method
            delete next_data.method
        }
        const out = that.send(method, next_data)

        user.i = key
        return out;
    } catch (error) {
        that.log(error)
    }
}


// ===========================================

function get_user(data) {
    const id = data.id
    const users = that.storage.users
    if (!users[id])
        users[id] = { id: id, i: "_", c: {}, l: "_" }
    if ("first_name" in data || "last_name" in data)
        users[id].n = ((data.first_name || "") + " " + (data.last_name || "")).trim()

    return users[id]
}
function get_item(level, key) {
    var key = key.split("$%@-")
    if (key[1] && level[key[0]].button) {
        return level[key[0]].button[key[1]]
    }
    if (level[key[0]])
        return level[key[0]]
    else
        return level["_"]
}

function parse_key(level, key, menu, can = true) {
    var key = ("" + key).split("$%@-")
    const first_key = parse_level_key(level, key[0], menu, can)
    if (key[1] && level[first_key].button) {
        const last_key = parse_level_key(level[first_key].button, key[1], menu, can)
        return first_key + "$%@-" + last_key
    }
    return first_key
}
function parse_level_key(level, key, menu, can = true) {
    if (!key || (key[0] == "_" && can) || !(key in level)) {
        if ("_" in level)
            key = "_"
        else
            throw Error('BOTMENU: index "_" in list "' + Object.keys(menu)[Object.values(menu).indexOf(level)] + '" is not defined')
    }
    if (typeof level[key] == 'string') {
        return parse_level_key(level, level[key], menu)
    }
    return key
}

function parse_item(level, key, id, input, user, cmdinput, data) {
    var item = get_item(level, key)
    if (typeof item == 'function')
        item = item(id, input, user, cmdinput, data)
    return item
}

async function parse_text(id, user, last, input, level, menu, data) {
    var next = last.next
    if (typeof next == 'function') {
        user.c[user.i] = input
        next = await next(id, input, user, user.i, data)
        user.c = []
    }
    if (typeof next == 'object') {
        if (!(input in next)) {
            if ("_" in next) {
                next = next._
            } else {
                throw Error('BOTMENU: index "_" of object "next" in index "' + Object.keys(level)[Object.values(level).indexOf(last)] + '" in level "' + Object.keys(menu)[Object.values(menu).indexOf(level)] + '" is not defined')
            }
        } else
            next = next[input]
    } else if (typeof next == 'string') {
        user.c[user.i] = input
    } else if (typeof next == 'undefined') {
        if (input[0] == "_")
            input = "_"
        next = input
    }
    return next;
}


async function parse_data_item(id, item, input, user, cmdinput, data) {
    if (typeof item.data == 'function')
        item = await item.data(id, input, user, cmdinput, data)
    else
        item = item.data
    if (typeof item == "string")
        return { text: item }
    return item
}

async function parse_button(item, key) {
    key = ("" + key).split("$%@-")[0]
    if (typeof item == "object" && item.reply_markup && item.reply_markup.inline_keyboard) {
        const buttons = item.reply_markup.inline_keyboard
        for (const i in buttons) {
            for (const j in buttons[i]) {
                const btn = buttons[i][j]
                if ("callback_data" in btn && !("" + btn.callback_data).includes(spc)) {
                    var buttons_names_i = buttons_names.indexOf(btn.text)
                    if (buttons_names_i == -1)
                        buttons_names_i = buttons_names.push(btn.text) - 1
                    var buttons_keys_i = buttons_keys.indexOf(key)
                    if (buttons_keys_i == -1)
                        buttons_keys_i = buttons_keys.push(key) - 1
                    btn.callback_data += spc + buttons_keys_i + spc + buttons_names_i
                }
            }
        }
    }
}

function get_user_level(menu, key) {
    if (key in menu)
        var level = menu[key]
    else if ("_" in menu) {
        var level = menu._
    } else
        throw Error('BOTMENU: level "_" in menu is not defined')
    if (typeof level == 'string') {
        return get_user_level(menu, menu[key])
    }
    return level;
}
function parse_cmd(input) {
    if (!input.includes(" ")) {
        var cmd = "_" + input.substring(1)
        if (cmd == "_start")
            cmd = "start"
        return [cmd]
    } else {
        var cmd = "_" + input.substring(1, input.indexOf(" "))
        if (cmd == "_start")
            cmd = "start"
        return [cmd, input.substring(input.indexOf(" ") + 1)]
    }
}
module.exports = that