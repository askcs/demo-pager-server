var net = require('net'),
    config = require('config').Server,
    ClientHandler = require('./lib/clienthandler.js'),
    Frame = require('./frames/frame.js'),
    FrameFactory = require('./lib/framefactory.js');

var ch = new ClientHandler(config.delayInactivity);
var port = config.port;

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
        ch.removeBySocket(socket);
    });

    // Remove the client from the list when it leaves
    socket.on('end', function () {
        console.log(date.toISOString()+" Client disconnected: "+socket.name);
        ch.removeBySocket(socket);
    });
});

server.listen(port);
console.log("Listening on port: ", port);

function receiveData(data, socket) {
    var date = new Date();
    console.log(date.toISOString()+" Receive: ",data);

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

            // TODO: do not assume it's only one frame
            //continueDecodeData=false;
        }
    }
}

function decodeData(data, sizeFrameLength, socket) {
    // Check if the frame is normal polling frame
    if(data.length==1 && data[0] == POLL) {
        console.log("Polling frame");

        ch.updateClientConnBySocket(socket);
        return;
    }

    // Check if the frame is battery polling frame
    if(data.length==1 && data[0] == POLL_BATT) {
        console.log("Polling battery frame");

        ch.updateClientConnBySocket(socket);
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
}

// R Frame
function handleAcknowledgeAlert(frame) {
    console.log("going to handle acknowledge alert");

}

function handleAcknowledgePOCSAC(frame) {
    // TODO: implement
    console.log("going to handle acknowledge pogsac");
}

function handleAcknowledgeSMS(frame) {
    // TODO: implement
    console.log("going to handle acknowledge sms");
}

function handleAvailability(frame) {
    // TODO: implement
    console.log("going to handle availability");
}

function handleAvailabilityMultiCenter(frame) {
    // TODO: implement
    console.log("going to handle availability multi center");
}

function handleService(frame) {
    // TODO: implement
    console.log("going to handle service");
}

function handleAcknowledgeData(frame) {
    // TODO: implement
    console.log("going to handle acknowledge data");
}

// G Frame
function handleStartUp(frame, socket) {
    console.log("going to handle startup");
    var ff = new FrameFactory();

    var STOP = 0,
        START_SINGLE = 1,
        START_MULTI = 2,
        START_PERMANENT = 3,
        RECONNECT = 4;

    var sendDateTime = true;
    var requestSim = true;

    switch(frame.parameter) {
        case STOP:
            // Send A Message
            break;

        case START_SINGLE:
        case START_MULTI:
        case START_PERMANENT:
            ch.addClientId(socket, frame.pagerId, frame.followNumber);
            // Send S message
            var data = ff.createServiceMessageStatusReq(frame.followNumber, frame.pagerId, frame.permannentConnection);
            ch.sendMessage(frame.pagerId, data, 5000);
            break;

        case RECONNECT:
            // Send A Message
            break;

        default:
            break;
    }

    if(sendDateTime) {
        // Send Date Time
        var frameNumber = ch.incrementFrameNumber(frame.pagerId);
        var data = ff.createAlarmMessageSendTime(frameNumber, frame.pagerId, frame.permannentConnection);
        ch.sendMessage(frame.pagerId, data, 5000);
    }

    if(requestSim) {
        // Demand sim number
        var frameNumber = ch.incrementFrameNumber(frame.pagerId);
        var data = ff.createAlarmMessageTextMessage(frameNumber, frame.pagerId, 2, "***S***000", frame.permannentConnection);
        ch.sendMessage(frame.pagerId, data, 5000);
    }
}