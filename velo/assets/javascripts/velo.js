// For more information on the 'revealing module' pattern, see
//   http://addyosmani.com/resources/essentialjsdesignpatterns/book/#modulepatternjavascript
var VELO = (function($, undefined) {
  'use strict';

  var settings = {
    // Show `console.log` messages?
    debug: false,
    // Default job status polling timeout in milliseconds
    pollRate: 300,
    // Defaults for histogram drawing
    highchartsDefaults: {
      chart: {
        zoomType: 'x'
      },
      legend: {
        enabled: false
      },
      xAxis: {
        gridLineWidth: 1,
        minorTickInterval: 'auto'
      },
      yAxis: {
        gridLineWidth: 1,
        minorTickInterval: 'auto'
      },
      plotOptions: {
        series: {
          // Disable initialisation animation
          animation: false
        },
        column: {
          groupPadding: 0,
          pointPadding: 0,
          borderWidth: 0
        },
        errorbar: {}
      },
      credits: {
        enabled: false
      }
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

  // Draw a histogram in the `container` using `options`.
  // Accepts:
  //   container: A jQuery object in which to draw the histogram
  //   options: Object of options passed to the plotting library
  // Returns:
  //   undefined
  var drawHistogram = function(container, options) {
    // Create a new object as the merge of the default options and those in the argument.
    // Properties in options will overrides the defaults.
    container.highcharts($.extend(true, {}, VELO.settings.highchartsDefaults, options));
  };

  // Display a histogram, described by `data`, in `container`.
  // Accepts:
  //   data: An object describing the histogram
  //   container: A jQuery object in which to draw the histogram
  // Returns:
  //   undefined
  var displayHistogram = function(data, container) {
    var name = data['name'],
        title = data['title'],
        binning = data['binning'],
        values = data['values'],
        uncertainties = data['uncertainties'],
        axisTitles = data['axis_titles'],
        points = [],
        errors = [];
    var v, binCenter, uLow, uHigh;
    // We need to manipulate the values slightly for Highcharts
    // 'Histogram' columns are defined by their x-axis bin centers
    // and their y-axis columns heights
    // We define the bin center as the average of the bin boundaries,
    // and the column height as the bin contents
    // Uncertainties need an x-value, the bin center, and (low, high) y-values
    for (var i = 0; i < values.length; i++) {
      v = values[i];
      uLow = v - uncertainties[i][0];
      uHigh = v + uncertainties[i][1];
      binCenter = (binning[i][0] + binning[i][1])/2.0;
      points.push([binCenter, v]);
      errors.push([binCenter, uLow, uHigh]);
    }
    // Draw the histogram in the container
    drawHistogram(container, {
      title: {
        text: title
      },
      series: [
        {
          name: 'Data',
          type: 'column',
          data: points,
          color: '#ccc'
        },
        {
          name: 'Data error',
          type: 'errorbar',
          data: errors
        }
      ],
      xAxis: {
        title: {
          text: axisTitles[0]
        }
      },
      yAxis: {
        title: {
          text: axisTitles[1]
        }
      }
    });
  };

  // Fetches and draws the named `histogram`, residing in `file`, in to the `container`.
  // Accepts:
  //   histogram: String of the histogram's full path key name with in the file
  //   file: String of the file name
  //   container: jQuery element the histogram should be drawn in to. Any existing content will be replaced.
  var loadHistogramFromFileIntoContainer = function(histogram, file, container) {
    var url = '/files/' + file + '/' + histogram;
    // Submit a job to retrieve the histogram data
    $.getJSON(url, function(data, status, jqXHR) {
      if (status === 'success' && data['success'] === true) {
        var payload = data['data'];
        // Start polling the job status, displaying the histogram on success
        poll(payload['job_id'], function(result) {
          // We can only handle TH1F objects at the moment
          if (result['data']['key_class'] !== 'TH1F') return;
          displayHistogram(result['data']['key_data'], container);
        }, function(result) {
          log('Failed to load histogram');
          log(result);
        });
      }
    }).fail(function() {
      container.html(''
        + '<div class="alert alert-danger">'
        + 'There was a problem retrieving histogram <code>'
        + histogram
        + '</code> from file <code>'
        + file
        + '</code>. Please contact the administrator.'
        + '</div>'
      );
    });
  };

  // Poll status of job, calling success or failure when finished.
  // If the job is still running, `poll` is called again after `timeout`.
  // Accepts:
  //   jobID: String ID of the job to poll
  //   success: Function called on successful job completion, passed the response
  //   failure: Function called on failed job completion, passed the response
  //   timeout: Integer number of milliseconds to wait before calling poll again, if the job has not finished (default: VELO.settings.pollRate)
  var poll = function(jobID, success, failure, timeout) {
    if (timeout === undefined) {
      timeout = settings.pollRate;
    }
    setTimeout(function() {
      $.getJSON('/fetch/' + jobID, function(data, stat, jqXHR) {
        log('Polling jobID=' + jobID);
        if (stat === 'success' && data['success'] === true) {
          var payload = data['data'],
              jobStatus = payload['status'],
              result = payload['result'];
          if (jobStatus === 'finished') {
            log('Job ' + jobID + ' finished');
            success(result);
          } else if (jobStatus === 'failed') {
            log('Job ' + jobID + ' failed');
            failure(result);
          } else {
            log('Polling job ID ' + jobID + ': ' + jobStatus);
            poll(jobID, success, failure, timeout);
          }
        }
      });
    }, timeout);
  };

  // Add a `Spinner` object to the `element`, using `settings.spinnerDefaults` as options.
  // Accepts:
  //   element: DOM element
  // Returns:
  //   Spinner object
  var appendSpinner = function(element) {
    return new Spinner(settings.spinnerDefaults).spin(element);
  }

  // Page-specific modules
  var pages = {
    veloView: {
      init: function() {
        log('veloView.init');
      },
      overview: {
        init: function() {
          log('veloView.overview.init');
        }
      },
      trends: {
        init: function () {
          log('veloView.trends.init');
        }
      },
      detailedTrends: {
        init: function () {
          log('veloView.detailedTrends.init');
        }
      }
    }
  };

  // Initialise globally required features, and call the chain of inits required for pageModule.
  // Accepts:
  //   pageModule: String of the form `x.y.z`. Starting from the top (`x`), the `init` function on each module is called, if it exists.
  // Returns:
  //   undefined
  var init = function(pageModule) {
    var components = pageModule.split('/'),
        parentModule = pages,
        modules = [],
        $main = $('.main');

    // Work our way down the module chain, top to bottom, calling `init` on each successive child, if it exists.
    $.each(components, function(index, component) {
      var current = parentModule[component];
      modules.push(current);
      parentModule = current;
      if (current !== undefined && current.init !== undefined) {
        current.init();
      }
    });

    // Find any elements requiring histograms from files and load them
    $main.find('.histogram').each(function(index, el) {
      var $el = $(el),
          file = $el.data('file'),
          histogram = $el.data('histogram');
      if (file && histogram) {
        appendSpinner(el);
        loadHistogramFromFileIntoContainer(histogram, file, $el);
      }
    });

    // Add datepicker to appropriate fields
    $main.find('.input-daterange').datepicker(settings.datepickerDefaults);
  };

  return {
    init: init,
    settings: settings
  };
})(jQuery);

$(function() {
  VELO.settings.debug = true;
  // Away we go!
  VELO.init(activePage);
});
