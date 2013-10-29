var soap = require('soap'),
    q = require('q');

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

module.exports = AskSoapClient;