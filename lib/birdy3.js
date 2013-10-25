var LENGTH_FRAME_TYPE = 1,
    LENGTH_FOLLOW_NUMBER = 2,
    LENGTH_PAGER_ID = 7,
    LENGTH_GPS_LENGTH = 2,
    LENGTH_PARAMETER = 2;

var BirdyFrame = function(data, frameLength) {

    this.data = data;
    this.frameLengthLength = frameLength;

    if(data[0] == 2) {
        this.frame = data.toString().substring(1);
    } else {
        this.frame = data.toString();
    }

    this.followNumber = 0;
    this.contentLength = 0;
    this.pagerId = 0;
    this.remainDataLength = data.length;

    console.log("StartFrameType ",START_FRAME_TYPE);

    // Set all the starts
    this.startFrameType = this.frameLengthLength;
    this.startFollowNumber = this.startFrameType + LENGTH_FRAME_TYPE;
    this.startPagerId = this.startFollowNumber + LENGTH_FOLLOW_NUMBER;
    this.startGPSLength = this.startPagerId + LENGTH_PAGER_ID;
    this.startGPSPosition = this.startGPSLength + LENGTH_GPS_LENGTH;

    this.remainDataLength -= LENGTH_FRAME_TYPE;
    this.typeFrame = this.frame.substr(this.startFrameType, LENGTH_FRAME_TYPE);
};

BirdyFrame.prototype.decodeStart = function() {

    // identify follow number
    if(isNaN(this.frame.substr(this.startFollowNumber, LENGTH_FOLLOW_NUMBER)))
        return false;
    this.followNumber = parseInt(this.frame.substr(this.startFollowNumber, LENGTH_FOLLOW_NUMBER));

    this.remainDataLength -= LENGTH_FOLLOW_NUMBER;

    // identify pager Id from the data
    if(isNaN(this.frame.substr(this.startPagerId, LENGTH_PAGER_ID)))
        return false;
    this.pagerId = parseInt(this.frame.substr(this.startPagerId, LENGTH_PAGER_ID));

    this.remainDataLength -= LENGTH_PAGER_ID;

    // identify GPS location from data
    // Check if the
    this.gpsDataLength = 0;
    if(isNaN(this.frame.substr(this.startGpsLength, LENGTH_GPS_LENGTH)))
        return false;
    this.gpsDataLength = parseInt(this.frame.substr(this.startGPSLength, LENGTH_GPS_LENGTH));

    this.remainDataLength -= LENGTH_GPS_LENGTH;

    if(this.gpsDataLength!=0) {
        // TODO: Subtract position from data
    }
    this.remainDataLength -= gpsDataLength;

    this.startParameter = this.startGPSPosition + this.gpsDataLength;

    // Load parameter??

    return true;
}

module.exports = BirdyFrame;





