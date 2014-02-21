var http = require('http'),
    Q = require('q'),
	url = require('url');

var AskRESTClient = function(baseUrl, uuid, passHash) {
    
	//console.log('AskRESTClient init');
			
	this.uuid = uuid;
    this.passHash = passHash;
    this.baseUrl = baseUrl;
	this.sessionId;
	
	var self = this;
	
    this.login = login();
    function login() {
        var deferred = Q.defer();
		
		var loginUrl = baseUrl + 'login?uuid=' + uuid + '&pass=' + passHash;
		
		//console.log('AskRESTClient login: ' + uuid);
		
		http.get(loginUrl, function(res) {
			console.log("Got response: " + res.statusCode);
			
			// Get the response session ID from the header
			self.sessionId = res.headers['x-session_id'];
			console.log('Session ID: ' + self.sessionId);
			
			res.on("data", function(chunk) {
				console.log("BODY: " + chunk);
				
			});
			
			deferred.resolve();
			
		}).on('error', function(e) {
			console.log("Error: " + e.message);
			deferred.reject(e.message);
		});
		
        return deferred.promise;
    }
}

// attachNode();
// NOTE: Only method left using the old ASK, the used method is in asksoapclient.js

// NOTE: Unused
AskRESTClient.prototype.getNodeData = function(nodeUUID, callback) {
    var asc = this;
    this.login.then(function() {
        var args = {sessionID: asc.session, nodeUUID: nodeUUID};
        asc.client.getNodeData(args, function(err, result){
            callback(result.return.result);
        });
    });
}

// REST-IFIED
// NOTE: Unused
AskRESTClient.prototype.getResourcesData = function(nodeUUID, callback) {
	var self = this;
    this.login.then(function() {
		var createResourceUrl = self.baseUrl + 'node/' + self.uuid + '/resource';
		var parsedUrl = url.parse(createResourceUrl);
		
		var options = {
			host: parsedUrl.host,
			path: parsedUrl.path,
			method: 'PUT',
			headers: { 'X-SESSION_ID': self.sessionId }
		};
		
		var req = http.request(options, function(res) {
			res.on("data", function(chunk) {
				callback(chunk.return.chunk);
			});
		}).on('error', function(e) {
			console.log("Error: " + e.message);
			callback(e.message, null);
		});
		
		req.end();
    });
}

// REST-IFIED
AskRESTClient.prototype.createSlot = function(start, end, label, callback) {
	
	var self = this;
    this.login.then(function() {
		var createTimeSlotUrl = self.baseUrl + 'askatars/' + self.uuid + '/slots';
		var parsedUrl = url.parse(createTimeSlotUrl);
		
		var options = {
			host: parsedUrl.host,
			path: parsedUrl.path,
			method: 'POST',
			headers: { 'X-SESSION_ID': self.sessionId }
		};
		
		var req = http.request(options, function(res) {
			res.on("data", function(chunk) {
				callback(null, chunk);
			});
		}).on('error', function(e) {
			console.log("Error: " + e.message);
			callback(e.message, null);
		});
		
		// write data to request body
		req.write('{"start":'+start+',"end":'+end+',"recursive":false,"text":"'+label+'"}\n');
		req.end();
    });
}

// REST-IFIED
AskRESTClient.prototype.getSlots = function(nodeUUID, start, end, both, callback) {
    var asc = this;
    this.login.then(function() {
		var getTimeSlotUrl = self.baseUrl + '/slots?start='+start+'&end='+end+'&type='+both+'';
		var parsedUrl = url.parse(getTimeSlotUrl);
		
		var options = {
			host: parsedUrl.host,
			path: parsedUrl.path,
			method: 'GET',
			headers: { 'X-SESSION_ID': self.sessionId }
		};
		
		var req = http.request(options, function(res) {
			res.on("data", function(chunk) {
				callback(null, chunk);
			});
		}).on('error', function(e) {
			console.log("Error: " + e.message);
			callback(e.message, null);
		});
		
		req.end();
    });
}

// REST-IFIED
AskRESTClient.prototype.createResource = function(nodeUUID, tag, value, callback) {
	var self = this;
    this.login.then(function() {
		var createResourceUrl = self.baseUrl + 'node/' + self.uuid + '/resource';
		var parsedUrl = url.parse(createResourceUrl);
		
		var options = {
			host: parsedUrl.host,
			path: parsedUrl.path,
			method: 'PUT',
			headers: { 'X-SESSION_ID': self.sessionId }
		};
		
		var req = http.request(options, function(res) {
			res.on("data", function(chunk) {
				callback(null, chunk);
			});
		}).on('error', function(e) {
			console.log("Error: " + e.message);
			callback(e.message, null);
		});
		
		// write data to request body
		req.write('{\"'+tag+'\":\"'+value+'\"}\n');
		req.end();
    });
}

module.exports = AskRESTClient;