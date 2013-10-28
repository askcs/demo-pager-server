
var FrameFactory = function() {};

FrameFactory.prototype.createServiceMessageStatusReq = function (frameNumber, pagerID, permenantConnection) {

    var frameType = "S";
    var parameter = "08"; // Multi center confirm??
    var frame = frameType;
    frame += padLeft(frameNumber,2); // Add frameNumber with leading zeros
    frame += padLeft(pagerID, 7);
    frame += padLeft(parameter, 2);

    frame += "0"; // Add count number of centres

    var frameLength = frame.length;
    frame = padLeft(frameLength, 2) + frame;
    if(permenantConnection)
        frame = "\x02" + frame;
    return new Buffer(frame);
}

FrameFactory.prototype.createAlarmMessageSendTime = function (frameNumber, pagerID, permenantConnection) {

    var frameType = "B";
    var parameter = 1;
    var frame = frameType;
    frame += padLeft(frameNumber,2); // Add frameNumber with leading zeros
    frame += padLeft(pagerID, 7);
    frame += padLeft(parameter, 2);

    // Add the date time
    var date = new Date();
    var dateTimeFrame = "";
    dateTimeFrame += padLeft(date.getUTCHours(), 2);
    dateTimeFrame += padLeft(date.getUTCMinutes(), 2);
    dateTimeFrame += padLeft(date.getUTCDate(), 2);
    dateTimeFrame += padLeft((date.getUTCMonth()+1), 2);
    dateTimeFrame += padLeft((date.getUTCFullYear()-2000), 2);
    dateTimeFrame = "***S***"+dateTimeFrame;
    dateTimeFrame = padLeft(dateTimeFrame.length, 3) + dateTimeFrame;

    frame += dateTimeFrame;

    var frameLength = frame.length;
    frame = padLeft(frameLength, 2) + frame;
    if(permenantConnection)
        frame = "\x02" + frame;
    return new Buffer(frame);
}

FrameFactory.prototype.createAlarmMessageTextMessage = function (frameNumber, pagerID, parameter, text, permenantConnection) {

    if(text.length>256)
        text = text.substr(0, 256);

    var frameType = "B";
    var frame = frameType;
    frame += padLeft(frameNumber,2); // Add frameNumber with leading zeros
    frame += padLeft(pagerID, 7);
    frame += padLeft(parameter, 2);
    frame += padLeft(text.length, 3);
    frame += text;

    var frameLength = frame.length;
    frame = padLeft(frameLength, 2) + frame;
    if(permenantConnection)
        frame = "\x02" + frame;
    return new Buffer(frame);
}

FrameFactory.prototype.createAcknowledge = function(frameNumber, permenantConnection) {

    var frameType = "A";
    var frame = frameType;
    frame += padLeft(frameNumber,2); // Add frameNumber with leading zeros

    var frameLength = frame.length;
    frame = padLeft(frameLength, 2) + frame;
    if(permenantConnection)
        frame = "\x02" + frame;
    return new Buffer(frame);
}

function padLeft(nr, n, str){
    return Array(n-String(nr).length+1).join(str||'0')+nr;
}

module.exports = FrameFactory;