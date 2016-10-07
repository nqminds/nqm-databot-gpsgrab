module.exports = (configpath) => {
    "use strict"

    var debugLog = require("debug")("nqm-databot");
    var util = require("util");
    var fs = require("fs");
    var assert = require("assert");
    var _ = require("lodash");

    var config = require(configpath);

    var outputType = {
        DEBUG: 1,     // STDOUT - diagnostic fed back to TDX
        ERROR: 2,     // STDERR - fed back to TDX
        RESULT: 3,    // Result update to the TDX
        PROGRESS: 4,  // Progress updates to TDX
    };

    var _writeOutput = function(fd, msg) {
        msg = typeof msg !== "undefined" ? msg : "";
        var buf = new Buffer(msg.toString());
        fs.writeSync(fd, buf, 0, buf.length);
    };

    var writeDebug = function() {
        var msg = util.format.apply(util, arguments);
        return debugLog(msg);
    };

    var writeError = function() {
        var msg = util.format.apply(util, arguments);
        return _writeOutput(outputType.ERROR, msg + "\n");
    };

    var writeResult = function(obj) {
        if (typeof obj !== "object") {
            return writeError("output.result - expected type 'object', got type '%s'", typeof obj);
        } else {
            return debugLog(JSON.stringify(obj) + "\n");
        }
    };

    var writeProgress = function(progress) {
        assert(_.isNumber(progress));
        return _writeOutput(outputType.PROGRESS, progress.toString() + "\n");
    };


    var context;
    var output = {
        debug: writeDebug,
        progress: writeProgress,
        error: writeError,
        result: writeResult
    };
    
    var readAndRun = function(cb) {
        if (typeof cb !== "function") {
            throw new Error("input.read - callback required");
        }

        cb(config.inputSchema, output, context);
    }

    return {
        pipe: readAndRun
    };
}