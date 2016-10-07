function databot(input, output, context) {
    // PROGRESS output is mandatory, to inform the host of progress.
    output.progress(0);
    output.debug("Test");
    output.result({"test":"value"});
}

var input;

if (process.env.NODE_ENV == 'development') {
    input = require('./databot-test.js')(process.argv[2]);
} else {
    // Load the nqm input module for receiving input from the process host.
    input = require("nqm-databot-utils").input;
}

// Read any data passed from the process host. Specify we're expecting JSON data.
input.pipe(databot);