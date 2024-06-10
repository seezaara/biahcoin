
const ipv6parse = require('ipaddr.js').parse
function isv4(ip) {
    return ip.includes(".")
}
function define_ip(sub) {
    var fsub = []
    for (var i in sub) {
        fsub[i] = sub[i].split("/")
        fsub[i][0] = ipv4parse(fsub[i][0]);
        fsub[i][1] = ipm(fsub[i][1])
    }
    return function (remip) {
        remip = ipv4parse(remip)
        for (var i in fsub) {
            if ((remip & fsub[i][1]) == fsub[i][0])
                return true;
        }
        return false;
    }
}
function define_ip6(sub) {
    var fsub = []
    for (var i in sub) {
        fsub[i] = sub[i].split("/")
        fsub[i][0] = ipv6parse(fsub[i][0]);
    }
    return function (remip) {
        remip = ipv6parse(remip);
        for (var i in fsub) {
            if (remip.match(fsub[i][0], fsub[i][1]))
                return true;
        }
        return false;
    }
}
function checker(ipv4 = [], ipv6 = []) {
    const defv4 = define_ip(ipv4)
    const defv6 = define_ip6(ipv6)
    return function (ip) { return isv4(ip) ? defv4(ip.replace(/^.*:/, '')) : defv6(ip) }
}
//=======================

function ipv4parse(ip) {
    ip = ip.split(".");
    return (+ip[0] << 24) + (+ip[1] << 16) + (+ip[2] << 8) + (+ip[3]);
}
function ipm(ms) {
    return -1 << (32 - ms)
}
module.exports = {
    define_ip,
    define_ip6,
    isv4,
    checker
}