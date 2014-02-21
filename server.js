var net = require('net'),
    config = require('config').Server,
    express = require('express'),
    http = require('http'),
    ClientHandler = require('./lib/clienthandler.js'),
    Frame = require('./frames/frame.js'),
    FrameFactory = require('./lib/framefactory.js'),
    log = require("./lib/logger.js"),
	AskSoapClient = require('./lib/asksoapclient.js'), // Keep this 'old ASK' soapclient for escalations only
    AskRESTClient = require('./lib/askrestclient.js'),
    DataLogger = require('./lib/datalogger.js'),
    Q = require('q'),
    url = require('url');

var ch = new ClientHandler(config.delayInactivity, config);
var logger = new DataLogger();

var port = config.port;
var httpPort = config.httpport;

var wsdl = config.wsdl,
    authKey = config.authKey;

/* PagerId to user mapping */
// Note: Also add a Sense account for each pagerId in clienthandler.js


var STX = 2,
    POLL = 5,
    POLL_BATT = 7;

var TWO_BYTE_FRAME_LENGTH = 2,
    THREE_BYTE_FRAME_LENGTH = 3;

// Start the tcp server
var server = net.createServer(function(socket){

    var date = new Date();
    // Identify this client
    socket.name = socket.remoteAddress + ":" + socket.remotePort
    console.log(date.toISOString()+" Pager connect: "+socket.name);

    // Put this new client in the list
    ch.addSocket(socket);

    // Handle incoming messages from pager.
    socket.on('data', function (data) {
        receiveData(data, socket);
    });

    socket.on('error', function (err) {
        console.log(date.toISOString()+" Client disconnected (error): "+socket.name);
        var client = ch.sockets[socket.name];
        var promise = setActiveSense(client.sense, 0);
        promise.then(function() {
            ch.removeBySocket(socket);
        });
    });

    // Remove the client from the list when it leaves
    socket.on('end', function () {
        console.log(date.toISOString()+" Client disconnected: "+socket.name);
        var client = ch.sockets[socket.name];
        var promise = setActiveSense(client.sense, 0);
        promise.then(function() {
            ch.removeBySocket(socket);
        });
    });
});
server.listen(port);
console.log("Listening on port: ", port);

var app = express();
app.get('/alarm/:id', function(req, res){
    var message = req.query.message;
    var clientId = req.params.id;

    if(clientId=="all") {
        if(Object.keys(ch.clients).length==0) {
            return res.send("Send alarm message: "+message+" to no one");
        }
        for(var i in ch.clients) {
            var client = ch.clients[i];

            sendAlarm(client.id, message);
            message += "Send alarm message: "+message+" to: "+client.id;
        }
        res.send(message);
    } else {
        var client = ch.clients[clientId];

        if(client==null) {
            res.send("Client: "+clientId+" is not connected");
        } else {
            sendAlarm(client.id, message);
            res.send("Client: "+clientId+" is connected");
        }
    }
});
app.get('/message/:id', function(req, res){
    var message = req.query.message;
    var clientId = req.params.id;

    if(clientId=="all") {
        if(Object.keys(ch.clients).length==0) {
            return res.send("Send normal message: "+message+" to no one");
        }
        for(var i in ch.clients) {
            var client = ch.clients[i];

            sendText(client.id, message);
            message += "Send normal message: "+message+" to: "+client.id;
        }
        res.send(message);
    } else {
        var client = ch.clients[clientId];

        if(client==null) {
            res.send("Client: "+clientId+" is not connected");
        } else {
            sendText(client.id, message);
            res.send("Client: "+clientId+" is connected");
        }
    }
});
app.get("/usage", function(req,res){
    logger.getAllUsage(function(err, resp){
        res.send(resp);
    });
});
app.get("/clients", function(req, res) {
    var clientIDs = [];
    for(var x in ch.clients) {
        clientIDs.push(ch.clients[x].id);
    }
    res.send(clientIDs);
});
app.use("/", express.static(__dirname + '/public'));
app.listen(httpPort);
console.log("HTTP Listening on: "+httpPort);

function sendAlarm(id, message) {
    var ff = new FrameFactory();
    var frameNumber = ch.incrementFrameNumber(id);
    var data =  ff.createAlarmMessageTextMessage(frameNumber, id, 0, message, true);
    ch.sendMessage(id, data, 0);
}

function sendText(id, message, ack) {
    var ff = new FrameFactory();
    var prefix = "000,";
    if(ack)
        prefix = "123,";
    var frameNumber = ch.incrementFrameNumber(id);
    var data =  ff.createAlarmMessageTextMessage(frameNumber, id, 0, "***T***"+prefix+message, true);
    ch.sendMessage(id, data, 6000);
}

function receiveData(data, socket) {
    var date = new Date();
    //console.log(date.toISOString()+" Receive: ",data.toString());

    // Loop over the data because it can contain multiple frames
    var continueDecodeData = true;
    while(continueDecodeData) {

        if(data.length==0)
            break;

        if(data.length==1) {
            if(data[0] == POLL || data[0] == POLL_BATT) {

                decodeData(data, 0, socket);
                continueDecodeData=false;
            } else {
                continueDecodeData=false;
            }
        } else {

            var STXDetected = false;
            // TODO: Check the real position of STX
            var positionSTX = -1;
            if(data[0]==STX)
                positionSTX = 0;

            if(positionSTX != -1)
                STXDetected = true;
            var completeFrameLength = 0;
            var sizeFrameLength = 0;

            var startFrame = 0;
            if(STXDetected)
                startFrame = 1;
            // Check if first 3 chars are integer

            console.log(data.slice(startFrame,startFrame + THREE_BYTE_FRAME_LENGTH).toString());
            var parseOK  = !isNaN(data.slice(startFrame,startFrame + THREE_BYTE_FRAME_LENGTH).toString());
            if(parseOK) {
                completeFrameLength = parseInt(data.slice(startFrame,startFrame + THREE_BYTE_FRAME_LENGTH).toString()) + THREE_BYTE_FRAME_LENGTH;
                sizeFrameLength = THREE_BYTE_FRAME_LENGTH;
            } else {

                // Check if first 3 chars are integer
                var parseOK  = !isNaN(data.slice(startFrame,startFrame + TWO_BYTE_FRAME_LENGTH).toString());
                if(parseOK) {
                    completeFrameLength = parseInt(data.slice(startFrame,startFrame + TWO_BYTE_FRAME_LENGTH)) + TWO_BYTE_FRAME_LENGTH;
                    sizeFrameLength = TWO_BYTE_FRAME_LENGTH;
                }
            }
            if(parseOK) {
                if(STXDetected)
                    completeFrameLength+=1;
            }

            // Test if the complete message is received
            if(data.length >= completeFrameLength) {
                var frameData = new Buffer(completeFrameLength);
                data.copy(frameData, 0, 0, completeFrameLength);

                var restData = new Buffer(data.length - frameData.length);
                data.copy(restData, 0, frameData.length);

                if(restData.length>0) {
                    console.log("Handle restData", restData);
                } else {
                    continueDecodeData=false;
                }

                decodeData(frameData, sizeFrameLength, socket);
            } else {
                continueDecodeData = false;
            }
        }
    }
}

function decodeData(data, sizeFrameLength, socket) {

    // Check if the frame is normal polling frame
    if(data.length==1 && data[0] == POLL) {
        console.log("Polling frame");
        ch.updateClientConnBySocket(socket);

        var client = ch.sockets[socket.name];
        var promise = setActiveSense(client.sense, 2);
        promise.then();

        // Log the usage
        logger.logData(client.id, data.length);
        return;
    }

    // Check if the frame is battery polling frame
    if(data.length==1 && data[0] == POLL_BATT) {
        console.log("Polling battery frame");

        ch.updateClientConnBySocket(socket);

        var client = ch.sockets[socket.name];
        var promise = setActiveSense(client.sense, 1);
        promise.then();

        logger.logData(client.id, data.length);
        return;
    }

    var bf = new Frame(data, sizeFrameLength);
    switch(bf.typeFrame) {

        case "A":
            handleAcknowledgeData(bf);
            break;

        case "D":
            //TODO: Check what type D is.
            break;

        case "E":
            handleAvailability(bf);
            break;

        case "F":
            handleAvailabilityMultiCenter(bf)
            break;

        case "R":
            handleAcknowledgeAlert(bf);
            break;

        case "S":
            handleService(bf);
            break;

        case "G":
            handleStartUp(bf, socket);
            break;

        case "P":
            handleAcknowledgePOCSAC(bf);
            break;

        case "p":
            handleAcknowledgeSMS(bf);
            break;

        default:
            console.log("received an unknown frame")
            break;
    }

    if(bf.gps!=null) {
        var client = ch.clients[bf.pagerId];
        if(client!=null && client.user!=null) {

            var promise = setGPS(client.user, bf.gps);
            var promise2 = setGPSSense(client.sense, bf.gps);
            promise.then();
            promise2.then();
        }
    }

    // Log the usage
    console.log("Logging data:",data);
    console.log("Of size: ",data.length);
    var client = ch.clients[bf.pagerId];
    logger.logData(client.id, data.length);
}

// R Frame
function handleAcknowledgeAlert(frame) {
    //console.log("going to handle acknowledge alert");
    var ACK_AUTOMATIC = 0,
        ACK_ACCEPT = 1,
        ACK_REFUSE = 2,
        ACK_ARRIVE_15_MINUTE = 3,
        ACK_REPEAT = 97,
        ACK_MANUAL = 98,
        ACK_OTHER = 99;

    var ff = new FrameFactory();

    log(frame.pagerId, "Acknowledgement (automatic)", frame.frame, true);

    if(frame.parameter != ACK_REPEAT) {
        var data = ff.createAcknowledge(frame.followNumber, frame.permannentConnection);
        ch.sendMessage(frame.pagerId, data, 0);

        log(frame.pagerId, "Link acknowledgement", data, false);
    }

    // TODO: implement other types of acknowledgements
    // TODO: send gps location to backend

    switch(frame.parameter) {
        case ACK_ACCEPT:
            // Return something?
            break;

        case ACK_REFUSE:
            // TODO: Notify Emergency Room!
            setEscalation();
            break;
    }
}

function handleAcknowledgePOCSAC(frame) {
    // TODO: implement
    console.log("going to handle acknowledge pogsac");
}

function handleAcknowledgeSMS(frame) {
    // TODO: implement
    console.log("going to handle acknowledge sms");
}
// E Frame
function handleAvailability(frame) {

    var STATE_AVAIL = 'com.ask-cs.State.Available',
        STATE_UNAVAIL = 'com.ask-cs.State.Unavailable';

	console.log('handleAvailability: frame.parameter = ' + frame.parameter);
	
    var state = "";
    var length = 0;
    var pager_state = 0;
    switch(frame.parameter) {

        case 0:
            state = STATE_AVAIL;
            length = 1;
            pager_state = 40;
            break;
        case 1:
            state = STATE_AVAIL;
            length = 2;
            pager_state = 40;
            break;
        case 2:
            state = STATE_AVAIL;
            length = 4;
            pager_state = 40;
            break;
        case 3:
            state = STATE_AVAIL;
            length = 12;
            pager_state = 40;
            break;
        case 4:
            state = STATE_AVAIL;
            length = 24;
            pager_state = 40;
            break;
        case 5:
            state = STATE_UNAVAIL;
            length = 1;
            pager_state = 41;
            break;
        case 6:
            state = STATE_UNAVAIL;
            length = 2;
            pager_state = 41;
            break;
        case 7:
            state = STATE_UNAVAIL;
            length = 4;
            pager_state = 41;
            break;
        case 8:
            state = STATE_UNAVAIL;
            length = 12;
            pager_state = 41;
        break;
        case 9:
            state = STATE_UNAVAIL;
            length = 24;
            pager_state = 41;
            break;
    }

    if(length!=0) {
        var client = ch.clients[frame.pagerId];

        var promise1 = setAvailability(client.user, state, length);
        var promise2 = sendAvailability(frame.followNumber, frame.pagerId, 0, pager_state);
        promise1.then(function(result){
            promise2.then(function(){
                //console.log("done?");
            });
        });
    }
}

function handleAvailabilityMultiCenter(frame) {
    // TODO: implement
    console.log("going to handle availability multi center");
}
// S Frame
function handleService(frame) {
    var SRV_FRAME_VERSION = 0,
        SRV_AVAILABLE_MESSAGE = 1,
        SRV_SOS = 2,
        SRV_POS_FOLLOWUP = 3,
        SRV_REQ_SINGLE_CENTER = 4,
        SRV_SIMCARD_NUMBER = 7,
        SRV_REQ_MULTI_CENTER = 8,
        SRV_GEOFENCING = 9,
        SRV_LOSS_POGSAG = 16,
        SRV_NEG_POSITION = 99;

    var ff = new FrameFactory();

    switch(frame.parameter) {

        case SRV_SOS:

            sendAlarmToProxyAgent(frame.pagerId, frame.gps, frame.rest);


            var data = ff.createAcknowledge(frame.followNumber, frame.permannentConnection);
            ch.sendMessage(frame.pagerId, data, 0);
            break;

        case SRV_SIMCARD_NUMBER:
            var data = ff.createAcknowledge(frame.followNumber, frame.permannentConnection);
            ch.sendMessage(frame.pagerId, data, 0);
            break;

        case SRV_REQ_SINGLE_CENTER:
            var client = ch.clients[frame.pagerId];
            var promise = getAvailability(client.user);
            promise.then(function(result) {

                //var data = ff.createAvailability()
                var slot = result.slotData;
                var state = 99;
                if(slot!=null) {
                    if(slot.label=='com.ask-cs.State.Unavailable') {
                        state = 41;
                    } else {
                        state = 40;
                    }
                }

                var data = ff.createAvailability(frame.followNumber, 0, state, true);
                ch.sendMessage(frame.pagerId, data, 0);
            });
            break;

        default:
            var data = ff.createAcknowledge(frame.followNumber, frame.permannentConnection);
            ch.sendMessage(frame.pagerId, data, 0);
            break;
    }
}

function handleAcknowledgeData(frame) {
    // TODO: implement
    console.log("going to handle acknowledge data");
}

// G Frame
function handleStartUp(frame, socket) {
    //console.log("going to handle startup");
    var ff = new FrameFactory();

    var STOP = 0,
        START_SINGLE = 1,
        START_MULTI = 2,
        START_PERMANENT = 3,
        RECONNECT = 4;

    var sendDateTime = true;
    var requestSim = config.requestSim;

    switch(frame.parameter) {
        case STOP:
            // Send A Message
            var data = ff.createAcknowledge(frame.followNumber, frame.permannentConnection);
            ch.sendMessage(frame.pagerId, data, 0);

            var client = ch.sockets[socket.name];
            var promise = setActiveSense(client.sense, 0);
            promise.then();

            sendActiveToProxyAgent(frame.pagerId, false);

            log(frame.pagerId, "Ack of Birdy Stop notification", data, false);

            ch.disconnect(ch, frame.pagerId);
            return;

        case START_SINGLE:
        case START_MULTI:
        case START_PERMANENT:
            ch.addClientId(socket, frame.pagerId, frame.followNumber);
            // Send S message
            var data = ff.createServiceMessageStatusReq(frame.followNumber, frame.pagerId, frame.permannentConnection);
            ch.sendMessage(frame.pagerId, data, 5000);

            sendActiveToProxyAgent(frame.pagerId, true);

            log(frame.pagerId, "Response information that there is no control room or that the requested function is not implemented the control room", data, false);
            break;

        case RECONNECT:
            // Send A Message
            ch.addClientId(socket, frame.pagerId, frame.followNumber);
            // Send S message
            var data = ff.createServiceMessageStatusReq(frame.followNumber, frame.pagerId, frame.permannentConnection);
            ch.sendMessage(frame.pagerId, data, 5000);

            sendActiveToProxyAgent(frame.pagerId, true);

            log(frame.pagerId, "Response information that there is no control room or that the requested function is not implemented the control room", data, false);
            break;

        default:
            break;
    }

    if(sendDateTime) {
        // Send Date Time
        var frameNumber = ch.incrementFrameNumber(frame.pagerId);
        var data = ff.createAlarmMessageSendTime(frameNumber, frame.pagerId, frame.permannentConnection);
        ch.sendMessage(frame.pagerId, data, 5000);

        log(frame.pagerId, "Setting the time at "+(new Date()).toISOString(), data, false);
    }

    if(requestSim) {
        // Demand sim number
        var frameNumber = ch.incrementFrameNumber(frame.pagerId);
        var data = ff.createAlarmMessageTextMessage(frameNumber, frame.pagerId, 2, "***S***000", frame.permannentConnection);
        ch.sendMessage(frame.pagerId, data, 5000);

        log(frame.pagerId, "Asking for SIM number", data, false);
    }
}

// REST-IFIED
function setAvailability (user, state, length) {

	console.log('setAvailability');
	
    var label = state;
    var start = Math.round(new Date().getTime() / 1000);
    var end = start + (60 * 60 * length); // 1 Hour

    var deferred = Q.defer();

    if(user==null) {
        console.log("Not setting availability: "+user);
        setTimeout(function(){
            deferred.reject("No uuid");
        }, 1);
    } else {
        console.log('Start process: Login user ' + user.username + ' with password hash ' + user.passHash + ' via URL: ' + user.baseUrl);
        var client = new AskRESTClient(user.baseUrl, user.username, user.passHash);
        client.createSlot(start, end, state, function(err, result) {
            if(err) {
                console.log('CreateSlot ERROR: '+err);
                return deferred.reject(err);
            }
            console.log("createSlot: "+result);
            deferred.resolve(result);
        });
    }
	
    return deferred.promise;
}

// REST-IFIED
function getAvailability(user) {
    var start = Math.round(new Date().getTime() / 1000);
    var end = start + 1;

    var deferred = Q.defer();

    if(user==null) {
        setTimeout(function(){
            deferred.reject("No uuid");
        }, 1);
    } else {
        var client = new AskRESTClient(user.baseUrl, user.username, user.passHash);
        client.getSlots(user.username, start, end, true, function(err, result) {
            if(err) {
                return deferred.reject(err);
            }
            deferred.resolve(result);
        });
    }
    return deferred.promise;
}

function sendAvailability(frameNumber, pagerId, notification, state) {

    var deferred = Q.defer();

    setTimeout(function(frameNumber, pagerId, notification, state){
        var ff = new FrameFactory();
        var notification = 0; // TODO: Check for invalid responses
        var data = ff.createAvailability(frameNumber, notification, state, true);
        ch.sendMessage(pagerId, data, 0);
        log(pagerId, "Answer simulated (available)", data, false);
        deferred.resolve();
    },0,frameNumber, pagerId, notification, state);

    return deferred.promise;
}

function setEscalation() {

    var parNode = config.escalationgroupid,
        memNode = config.melderkamerid,
        deferred = Q.defer();

	//*
	// NOTE: Currently there is no 1-on-1 equivalent in the new REST API, so keep the old one.
    var client = new AskSoapClient(wsdl, authKey);
    client.attachNode(parNode, memNode, function(err, result) {
        if(err) {
            return deferred.reject(err);
        }
        deferred.resolve(result);
        console.log("AttachNode: ",result);
    });
	//*/
	deferred.resolve('true');

    return deferred.promise;
}

function setGPS(user, gps) {

    var parts = gps.split(",");
    var latdeg = parts[0].toString().slice(0,2);
    var latmin = parts[0].toString().slice(2)/60;
    var lat = parseFloat(latdeg) + parseFloat(latmin);

    if(parts[1]=="S")
        lat = lat * -1;

    var longdeg = parts[2].toString().slice(0,3);
    var longmin = parts[2].toString().slice(3)/60;
    var long = parseFloat(longdeg) + parseFloat(longmin);

    if(parts[3]=="W")
        long = long * -1;

    //console.log("lat: ", lat, "Long: ",long);

    var deferred = Q.defer();

    if(user==null) {
        setTimeout(function(){
            deferred.reject("No uuid");
        }, 1);
    } else {
        var client = new AskRESTClient(user.baseUrl, user.username, user.passHash);
        client.createResource(user.username, "latlong", lat+","+long, function(err, result) {
            if(err) {
                console.log(' ERROR: '+err);
                return deferred.reject(err);
            }
            console.log("createResource: "+result);
            deferred.resolve(result);
        });
    }
	//*/

    return deferred.promise;
}

function setGPSSense(sense, gps) {

    var parts = gps.split(",");
    var latdeg = parts[0].toString().slice(0,2);
    var latmin = parts[0].toString().slice(2)/60;
    var lat = parseFloat(latdeg) + parseFloat(latmin);

    if(parts[1]=="S")
        lat = lat * -1;

    var longdeg = parts[2].toString().slice(0,3);
    var longmin = parts[2].toString().slice(3)/60;
    var long = parseFloat(longdeg) + parseFloat(longmin);

    if(parts[3]=="W")
        long = long * -1;

    var accuracy = parts[4];

    console.log("lat: ", lat, " Long: ",long," Accuracy: ",accuracy);

    var deferred = Q.defer();

    if(sense==null) {
        setTimeout(function(){
            deferred.reject("Sense is null");
        }, 1);
    } else {
        sense.addGPSData(lat, long, accuracy, function(err, res){
            if(err) {
                console.log("Failed setting gps data: ",err);
                deferred.reject(err);
            } else {
                console.log("Added gps data", res);
                deferred.resolve();
            }
        });
    }

    return deferred.promise;
}

function setActiveSense(sense, value) {
    var deferred = Q.defer();

    if(sense==null) {
        setTimeout(function(){
            deferred.reject("Sense is null");
        }, 1);
    } else {

        sense.addActiveData(value, function(err, res){
            if(err) {
                console.log("Failed setting active data: ",err);
                deferred.reject(err);
            } else {
                console.log("Added active data", res);
                deferred.resolve();
            }
        })
    }

    return deferred.promise;
}

function gpsToLatLong(gps) {

    var parts = gps.split(",");
    var latdeg = parts[0].toString().slice(0,2);
    var latmin = parts[0].toString().slice(2)/60;
    var lat = parseFloat(latdeg) + parseFloat(latmin);

    if(parts[1]=="S")
        lat = lat * -1;

    var longdeg = parts[2].toString().slice(0,3);
    var longmin = parts[2].toString().slice(3)/60;
    var long = parseFloat(longdeg) + parseFloat(longmin);

    if(parts[3]=="W")
        long = long * -1;

    var latlong = {};
    latlong.latitude = lat;
    latlong.longitude = long;

    return latlong;
}

function sendAlarmToProxyAgent(pagerId, gps, type) {

    var params = {};
    params.pagerId = pagerId;
    params.type = type;

    if(gps!=null) {
        var latlong = gpsToLatLong(gps);
        params.latitude = latlong.latitude;
        params.longitude = latlong.longitude;
    }

    var request = {};
    request.method = "pagerAlarm";
    request.params = params;

    sendToAgent(request, function(res) {
       console.log("Send alarm with res: "+res);
    });
}

function sendActiveToProxyAgent(pagerId, active) {

    var params = {};
    params.pagerId = pagerId;
    params.active = active;

    var request = {};
    request.method = "onActivate";
    request.params = params;

    sendToAgent(request, function(res) {
        console.log("Send activity with res: "+res);
    });
}

function sendToAgent(request, callback) {
    var agentUrl = config.alarmAgentUrl
    var parsedUrl = url.parse(agentUrl);

    var options = {
        host: parsedUrl.host,
        path: parsedUrl.path,
        method: 'POST'
    }

    var req = http.request(options, function(res) {
        res.on("data", function(chunk) {
            callback(null, chunk);
        });
    }).on('error', function(e) {
            console.log("Error: " + e.message);
            callback(e.message, null);
        });

    // write data to request body
    req.write(JSON.stringify(request) + '\n');
    req.end();
}