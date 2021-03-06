function array_to_base64(byteArray) {
    function count_bit(mask) {
        var count = 0;
        var direction = (mask & 0x01) == 0 ?  2 :  0.5;

        while ((mask & 0xff) > 0) {
            mask *= direction;
            count++;
        }

        return count;
    }

    function cutoff(byte, mask) {
        var bit_count = count_bit(mask);

        return {
            body: {bit_value: byte >> (8 - bit_count), bit_count: bit_count},
            remainder: {bit_value: (byte & (mask ^ 0xff)) << (bit_count - 2), bit_count: 8 - bit_count}
        };
    }

    var piece_last = {
        body: {bit_value: 0, bit_count: 0},
        remainder: {bit_value: 0, bit_count: 0}
    };

    function compose(byte) {
        var concatenation = [];

        var num = (piece_last.remainder.bit_count % 6) + 2;
        var piece = cutoff(byte, 0xfc >> num << num);

        if (piece_last.remainder.bit_count == 6) {
            concatenation.push(piece.body.bit_value);
        }
        else {
            concatenation.push(piece_last.remainder.bit_value + piece.body.bit_value);
        }

        if (piece.remainder.bit_count == 6) {
            concatenation.push(piece.remainder.bit_value);
        }

        piece_last = piece;

        return concatenation;
    }

    const code_map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    var output = '';

    var i = 0;
    for (; i < byteArray.length; i++) {
        compose(byteArray[i]).forEach(function (value) {
            output += code_map[value];
        });
    }

    while (piece_last.remainder.bit_count % 6 != 0) {
        compose(0).forEach(function (value) {
            if (i <= byteArray.length) {
                output += code_map[value];
            }
            else {
                output += '=';
            }

            i++;
        });
    }


    return output;
}

var username = '', password = '', last_claim_date = '';

function deliver_report(username, password, response) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onload = function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                var dataStr = this.responseText;

                var buffer = new ArrayBuffer(dataStr.length);
                var byteArray = new Uint8Array(buffer);

                for (var i = 0; i < byteArray.length; i++) {
                    byteArray[i] = dataStr.charCodeAt(i);
                }

                // console.log('buffer size: ' + byteArray.length);

                var base64Str = array_to_base64(byteArray);

                var req = new XMLHttpRequest();

                req.onreadystatechange = function () {
                    var jsonObj = JSON.parse(this.responseText);

                    if (this.readyState == 4) {
                        var currentdate = new Date();
                        var datetime = " @ " + currentdate.getFullYear() + "-"
                            + (currentdate.getMonth() + 1) + "-"
                            + currentdate.getDate() + " "
                            + currentdate.getHours() + ":"
                            + currentdate.getMinutes() + ":"
                            + currentdate.getSeconds();

                        // console.log(jsonObj.data.last_claim_date);

                        chrome.storage.local.set({
                            last_update: {
                                datatime: datetime,
                                code: jsonObj.code,
                                msg: jsonObj.msg,
                                claim_date: jsonObj.data.last_claim_date
                            }
                        });

                        response(jsonObj.code, jsonObj.msg, jsonObj.data);
                    }
                }
                req.open('POST', 'https://cybergear.io/claim-gatherer/api/report', false);
                // req.open('POST', 'http://localhost:8000/claim-gatherer/api/report', false);
                req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

                try {
                    req.send('report=' + base64Str + '&username=' + username);
                }
                catch (e) {
                    // console.log('exception ==== ' + e);

                    var currentdate = new Date();
                    var datetime = " @ " + currentdate.getFullYear() + "-"
                        + (currentdate.getMonth() + 1) + "-"
                        + currentdate.getDate() + " "
                        + currentdate.getHours() + ":"
                        + currentdate.getMinutes() + ":"
                        + currentdate.getSeconds();

                    chrome.storage.local.set({
                        last_update: {
                            datatime: datetime,
                            code: -2,
                            msg: 'Failed'
                        }
                    });

                    response(-2, 'Failed');
                }
            }
            else {
                var currentdate = new Date();
                var datetime = " @ " + currentdate.getFullYear() + "-"
                    + (currentdate.getMonth() + 1) + "-"
                    + currentdate.getDate() + " "
                    + currentdate.getHours() + ":"
                    + currentdate.getMinutes() + ":"
                    + currentdate.getSeconds();

                chrome.storage.local.set({
                    last_update: {
                        datatime: datetime,
                        code: this.status,
                        msg: 'Failed'
                    }
                });

                response(this.status, 'Failed');
            }
        }
    }

    xmlHttp.open('POST', 'https://w3.ibm.com/services/bicentral/protect/reportframework/personal/5848/report.xls?type=excel', false);
    // xmlHttp.open('GET', 'http://localhost:8000/claim-gatherer/api/report', false);
    xmlHttp.setRequestHeader('Authorization', 'Basic ' + btoa(username + ':' + password));
    xmlHttp.setRequestHeader('Access-Control-Allow-Origin', '*');
    // xmlHttp.responseType = 'arraybuffer';
    xmlHttp.overrideMimeType('text/plain; charset=x-user-defined');

    try {
        xmlHttp.send(null);
    }
    catch (e) {
        // console.log('exception ==== ' + e);

        var currentdate = new Date();
        var datetime = " @ " + currentdate.getFullYear() + "-"
            + (currentdate.getMonth() + 1) + "-"
            + currentdate.getDate() + " "
            + currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();

        chrome.storage.local.set({
            last_update: {
                datatime: datetime,
                code: -1,
                msg: 'Failed'
            }
        });

        response(-1, 'Failed');
    }
};

function scheduleDeliverTask() {
    if (username && password) {
        deliver_report(username, password, function (code, msg, data) {
            console.log('date: ' + data.last_claim_date + ' isBehind: ' + data.is_behind);

            if (code != 0) {
                setTimeout(scheduleDeliverTask, 10 * 1000); // 10 Seconds
            }
        });
    }
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.username && request.password) {
            deliver_report(request.username, request.password, sendResponse);
        }
    });

chrome.storage.local.get('user_info', function (res) {
    username = res.user_info.username;
    password = res.user_info.password;

    scheduleDeliverTask();
});

chrome.storage.local.get('last_update', function (res) {
    last_claim_date = res.last_update.claim_date;

    setInterval(function () {
        var now = new Date();
        var last = new Date(last_claim_date);

        // console.log('diff: ' + (now - last));
        if (now > last) {
            scheduleDeliverTask();
        }
    }, 60 * 60 * 1000); // 1 hour
});