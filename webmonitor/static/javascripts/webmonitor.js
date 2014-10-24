// For more information on the 'revealing module' pattern, see
//   http://addyosmani.com/resources/essentialjsdesignpatterns/book/#modulepatternjavascript
var WebMonitor = (function($, undefined) {
  'use strict';

  var settings = {
    // Show `console.log` messages?
    debug: false,
    // Default job status polling timeout in milliseconds
    pollRate: 300,
    // Defaults for histogram drawing
    histogramDefaults: {
    },
    // See http://fgnass.github.io/spin.js/ for options and customisation
    spinnerDefaults: {
      lines: 12,
      length: 5,
      width: 2,
      radius: 5,
      trail: 50,
      shadow: false
    },
    // See http://eternicode.github.io/bootstrap-datepicker/
    datepickerDefaults: {
      format: 'dd/mm/yyyy',
      // This app doesn't now about the future
      endDate: '+0d',
      todayBtn: 'linked',
      // Always pop under the field
      orientation: 'top auto',
      autoclose: true,
      todayHighlight: true
    }
  };

  // Cross-browser compatible `console.log`. Only fires if settings.debug === true.
  // http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
  // Accepts:
  //   Any number of arguments of any type.
  // Returns:
  //   undefined
  var log = function() {
    log.history = log.history || [];
    log.history.push(arguments);
    if (window.console && settings.debug) {
      console.log(Array.prototype.slice.call(arguments));
    }
  };

  // Submit a job to the server
  // Accepts:
  //   taskName: Name of the task the job will run
  //   args: Object of arguments passed to the task as named arguments
  //   poll: Whether to poll the job until completion (default: true)
  //     The job is polled in intervals of WebMonitor.settings.pollRate until
  //     the job status is not `queued` or `started`.
  // Returns:
  //   jQuery.Deferred object which fires `resolve` on job completion and fires
  //     `reject` on either submission failure or job polling failure
  var submitJob = function(taskName, args, doPoll) {
    if (doPoll === undefined) {
      doPoll = true;
    }
    var jobRequest =  $.ajax('/jobs', {
      type: 'POST',
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      data: JSON.stringify({task_name: taskName, args: args})
    });
    var jobPromise = $.Deferred();
    var poll = function(job) {
      var jobID = job['id'],
          jobStatus = job['status'];
      // Poll the job if it hasn't not completed, else fire `resolve`
      if (jobStatus === 'queued' || jobStatus === 'started') {
        setTimeout(function() {
          log('Polling job ID ' + jobID + ': ' + jobStatus);
          $.getJSON(job['uri'])
            .done(function(data, status) { poll(data['job']); })
            .fail(function(data, status) { jobPromise.reject(data, status); });
        }, settings.pollRate);
      } else {
        log('Job ' + jobID + ' completed: ' + jobStatus);
        jobPromise.resolve(job);
      }
    };
    jobRequest.done(function(data, status) {
      var job = data['job'];
      if (doPoll === true) {
        poll(job);
      }
    });
    // Fire `reject` if the submission fails
    jobRequest.fail(function(data, status) { jobPromise.reject(data, status); });
    return jobPromise;
  };

  // Create a task and submit a job for it to the queue
  //
  // Unlike submitJob, this method handles job failures by creating descriptive
  // HTML error messages.
  // This relies on the JSON response containing a `result` key which is the
  // task's return value, which itself contains a `success` key determining
  // whether the task completed successfully.
  // If `success` if false, the task's `message` key is retrieved.
  // Accepts:
  //   taskName: Name of the task the job will run
  //   args: Object of arguments passed to the task as named arguments
  // Returns:
  //   jQuery.Deferred object which fires `resolve` on job completion and fires
  //     `reject` on either submission failure, job polling failure, or task
  //     failure. On resolution, the JSON response object is passed, whereas
  //     on rejection a descriptive HTML error message is passed.
  var createTask = function(taskName, args) {
    // Create a polling job
    var jobPromise = submitJob(taskName, args, true);
    var taskPromise = $.Deferred();
    jobPromise.done(function(job) {
      // Did the job complete successfully or not?
      if (job['status'] === 'failed') {
        var message = '<p>The job completed unsuccessfully.</p>';
        taskPromise.reject(message);
      } else {
        // Did the task the job was running finish successfully or not?
        var result = job['result'];
        if (result['success'] === false) {
          var message = '<p>The task could not complete successfully. It returned the error message '
            + '<code>' + result['message'] + '</code>.'
            + '</p>';
          taskPromise.reject(message);
        } else {
          taskPromise.resolve(job);
        }
      }
    });
    jobPromise.fail(function(data, status) {
      var message;
      try {
        message = JSON.parse(data.responseText)['message'];
      } catch(e) {
        message = data.statusText;
      }
      message = '<p>The server responded with the error code '
        + '<code>' + data.status + '</code>'
        + ' and the message '
        + '<code>' + message + '</code>.'
        + '</p>';
      taskPromise.reject(message);
    });
    return taskPromise;
  };

  // Add a `Spinner` object to the `element`, using `settings.spinnerDefaults` as options.
  // Accepts:
  //   element: DOM element
  // Returns:
  //   Spinner object
  var appendSpinner = function(element) {
    return new Spinner(settings.spinnerDefaults).spin(element);
  }

  // Initialise globally required features, and call the chain of inits required for pageModule.
  // Accepts:
  //   pageModule: String of the form `x.y.z`. Starting from the top (`x`), the `init` function on each module is called, if it exists.
  //   pages: Object of page-specific objects. The `init` function of each page-specific object is called if its hierarchical position within
  //          `pages` matches a subsection of `pageModule`. For example, given a `pages` object like
  //            {
  //              home: {
  //                init: function() { ... }
  //              },
  //              example: {
  //                init: { function() {... },
  //                foo:  { init: function() { ... }},
  //                bar:  { init: function() { ... }}
  //              }
  //            }
  //          a `pageModule` of `home` would call `home.init`, whereas a `pageModule` of `example.foo` would fire *both* `example.init`
  //          and `example.foo.init`.
  // Returns:
  //   undefined
  var init = function(pageModule, pages) {
    var components = pageModule.split('/'),
        parentModule = pages,
        current = undefined,
        $main = $('.main');

    // Work our way down the module chain, top to bottom, calling `init` on each successive child, if it exists.
    $.each(components, function(index, component) {
      // If a child doesn't exist in its parent, set the parent to the empty object
      if (component in parentModule) {
          current = parentModule[component];
          if (current !== undefined && current.init !== undefined) {
            current.init();
          }
          parentModule = current;
      } else {
          parentModule = {};
      }
    });
  };

  return {
    init: init,
    submitJob: submitJob,
    createTask: createTask,
    appendSpinner: appendSpinner,
    log: log,
    settings: settings
  };
})(jQuery);
