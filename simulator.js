var net = require('net');

var ASK_TYPE = 'A';
var START_END = '01';
var STOP_END = '00';
var GPS_DATA_EMPTY = '00';
var GPS_DATA = '295154.62537,N,00427.14437,E,99';
var PAGERID = '0000001';
var gCount = 1;
var timer = null;
var counter = 0;

var connection = net.connect(7550, "localhost", function() {   // connect to the server we made
   console.log("client connected");

   start();
   function start () {   // every 1000ms,
       var message = createStartFrame();

       connection.write(message, function(err, res){
           if(err) throw err;

           console.log("Message send: ",message.toString());
       });// write to the connection
	   
	   
	   /* Availability */
	   //*
	   var availibilityFrame = createAvailabilityFrame();

       connection.write(availibilityFrame, function(err, res){
           if(err) throw err;

           console.log("Message send: ",message.toString());
       });// write to the connection
	   //*/

       restartTimer();
   }
});

function restartTimer() {
   if(timer!=null) {
       console.log("Restarting timer");
       clearTimeout(timer);
   } else
       console.log("Starting timer");

   timer = setTimeout(sendPoll, 60 * 1000);
}

function sendPoll() {

   counter++;
   if(counter==99) {
       var message = createStopFrame();
       connection.write(message);
       return;
   }
   connection.write("\x05");

   restartTimer();
}

function addLeadingZero(value) {
   return ("0" + value).slice(-2);
}

connection.on('data', function(data) {

   console.log('DATA: ' + data);
   parseData(data);
});

function parseData(data) {

   console.log(data[0].toString());
   if(data[0]==2) {
       data = data.slice(1,data.length);
       console.log(data.toString());

       var length = data.slice(0,2);
       var type = data.slice(2,3);
       var frameNumber = data.slice(3,5);
   } else {
       console.log(data.toString());

       var length = data.slice(0,2);
       var type = data.slice(2,3);
       var count = data.slice(3,5);
   }

   console.log("Len: ",length.toString());
   console.log("Type: ",type.toString());
   console.log("FrameNumber: ",frameNumber.toString());

   frameNumber = parseInt(frameNumber);

   if(parseInt(count,10)!=gCount) {
       if(type=='B') {
           var message = createAutoAckFrame(frameNumber);

           connection.write(message, function(err, res){
               if(err) throw err;

               console.log("Message send: ",message.toString());
           });// write to the connection
       }

       if(type=='B' && length=="32") {
           var message2 = requestAvailFrame();
           setTimeout(function(mes){
               connection.write(mes, function(err, res){
                   if(err) throw err;

                   console.log("Message send: ",mes.toString());
               });
           }, 4000, message2);
       }

       if(type=='B' && length=="25") {
           var message = createSimcardFrame();
           setTimeout(function(mes){
               connection.write(mes, function(err, res){
                   if(err) throw err;

                   console.log("Message send: ",mes.toString());
               });
           }, 4000, message);

           var message2 = requestAvailFrame();
           setTimeout(function(mes){
               connection.write(mes, function(err, res){
                   if(err) throw err;

                   console.log("Message send: ",mes.toString());
               });
           }, 8000, message2);
       }
   }

   restartTimer();
}

function createStartFrame() {

   var frameType = "G";
   var message = frameType + addLeadingZero(gCount) + PAGERID + GPS_DATA + START_END;
   message = "\x02" + message.length.toString() + message;

   return new Buffer(message);
}

function createStopFrame() {
   gCount++;
   var frameType = "G";
   var message = frameType + addLeadingZero(gCount) + PAGERID + '00' + STOP_END;
   message = "\x02" + message.length.toString() + message;

   return new Buffer(message);
}

function createAutoAckFrame(frameNumber) {
   var frameType = "R";
   frameNumber++;
   var message = frameType + addLeadingZero(frameNumber) + PAGERID + GPS_DATA + '00000';
   message = "\x02" + message.length.toString() + message;
   return new Buffer(message);
}

function createSimcardFrame() {
   var frameType = "S";
   var param = "07";
   var simcard = "981361122127356128F7";
   gCount++;
   var message = frameType + addLeadingZero(gCount) + PAGERID + GPS_DATA + param + simcard.length + simcard;
   message = "\x02" + message.length.toString() + message;
   return new Buffer(message);
}

function createAvailabilityFrame() {

   var frameType = "E";
   var param = "00";
   gCount++;
   var message = frameType + addLeadingZero(gCount) + PAGERID + GPS_DATA + param;
   message = "\x02" + message.length.toString() + message;
   return new Buffer(message);
}

function requestAvailFrame() {

   var frameType = "S";
   var param = "04";
   gCount++;
   var message = frameType + addLeadingZero(gCount) + PAGERID + GPS_DATA + param;
   message = "\x02" + message.length.toString() + message;
   return new Buffer(message);
}