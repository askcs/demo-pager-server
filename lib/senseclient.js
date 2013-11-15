/**
 * Created by sstam on 15-11-13.
 */
var CommonSense = require("commonsense"),
    Q           = require("q"),
    commonSense = new CommonSense();

var SenseClient = function(username, password) {

    this.login = login(username, password);
    this.gps = null;
    this.active = null;
    var sc = this;
    function login(username, password) {
        var deferred = Q.defer();
        commonSense.createSession(username, password, function(err, res){
            if(err) {
                console.log(err);
                deferred.reject(err);
            } else {
                sc.session = res.object.session_id;
                commonSense.sensors(function(err, res) {
                    var sensors = res.object.sensors;
                    for(var x in sensors) {
                        var sensor = sensors[x];
                        if(sensor.name=="gps") {
                            sc.gps = sensor.id;
                        }

                        else if(sensor.name=="active") {
                            sc.active = sensor.id;
                        }
                    }
                    if(sc.gps!=null && sc.active!=null) {
                        console.log("GPS has id: ",sc.gps);
                        console.log("Active has id: ",sc.active);
                        deferred.resolve();
                    } else {
                        var data = {"sensor":{"name":"gps","display_name":"GPS","device_type":"position","data_type":"json","data_structure":"{\"longitude\":\"float\",\"latitude\":\"float\",\"accuracy\":\"float\"}"}};
                        commonSense.createSensor(data, function(err, res){
                            if(err) {
                                console.log("Error creating sensor: ",err, res);
                                deferred.reject(err);
                            } else {
                                var sensor = res.object.sensor;
                                sc.gps = sensor.id;
                                console.log("Added gps sensor with id: ",sc.gps);
                                var data = {"sensor":{"name":"active","display_name":"Active","device_type":"active","data_type":"float"}};
                                commonSense.createSensor(data, function(err, res){
                                    if(err) {
                                        console.log("Error creating sensor: ",err, res);
                                        deferred.reject(err);
                                    } else {
                                        var sensor = res.object.sensor;
                                        sc.active = sensor.id;
                                        console.log("Added active sensor with id: ",sc.active);
                                        deferred.resolve();
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
        return deferred.promise;
    }
}

SenseClient.prototype.addGPSData = function(lat, long, accuracy, callback) {
    var sc = this;
    var now = new Date();
    var data = {"data":[{"value":"{\"latitude\":"+lat+",\"longitude\":"+long+",\"accuracy\":"+accuracy+"}","date":now.getTime()}]};
    this.login.then(function() {
        commonSense.createSensorData(sc.gps, data, callback);
    });
}

SenseClient.prototype.addActiveData = function(value, callback) {
    var sc = this;
    var now = new Date();
    var data = {"data":[{"value":value,"date":now.getTime()}]};
    this.login.then(function() {
        commonSense.createSensorData(sc.active, data, callback);
    });
}

module.exports = SenseClient;