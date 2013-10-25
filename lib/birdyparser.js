
var BirdyParser = function(){};

var STX = 0x02,
    LIVE = 0x05,
    LIVE_BATT = 0x07;

var TWO_BYTE_FRAME_LENGTH = 2,
    THREE_BYTE_FRAME_LENGTH = 3;

BirdyParser.prototype.parseData = function(data) {

    var continueDecoding = true;
    while(continueDecoding) {
        if(data.length == 1) {
            if(data[0] == LIVE||
                data[0] == LIVE_BATT) {

            } else {
                continueDecoding = false;
            }
        } else {
            var STXDetectec = false;
            var positionSTX = data.indexOf(STX);
            if(positionSTX != -1)
                STXDetectec = true;

            var completeFrameLength = 0;
            var frameLength = 0;

            // Check if first 3 chars are integer
            var parseOK  = !isNaN(data.slice(0,THREE_BYTE_FRAME_LENGTH));
            if(parseOK) {
                frameLength = data.slice(0,THREE_BYTE_FRAME_LENGTH);
                completeFrameLength = frameLength + THREE_BYTE_FRAME_LENGTH;
            } else {

                // Check if first 3 chars are integer
                var parseOK  = !isNaN(data.slice(0,TWO_BYTE_FRAME_LENGTH));
                if(parseOK) {
                    frameLength = data.slice(0,TWO_BYTE_FRAME_LENGTH);
                    completeFrameLength = frameLength + TWO_BYTE_FRAME_LENGTH;
                }
            }

            // Test if the complete message is received
            if(data.length >= completeFrameLength) {
                this.decodeData(data, frameLength);
            } else {
                continueDecoding = false;
            }
        }
    }
}

BirdyParser.prototype.decodeData = function(data, frameLength) {

    if(data.length == 1 && data[0] == LIVE) {

    }

    if(data.length == 1 && data[0] == LIVE_BATT) {

    }

    var frame = birdy3(data, frameLength);
    switch(frame.typeFrame) {

    }
};