require('chai').should();
var BusyAlien = require('./');

describe('Busy Alien', function(){
    var busyAlien;
    var app;
    var messages;
    var close;
    var messageFunc;
    var sendMessage = function(msg){
        messageFunc(JSON.stringify(msg));
    };
    var getMessage = function(){
        return messages.shift();
    };
    var ws;

    beforeEach(function(){
        messages = [];
        var app = {
            ws: function(endpoint, newWs){
                endpoint.should.be.equal('/');

                ws = {
                    send: function(str){
                        messages.push(JSON.parse(str));
                    },
                        on: function(evt, cb){
                            if (evt=='close'){
                                close = cb;
                            } else if (evt=='message'){
                                messageFunc = cb;
                            }
                        }
                };
                newWs(ws);
            }
        }

        expressWS = function(){}; // mock away expressws
        busyAlien = BusyAlien(app, '1.1', 'test_endpoints', expressWS);

        getMessage().should.be.deep.equal(['version', '1.1']);
    });

    it('should remain silent without session', function(){
        sendMessage(['get', { one: { id: 1 } }]);
        messages.length.should.be.equal(0);
    });

    describe('with session', function(){

        beforeEach(function(){
            sendMessage(['get', { session: { } }]);
            getMessage().should.be.deep.equal(['drip', { session: { id: '123' } }, null]);
        });

        it('should be able to send to connection by session', function(){
            busyAlien.sendTo('123', { some: 'stuff' });
            getMessage().should.be.deep.equal(['drip', { some: 'stuff' }, null]);
        });

        it('should relay session id to business functions', function(){
            sendMessage(['salmon', { echo_session: { } }]);
            getMessage().should.be.deep.equal(['drip', { echo: '123' }, null]);
        });

        it('should get a list of active sessions', function(){
            busyAlien.getSessions().should.be.deep.equal(['123']);
        });

        it('should access get endpoint', function(){
            sendMessage(['get', { one: { id: 1 } }]);
            getMessage().should.be.deep.equal(['drip', { one: 1 }, null]);
        });

        it('should access create endpoint', function(){
            sendMessage(['salmon', { one: { some: 'data' } }]);
            getMessage().should.be.deep.equal(['drip', { one: { id: 1, some: 'data' } }, null]);
        });

        it('should access update endpoint', function(){
            sendMessage(['salmon', { one: { id: 1, some: 'data' } }]);
            getMessage().should.be.deep.equal(['drip', { one: { id: 1, some: 'data' } }, null]);
        });

        it('should access remove endpoint', function(){
            sendMessage(['salmon', { one: { id: 1, isDeleted: true } }]);
            getMessage().should.be.deep.equal(['drip', { one: { id: 1, isDeleted: true } }, null]);
        });

        it('should call change event if defined', function(){
            var called;

            busyAlien.on('change', function(stuff, session){
                called = stuff;
                session.should.be.equal('123');
            });

            sendMessage(['salmon', { one: { id: 1, isDeleted: true } }]);
            called.should.be.deep.equal({ one: { id: 1, isDeleted: true } });
        });
    });
});
