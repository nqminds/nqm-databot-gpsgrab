/**
 * GPS grab and store:
 * @param {Object} tdx Api object.
 * @param {Object} output functions.
 * @param {Object} packageParams of the databot.
 * @param {Collection} ID collection.
 */
function GrapGPS(tdxApi, output, packageParams, colID) {
    tdxApi.getDatasetData(packageParams.gpsSources, null, null, null, function (errSources, sourcesData) {
        if (errSources) {
            output.error("Error GPS sources table: %s", JSON.stringify(errSources));
            process.exit(1);
        } else {
            output.debug("Retrieved GPS sources table: %d entries", sourcesData.data.length);


            var req = function (gpslist, reqlist, cb) {

                var element;

                if (!reqlist.length) {
                    cb(gpslist);
                    return;
                }

                element = reqlist.pop();

                if (element.Src == 'MK' && element.Datatype == 'XML') {
                    request
                        .get(element.Host + element.Path)
                        .auth(element.APIKey, '')
                        .end((error, response) => {
                            if (error) {
                                output.error("API request error: %s", error);
                                req(gpslist, reqlist, cb);
                            } else
                                parseXmlString(response.text, function (errXmlParse, result) {
                                    if (errXmlParse) {
                                        output.error("XML parse error: %s", JSON.stringify(errXmlParse));
                                        req(gpslist, reqlist, cb);
                                    } else {
                                        var timestamp, lat, lon, ele;

                                        _.forEach(result.feed.datastream, function (field) {
                                            if (field['$']['id'] == "1") {
                                                var date = new Date(Date.parse(field['current_time']));
                                                timestamp = date.getTime();
                                            } else if (field['$']['id'] == "2")
                                                lat = field['current_value'];
                                            else if (field['$']['id'] == "3")
                                                lon = field['current_value'];
                                        });

                                        var entry = {
                                            'ID': Number(element.ID),
                                            'timestamp': Number(timestamp),
                                            'lat': Number(lat),
                                            'lon': Number(lon),
                                            'ele': Number(result.feed['location'][0]['ele'])
                                        };

                                        colID[entry.ID] = entry;

                                        tdxApi.addDatasetData(packageParams.gpsDataTable, entry, function (errAdd, resAdd) {
                                            if (errAdd) output.error("Error adding entry to dataset: %s", JSON.stringify(errAdd));
                                            else gpslist.push(entry);
                                            req(gpslist, reqlist, cb);
                                        });
                                    }
                                });
                        });
                } else {
                    cb(gpslist);
                    return;
                }
            }

            setInterval(function () {
                req([], sourcesData.data.slice(), function (gpslist) {
                    output.debug("Added %d entries to main dataset", gpslist.length);
                    var idList = [];

                    _.map(colID, function(val, key){
                        if (key!=='undefined') {
                            var entry = {
                                'ID': Number(val.ID),
                                'timestamp': Number(val.timestamp),
                                'lat': Number(val.lat),
                                'lon': Number(val.lon),
                                'ele': Number(val.ele)
                            };
                            idList.push(entry);
                        }
                    });

                    console.log("HERE");
                    tdxApi.truncateDataset(packageParams.gpsDataTableLatest, function (errTruncate, resTruncate) {
                        if(errTruncate) {
                            output.error("Truncate: %s", JSON.stringify(errTruncate));
                        } else {
                            tdxApi.addDatasetData(packageParams.gpsDataTableLatest, idList, function (errAdd, resAdd) {
                                if (errAdd) {
                                    output.error("Add: %s", JSON.stringify(errAdd));
                                } else {
                                    output.debug("Added %d entries to latest dataset", idList.length);
                                }
                            });
                        }
                    });
                    
                });
            }, packageParams.timerFrequency);
        }
    });
}

/**
 * Main databot entry function:
 * @param {Object} input schema.
 * @param {Object} output functions.
 * @param {Object} context of the databot.
 */
function databot(input, output, context) {
    "use strict"
    output.progress(0);

    var tdxApi = new TDXAPI({
        commandHost: context.commandHost,
        queryHost: context.queryHost,
        accessTokenTTL: context.packageParams.accessTokenTTL
    });

    tdxApi.authenticate(context.shareKeyId, context.shareKeySecret, function (err, accessToken) {
        if (err) {
            output.error("%s", JSON.stringify(err));
            process.exit(1);
        } else {
            tdxApi.getDatasetData(context.packageParams.gpsDataTableLatest, null, null, null, function (errLatest, sourcesDataLatest) {
                if(errLatest) {
                    output.error("%s", JSON.stringify(errLatest));
                    process.exit(1);
                } else {
                    var col = {};

                    _.map(sourcesDataLatest, function(el){
                        col[el.id] = el;
                    });

                    GrapGPS(tdxApi, output, context.packageParams, col);
                }
            });
        }
    });
}

var input;
var _ = require('lodash');
var request = require("superagent");
var parseXmlString = require('xml2js').parseString;
var TDXAPI = require("nqm-api-tdx");

if (process.env.NODE_ENV == 'test') {
    // Requires nqm-databot-gpsgrab.json file for testing
    input = require('./databot-test.js')(process.argv[2]);
} else {
    // Load the nqm input module for receiving input from the process host.
    input = require("nqm-databot-utils").input;
}

// Read any data passed from the process host. Specify we're expecting JSON data.
input.pipe(databot);