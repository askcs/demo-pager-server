/**
 * Created by sstam on 21-02-14.
 */
var PouchDB = require('pouchdb');

var DataLogger = function() {
    this.db = new PouchDB('db');
    this.revs = {};
}

DataLogger.prototype.logData = function(pagerId, length) {
    var thiz = this;
    var doc = this.db.get(pagerId, function(err, doc){

        if(err) {
            if(err.status==404) {
                var doc = {_id: pagerId+"",
                            usage: length,
                            count: 1};
                console.log("Storing: ",doc);
                thiz.db.put(doc, function(err, response){

                    if(err) {
                        console.log("Creation failed: ",err);
                        return;
                    }

                   console.log("Created: ",response);
                });
            }
            return;
        }

        //console.log("Found doc: ",doc);
        if(thiz.equalsLastRev(pagerId, doc._rev)) {
            return thiz.logData(pagerId, length);
        }

        doc.usage += length;
        doc.count++;

        return thiz.db.put(doc, function(err, resp){
            if(err) {
                if(err.status==409) {
                    thiz.logData(pagerId, length);
                }
                return;
            }

            console.log("Updated: ",resp);
        });


    });
}

DataLogger.prototype.getAllUsage = function(callback) {
    this.db.allDocs({include_docs: true}, callback);
}

DataLogger.prototype.equalsLastRev = function(pagerId, rev) {
    var res = false;
    if(this.revs[pagerId]!=null) {
        if(this.revs[pagerId]==rev) {
            res = true;
        }
    }

    this.revs[pagerId] = rev;
    return res;
}
module.exports = DataLogger;