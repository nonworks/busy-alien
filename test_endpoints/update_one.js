
module.exports = function(msg, cb){
    ret = msg.args;
    ret.id = 1
    cb({ one: ret });
};
