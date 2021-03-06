var soap = require('soap'),
    Q = require('q');

var AskSoapClient = function(url, authKey) {
    this.authKey = authKey;
    var args = {authKey:authKey};
    var asc = this;
    this.login = login();
    function login() {
        var deferred = Q.defer();
        soap.createClient(url, function(err, client) {
            if(err) {
                console.log(err);
                deferred.reject(err);
            } else {
                asc.client = client;
                client.startSession(args, function(err, result) {
                    asc.session = result.return.result;
                    deferred.resolve();
                });
            }
        });
        return deferred.promise;
    }
}

AskSoapClient.prototype.attachNode = function(parentNodeUUID, memberNodeUUID, callback) {
    var asc = this;
    this.login.then(function() {
        var args = {sessionID: asc.session, parUUID: parentNodeUUID, memUUID: memberNodeUUID};
        asc.client.attachNode(args, function(err, result){
            if(err)
                callback(err, null);
            else {
                callback(null, result.return.result);
            }
        });
    });
}

AskSoapClient.prototype.getNodeData = function(nodeUUID, callback) {
    var asc = this;
    this.login.then(function() {
        var args = {sessionID: asc.session, nodeUUID: nodeUUID};
        asc.client.getNodeData(args, function(err, result){
            callback(result.return.result);
        });
    });
}

AskSoapClient.prototype.getResourcesData = function(nodeUUID, callback) {
    var asc = this;
    this.login.then(function() {
        var args = {sessionID: asc.session, nodeUUID: nodeUUID};
        asc.client.getResourcesData(args, function(err, result){
            callback(result.return.result);
        });
    });
}


AskSoapClient.prototype.createSlot = function(nodeUUID, start, end, label, method, text, callback) {
    var asc = this;
    this.login.then(function() {
        var planboard = 'userStatePlan';
        var args = {sessionID: asc.session, planboard: planboard, nodeUUID: nodeUUID, start: start, end: end, label: label, method: method, text: text};
        console.log('Sending: '+JSON.stringify(args));
        asc.client.createSlot(args, function(err, result){
            if(err)
                callback(err, null);
            else {
                callback(null, result.return.result);
            }
        });
    });
}

AskSoapClient.prototype.getSlots = function(nodeUUID, start, end, both, callback) {
    var asc = this;
    this.login.then(function() {
        var planboard = 'userStatePlan';
        if(both)
            planboard += "_BOTH";
        var args = {sessionID: asc.session, planboard: planboard, nodeUUID: nodeUUID, start: start, end: end};
        console.log('Sending: '+JSON.stringify(args));
        asc.client.getSlots(args, function(err, result){
            if(err)
                callback(err, null);
            else {
                callback(null, result.return.result);
            }
        });
    });
}

AskSoapClient.prototype.createResource = function(nodeUUID, tag, value, callback) {
    var asc = this;

    this.login.then(function() {
        var type = 'TXT';
        var args = {sessionID: asc.session, type: type, ownUUID: nodeUUID, name: tag, tag: tag, value: value};
        console.log('Sending: '+JSON.stringify(args));
        asc.client.createResource(args, function(err, result){
            if(err)
                callback(err, null);
            else {
                callback(null, result.return.result);
            }
        });
    });
}

module.exports = AskSoapClient;