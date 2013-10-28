/**
 * Created with JetBrains WebStorm.
 * User: user
 * Date: 28-10-13
 * Time: 11:01
 * To change this template use File | Settings | File Templates.
 */

function log(pagerId, message, frame, inbound) {

    var date = new Date();
    var pagerString = "to   "+pagerId;
    if(inbound) {
        pagerString = "from "+pagerId;
    }
    console.log(date.toISOString()+" | "+pagerString+" | "+message+ " | "+frame);
}

module.exports = log;