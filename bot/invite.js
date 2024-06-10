const that = {
    check,
    create,
    remove,
    storage: undefined
}
function create(expire, ...data) {
    if (typeof expire != "number") {
        throw Error("expire date is not set")
    }
    const random = (Math.random() + 1).toString(36).substring(2)
    const time = Math.round(new Date().getTime() / 1000)
    that.storage.invites[random] = [time, expire, ...data]
    return random
}

function check(code) {
    const invites = that.storage.invites
    if (code in invites) {
        const data = invites[code]
        delete invites[code]
        const time = Math.round(new Date().getTime() / 1000)
        if (time - data[0] > data[1])
            return;
        data.splice(0, 2);
        return data
    }
}
function remove(code) {
    delete that.storage.invites[code]
}

setInterval(function () {
    const time = Math.round(new Date().getTime() / 1000)
    const invites = that.storage.invites
    for (const code in invites) {
        if (time - invites[code][0] > 60 * 60 * 24) {
            delete invites[code]
        }
    }
}, 60 * 60 * 1000);

module.exports = that