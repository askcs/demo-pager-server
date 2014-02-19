/**
 * Created with JetBrains WebStorm.
 * User: user
 * Date: 24-9-13
 * Time: 12:43
 * To change this template use File | Settings | File Templates.
 */
var SenseClient = require('./senseclient.js');
//var ask_uuid_map = {1:"apptestbw",2:"apptestbw",778224:"apptestbw"},
var users = {
    "1": {
        "username": "ducodemo",
        "passHash": "95346415f1f5933a78386d1759d2ef22",
        "baseUrl": "http://askpack.ask-cs.com/standby-fair/"
    },
    "2": {
        "username": "jordibevel",
        "passHash": "43514a20c7801ebd4b1e6769939dd95f",
        "baseUrl": "http://askpack.ask-cs.com/standby-fair/"
    },
    "778224": {
        "username": "ducodemo",
        "passHash": "95346415f1f5933a78386d1759d2ef22",
        "baseUrl": "http://askpack.ask-cs.com/standby-fair/"
    }
};
var    sense_uuid_map = {1:"apptesttpl",2:"apptesttpl",778224:"apptesttpl"};

var ClientHandler = function (delay, config) {
    this.clients = {};
    this.sockets = {};
    this.inactvityDelay = delay;
    this.config = config;
}

ClientHandler.prototype.addSocket = function(socket) {
    var client = {};
    client.connectTime = new Date();
    client.socket = socket;
    client.lastSendTime = 0;

    this.sockets[socket.name] = client;
}

ClientHandler.prototype.updateClientConnById = function(id) {
    var thiz = this;
    var client = this.clients[id];

    clearTimeout(client.timeout);
    client.timeout = setTimeout(this.disconnect, this.inactvityDelay * 1000, thiz, id);
}

ClientHandler.prototype.updateClientConnBySocket = function(socket) {
    var thiz = this;
    var client = this.sockets[socket.name];

    clearTimeout(client.timeout);
    client.timeout = setTimeout(this.disconnect, this.inactvityDelay * 1000, thiz, client.id);
}

ClientHandler.prototype.addClientId = function(socket, id, frameNumber) {
    var client = this.sockets[socket.name];
    client.id = id;
    client.frameNumber = frameNumber;
    if(users[id] != null) {
        client.user = users[id];
        console.log("User is set: ",client.user);
    } else {
        console.log("User with id: "+id+" not found: ",users[id]);
    }
    //client.uuid = ask_uuid_map[id];
    var senseId = sense_uuid_map[id];

    this.clients[client.id] = client;

    var thiz = this;

    if (senseId != null) {
        var username = this.config.sense[senseId].user;
        var password = this.config.sense[senseId].pass;
        client.sense = new SenseClient(username, password);
    }
    client.timeout = setTimeout(this.disconnect, this.inactvityDelay * 1000, thiz, id);
}

ClientHandler.prototype.removeBySocket = function(socket) {
    var client = this.sockets[socket.name];
    if(client.id!=null) {
        clearTimeout(client.timeout);
        delete this.clients[client.id];
    }

    delete this.sockets[socket.name];
}

ClientHandler.prototype.disconnect = function(thiz, id) {

    var client = thiz.clients[id];
    if(client!=null) {
        delete thiz.clients[id];

        var socket = client.socket;
        delete thiz.sockets[socket.name];

        var date = new Date();
        console.log(date.toISOString()+" Disconnect the client: "+socket.name);
        socket.destroy();
    }
}

ClientHandler.prototype.sendMessage = function(id, data, delay) {

    var date = new Date();
    var client = this.clients[id];
    if(client==null) {
        console.log("Failed to send message because of unknown id: "+id);
        return;
    }

    if(client.lastSendTime + delay > (new Date).getTime() ) {
        var timeout = (client.lastSendTime + delay) - (new Date).getTime();
        //console.log(date.toISOString()+" Need to wait "+timeout+"ms to send: ",data.toString());
        var thiz = this;
        setTimeout(function(id, data, delay) {
            thiz.sendMessage(id, data, delay);
        }, timeout, id, data, delay);
        return;
    }
    var socket = client.socket;
    socket.write(data);
    client.lastSendTime = new Date().getTime();

    this.updateClientConnById(id);
    //console.log(date.toISOString()+" Send data: ",data.toString());
}

ClientHandler.prototype.incrementFrameNumber = function(id) {
    var client = this.clients[id]
    if(client.frameNumber==null) {
        client.frameNumber=0;
    } else {
        client.frameNumber++;
    }
    if(client.frameNumber==100)
        client.frameNumber=0;

    return client.frameNumber;
}

module.exports = ClientHandler;