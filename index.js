
function databot(input, output, context) {
  // PROGRESS output is mandatory, to inform the host of progress.
  output.progress(0);

  // Simulate a process that has 10 steps.
  var counter = 0;
  setInterval(function() {
    output.debug("tick");
    counter += 10;

    // Update the progress count at the host.
    output.progress(counter);

    if (counter === 100) {
      // Result output is sent to the TDX when the databot completes.
      output.result({answer: 42});

      // Exit code 0 => finished with no errors.
      process.exit(0);
    }
  }, 2500);  
}

// Load the nqm input module for receiving input from the process host.
var input = require("nqm-databot-utils").input;

// Read any data passed from the process host. Specify we're expecting JSON data.
input.pipe(databot);