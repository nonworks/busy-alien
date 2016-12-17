var path = require('path');

module.exports = 
BusyAlien = function(app, VERSION, folder, expressWS){
    var wsBySession = {};
    var onChangeFunc;
    folder = path.resolve(folder);

    // dynamically load expressws if necessary
    if (!expressWS){
        expressWS = require('express-ws');
    }

    var execute = function(session, cmd, args, cb){
        Object.keys(args).forEach(function(k){
            var v = args[k];

            // All calls except 'session' requires an established session
            if (session.id || k == 'session'){

                try {
                    var logic = null;
                    if (cmd == 'salmon'){
                        if (v.isDeleted){
                            logic = require(folder+"/remove_"+k);
                        } else if (v.id != undefined) {
                            logic = require(folder+"/update_"+k);
                        } else {
                            logic = require(folder+"/create_"+k);
                        }
                    } else if (cmd == 'get'){
                        logic = require(folder+"/get_"+k);
                    } else {
                        console.error("unknown command "+cmd);
                        return;
                    }

                    logic({ session, args: v }, cb)
                } catch(e){
                    console.error(e);
                }
            }
        });
    };

    var handleMessage = function(session, cmd, args, ref, cb){
        if (cmd == 'ping'){
            cb(['pong', null, null]);
            return;
        }

        execute(session, cmd, args, function(ret){
            if (ret.session){

                if (ret.session.isDeleted){
                    session.id = null;
                } else if (ret.session.id){
                    session.id = ret.session.id;
                } else {
                    ret.session.id = session.id;
                }
            }

            try {
                // if returned data provides a dump function, use it
                Object.keys(ret).forEach(function(k){
                    var v = ret[k];
                    if (v.dump){
                        ret[k] = v.dump();
                    }
                });
                cb(['drip', ret, ref], cmd);
            } catch (e){
                console.error(e);
            }
        });
    };

    var newWs = function(ws, req){
        var session = { id: null };

        ws.send(JSON.stringify(['version', VERSION]));

        ws.on('message', function(msg){
            var args = JSON.parse(msg);
            handleMessage(session, args[0], args[1], args[2], function(answer){
                var cmd = answer[0];
                var payload = answer[1];
                if (payload && payload.session && payload.session.id){
                    if (payload.session.isDeleted){
                        delete wsBySession[payload.session.id];
                    } else {
                        wsBySession[payload.session.id] = ws;
                    }
                }
                ws.send(JSON.stringify(answer));

                if (cmd != 'get' && onChangeFunc){
                    onChangeFunc(payload, session.id);
                }
            });
        });

        ws.on('close', function(){ 
            delete wsBySession[session];
        });
    };

    expressWS(app);
    app.ws('/', newWs);

    return {
        on: function(evt, cb){
            if (evt=='change'){
                onChangeFunc = cb;
            }
        },
        getSessions: function(){
            return Object.keys(wsBySession);
        },
        sendTo: function(session, msg){
            var ws = wsBySession[session];
            if (ws){
                ws.send(JSON.stringify(['drip', msg, null]));
            }
        }
    };
};
