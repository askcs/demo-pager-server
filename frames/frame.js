var LENGTH_FRAME_TYPE = 1,
    LENGTH_FOLLOW_NUMBER = 2,
    LENGTH_PAGER_ID = 7,
    LENGTH_GPS_LENGTH = 2,
    LENGTH_PARAMETER = 2;

var Frame = function(data, frameLength) {

    this.data = data;
    this.frameLengthLength = frameLength;
    this.permannentConnection = false;

    this.decodeStartFrame();
    if(this.decodeFrame()) {
        this.decodeTypeSpecific();
    } else {
        console.log("Failed decoding")
    }
};

/**
 * Decode the STX, frameLength and type
 */
Frame.prototype.decodeStartFrame = function() {

    if(this.data[0] == 2) {
        this.frame = this.data.toString().substring(1);
        this.permannentConnection = true;
    } else {
        this.frame = this.data.toString();
    }

    this.calculateStarts();

    this.typeFrame = this.frame.substr(this.startFrameType, LENGTH_FRAME_TYPE);
};

/**
 *
 * @returns {boolean}
 */
Frame.prototype.decodeFrame = function() {

    // identify follow number
    if(isNaN(this.frame.substr(this.startFollowNumber, LENGTH_FOLLOW_NUMBER)))
        return false;
    this.followNumber = parseInt(this.frame.substr(this.startFollowNumber, LENGTH_FOLLOW_NUMBER));

    // identify pager Id from the data
    if(isNaN(this.frame.substr(this.startPagerId, LENGTH_PAGER_ID)))
        return false;
    this.pagerId = parseInt(this.frame.substr(this.startPagerId, LENGTH_PAGER_ID));

    // identify GPS location from data
    // Check if the
    this.gpsDataLength = 0;
    if(isNaN(this.frame.substr(this.startGpsLength, LENGTH_GPS_LENGTH)))
        return false;
    this.gpsDataLength = parseInt(this.frame.substr(this.startGPSLength, LENGTH_GPS_LENGTH));

    if(this.gpsDataLength!=0) {
        // TODO: Subtract position from data
    }
    this.startParameter = this.startGPSPosition + this.gpsDataLength;

    return true;
}

/**
 * Based on the frameLengthLength all the start positions are calculated
 */
Frame.prototype.calculateStarts = function() {
    // Set all the starts
    this.startFrameType = this.frameLengthLength;
    this.startFollowNumber = this.startFrameType + LENGTH_FRAME_TYPE;
    this.startPagerId = this.startFollowNumber + LENGTH_FOLLOW_NUMBER;
    this.startGPSLength = this.startPagerId + LENGTH_PAGER_ID;
    this.startGPSPosition = this.startGPSLength + LENGTH_GPS_LENGTH;
};

Frame.prototype.decodeTypeSpecific = function() {

    switch(this.typeFrame) {

        case "G":
            return this.decodeG();

        case "R":
            break;

        case "S":
            break;

        case "P":
            break;
    }
};

Frame.prototype.decodeG = function() {

    var STOP = 0,
        START_SINGLE = 1,
        START_MULTI = 2,
        START_PERMANENT = 3,
        RECONNECT = 4;

    var LENGTH_NUMBER_CENTERS = 1;

    if(isNaN(this.frame.substr(this.startParameter, LENGTH_PARAMETER)))
        return false;
    this.parameter = parseInt(this.frame.substr(this.startParameter, LENGTH_PARAMETER));

    if(this.parameter == START_MULTI) {
        // TODO: Implement
    } else if(this.parameter == START_PERMANENT) {
        // TODO: Implement
    }
}

module.exports = Frame;