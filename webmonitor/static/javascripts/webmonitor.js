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

  // Draw a histogram in the `container` using `options`.
  // Accepts:
  //   container: A jQuery object in which to draw the histogram
  //     If the jQuery object references multiple DOM nodes, the first is used
  //   data: An array of data points formatted for d3.chart.histogram
  //   options: Object of options passed to the plotting library
  //     Any present options override those in WebMonitor.settings.histogramDefaults
  // Returns:
  //   undefined
  var drawHistogram = function(container, data, options) {
    var opt = $.extend(true, {}, WebMonitor.settings.histogramDefaults, options);
    console.log(container.width(), container.height());
    d3.select(container.get()[0]).append('svg')
      .attr('width', container.width())
      .attr('height', container.height())
      .chart('HistogramZoom')
      .xAxisLabel(opt.xAxis.title.text)
      .yAxisLabel(opt.yAxis.title.text)
      .draw(data);
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
        axisTitles = data['axis_titles'];
    var v, binCenter, uLow, uHigh;
    // We need to manipulate the values slightly for d3.chart.histogram
    // See the d3.chart.histogram documentation for the specifics
    var formattedData = [];
    for (var i = 0; i < values.length; i++) {
      var bins = binning[i];
      formattedData.push({
        x: bins[0],
        dx: bins[1],
        y: data['values'][i],
        xErr: uncertainties[i]
      });
    }
    var options = {
      title: {
        text: title
      },
      xAxis: {
        title: {
          text: axisTitles[0]
        }
      },
      yAxis: {
        title: {
          text: axisTitles[1]
        }
      },
    };
    // Remove the spinner
    container.find('.spinner').remove();
    // Draw the histogram in the container
    drawHistogram(container, formattedData, options);
  };

  // Display msg inside container, styled as a red error box
  // Accepts:
  //   container: jQuery element to insert msg into
  //   msg: HTML message to display inside container
  var displayFailure = function(container, msg) {
    container.html('<div class="alert alert-danger">' + msg + '</div>');
  };

  // Fetches and draws the named `histogram`, residing in `file`, in to the `container`.
  // Accepts:
  //   histogram: String of the histogram's full path key name with in the file
  //   file: String of the file name
  //   container: jQuery element the histogram should be drawn in to. Any existing content will be replaced.
  var loadHistogramFromFileIntoContainer = function(histogram, file, container) {
    var url = '/files/' + file + '/' + histogram;
    var failMsg = 'There was a problem retrieving histogram <code>'
      + histogram
      + '</code> from file <code>'
      + file
      + '</code>. Please contact the administrator.';
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
          displayFailure(container, failMsg);
        });
      } else {
        displayFailure(container, failMsg);
      }
    }).fail(function() { displayFailure(container, failMsg); });
  };

  // Poll status of job, calling success or failure when finished.
  // If the job is still running, `poll` is called again after `timeout`.
  // Accepts:
  //   jobID: String ID of the job to poll
  //   success: Function called on successful job completion, passed the response
  //   failure: Function called on failed job completion, passed the response
  //   timeout: Integer number of milliseconds to wait before calling poll again, if the job has not finished (default: WebMonitor.settings.pollRate)
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
            if (result['success'] === true) {
              success(result);
            } else {
              failure(result);
            }
          } else if (jobStatus === 'failed') {
            log('Job ' + jobID + ' failed');
            failure(result);
          } else {
            log('Polling job ID ' + jobID + ': ' + jobStatus);
            poll(jobID, success, failure, timeout);
          }
        } else {
            failure(result);
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
    examples: {
      init: function() {
        log('examples.init');
      },
      table: {
        init: function() {
          log('examples.table.init');
        }
      },
      singeLayout: {
        init: function() {
          log('examples.singleLayout.init');
        }
      },
      gridLayout: {
        init: function() {
          log('examples.gridLayout.init');
        }
      },
      tabs: {
        init: function() {
          log('examples.tabs.init');
        }
      },
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
  WebMonitor.settings.debug = true;
  // Away we go!
  WebMonitor.init(activePage);
});
