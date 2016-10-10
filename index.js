function databot(input, output, context) {
    "use strict"

    output.progress(0);

    context.tdxApi.getDatasetData(context.packageParams.gpsSources, null, null, null, function (errSources, sourcesData) {
        if (errSources) {
            output.error("Error GPS sources table: %s", JSON.stringify(errSources));
            process.exit(1);
        } else {
            output.debug("Retrieved GPS sources table: %d entries", sourcesData.data.length);

            _.forEach(sourcesData.data, function (element) {
                if (element.Src == 'MK' && element.Datatype == 'XML') {
                    request
                        .get(element.Host + element.Path)
                        .auth(element.APIKey, '')
                        .end(function (error, res) {
                            parseXmlString(res.text, function (errXmlParse, result) {
                                if (errXmlParse) {
                                    output.error("XML parse error: %s", JSON.stringify(errXmlParse));
                                    console.log(result);
                                } else
                                    output.debug(JSON.stringify(result));
                            });
                        });
                }
            }, this);
        }
    });
}

var input;
var _ = require('lodash');
var request = require("superagent");
var parseXmlString = require('xml2js').parseString;
var Promise = require("bluebird");

if (process.env.NODE_ENV == 'test') {
    // Requires nqm-databot-gpsgrab.json file for testing
    input = require('./databot-test.js')(process.argv[2]);
} else {
    // Load the nqm input module for receiving input from the process host.
    input = require("nqm-databot-utils").input;
}

// Read any data passed from the process host. Specify we're expecting JSON data.
input.pipe(databot);