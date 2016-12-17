
module.exports = function(msg, cb){
    var session = msg.session;
    cb({ echo: session });
};
