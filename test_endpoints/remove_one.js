
module.exports = function(msg, cb){
    ret = msg.args;
    ret.isDeleted = true;
    cb({ one: ret });
};
