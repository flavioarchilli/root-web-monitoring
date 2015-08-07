(function(window, d3, undefined) {
  var utilities = {
    // Compute the base-10 exponent of the absolute value of x.
    //
    // If you wrote the argument in scientific notation, this will return the
    // exponent.
    //
    // Examples
    //
    //   // 123000 would be written in scientific notation as 1.23e5, so:
    //   exponent(123000)
    //   // returns 5
    //
    // x - Floating point number to evaluate the exponent of.
    //
    // Returns the base-10 exponent for x.
    exponent: function(x) {
      return Math.floor(Math.log(Math.abs(x))/Math.LN10);
    },

    // Return the appropriate SI-prefix exponent for the array of tick values.
    //
    // The exponent is the maximum exponent within the ticks, rounded down to
    // the nearest multiple of three.
    // This is more familiar, matching SI prefixes (kilo 10^3, mega 10^6, etc.).
    //
    // ticks - Array of tick values.
    //
    // Returns the exponent.
    ticksExponent: function(ticks) {
      // Calculate the [minimum, maximum] tick values,
      // then the base-10 exponent for these min/max values
      // Use the biggest exponent as the one we show
      var oldTicks = ticks,
          extent = d3.extent(oldTicks),
          minExponent = d3.chart.utilities.exponent(extent[0]),
          maxExponent = d3.chart.utilities.exponent(extent[1]),
          exp = d3.max([maxExponent, minExponent]);
      return 3*Math.floor(exp/3);
    },

    // Create a tick formatter function for SI-prefix formatted tick labels.
    //
    // A nice precision is one fine enough such that adjacent ticks aren't
    // rounded to be equal.
    // For example, two adajacent ticks with values (0.998, 0.999) require
    // three digits of precision, whereas (12.5, 23.5) requires zero
    // This method assumes all ticks are spaced equally apart.
    //
    // scale - d3.scale to generate ticks.
    // axis - d3.svg.axis which defines the number of ticks.
    // callback - Optional function to be invoked whenever the tick formatter
    //            is. The function is passed the exponent used to format
    //            the tick labels.
    //
    // Returns a  tick formatter function which accepts a value and a tick
    // number, itself return an appropriately round tick label.
    siTickFormatter: function(scale, axis, callback) {
      // By placing this logic inside the returned function, the values
      // are updated on each call
      // Placing them outside would result in stale `ticks` and `exp` values
      return function(value, tickNumber) {
        var ticks = scale.ticks(axis.ticks()[0]),
            exp = utilities.ticksExponent(ticks),
            newTicks = ticks.map(function(d) { return d/Math.pow(10, exp); } );
        var expDiff = d3.chart.utilities.exponent(newTicks[0] - newTicks[1]);
        expDiff = expDiff < 0 ? Math.abs(expDiff) : 0;
        if (typeof callback === 'function') {
          callback(exp);
        }
        return (value/Math.pow(10, exp)).toFixed(expDiff);
      };
    }
  };

  // Expose our utilities in the d3 object
  d3.chart.utilities = utilities;
})(window, window.d3);
;/*
 * d3.chart.BaseChart
 *
 * d3.chart which provides a sane base to build other charts with.
 * Allows derivatives to easily adhere to the D3 margin convention [1] using
 * `width` and `height` methods.
 *
 * [1]: http://bl.ocks.org/mbostock/3019563
 *
 * Properties
 * ----------
 *
 * Properties considered public are:
 *
 * * `margins`: Object defining `top`, `bottom`, `left`, and `right` margins in
 *              pixels.
 * * `width`: Getter/setter method for the chart width
 * * `height`: Getter/setter method for the chart height
 *
 */
(function(d3, undefined) {
  'use strict';
  d3.chart('BaseChart', {
    initialize: function() {
      var chart = this;

      chart.margins = {
        top: 23,
        bottom: 40,
        left: 60,
        right: 10,
        padding: 10
      };

      // Defaults
      // Chart width
      chart._width = chart.base.attr('width') ?
        chart.base.attr('width') - (chart.margins.right + chart.margins.left)
        : 200;
      // Chart height
      chart._height = chart.base.attr('height') ?
        chart.base.attr('height') - (chart.margins.top + chart.margins.bottom)
        : 200;

      // Make sure the container is set
      chart.updateContainerWidth();
      chart.updateContainerHeight();

      // Add inner container offset by margins
      chart.base.append('g')
        .attr('transform', 'translate(' + this.margins.left + ',' + this.margins.top + ')');

      // Containers for areas and layers
      chart.areas = {};
      chart.layers = {};
    },

    /* Chart width setter/getter.
     *
     * newWidth - Width to set the chart area in pixels.
     *
     * Returns the chart width if newWidth is undefined, else the chart.
     */
    width: function(newWidth) {
      var chart = this;
      if (arguments.length === 0) {
        return chart._width;
      }
      var oldWidth = chart._width;
      chart._width = newWidth;
      chart.updateContainerWidth();
      chart.trigger('change:width', newWidth, oldWidth);
      return chart;
    },

    /* Chart height setter/getter.
     *
     * newHeight - Height to set the chart area in pixels.
     *
     * Returns the chart height if newHeight is undefined, else the chart.
     */
    height: function(newHeight) {
      var chart = this;
      if (arguments.length === 0) {
        return chart._height;
      }
      var oldHeight = chart._height;
      chart._height = newHeight;
      chart.updateContainerHeight();
      chart.trigger('change:height', newHeight, oldHeight);
      return chart;
    },

    /* Set the width of the chart's root SVG.
     */
    updateContainerWidth: function() {
      this.base
        .attr('width', this._width + this.margins.left + this.margins.right);
    },

    /* Set the height of the chart's root SVG.
     */
    updateContainerHeight: function() {
      this.base
        .attr('height', this._height + this.margins.top + this.margins.bottom);
    }
  });
})(window.d3);
;/*
 * d3.chart.AxesChart
 *
 * d3.chart which draws a set of axes and contained plotables.
 *
 * AxesChart derives from BaseChart, inheriting all of its properties.
 *
 * Properties
 * ----------
 *
 * Properties considered public are:
 *
 * * `xScale`: The d3.scale of the x axis
 * * `yScale`: The d3.scale of the y axis
 * * `zScale`: The d3.scale of the z axis
 * * `xAxisLabel`: Getter/setter method for the x-axis label
 * * `yAxisLabel`: Getter/setter method for the y-axis label
 * * `animate`: Getter/setter method for animation flag
 *
 * Axes
 * ----
 *
 * AxesChart is responsible for drawing axes and their containing d3.plotables.
 * The x and y axes are drawn as two axes and a grid. The x axis is drawn
 * below and above the plot area, and the y axis is drawn left and right.
 * Only the x axis on the bottom and y axis on the left are given labels, but
 * all axes and given tick markings.
 * Both axes are formatted in SI notation, meaning that if the tick numbers
 * are large enough to warrant an exponent, the exponent is rounded to the
 * nearest multiple of three (e.g. 10^3, 10^-9).
 * A z axis, if required, is drawn to the right of the plot area.
 *
 * Plotables
 * ---------
 *
 * A plotable is an object in d3.plotable.
 * Each plotable defines an object that can be drawn within a set of axes, such
 * as a histogram, a function, or a scatter plot.
 * Each plotable is responsible for drawing itself and reporting several of its
 * properties, and so must define the following properties:
 *
 * * `name`: Property holding the name of the plotable, which must be unique
 *           within an AxesChart instance, as stored plotables are referenced
 *           by their name
 * * `xDomain`: Method returning the extent the the plotable along the x axis
 * * `yDomain`: Method returning the extent of the plotable along the y axis
 * * `draw`: Method which draws the histogram, accepting the AxesChart instance
 *           calling the method, the <g> container within which the plotable
 *           should draw itself, and a boolean stating whether the plotable
 *           should animate its drawing or not
 *
 * Thus, a complete but boring d3.plotables implementation might look like:
 *
 *   d3.plotables.MyPlotable = {
 *     name: 'MyPlotable',
 *     xDomain: function() { return [0, 0]; },
 *     yDomain: function() { return [0, 0]; },
 *     draw: function(axes, g, transition) { return; }
 *   };
 *
 * Plotables are added to AxesChart using the `addPlotable` method, and are
 * removed with `removePlotable`.
 *
 * Ornaments
 * ---------
 *
 * An ornament object can be identical to a plotable object, but is treated
 * slightly differently by AxesChart, namely they should not depend on the
 * scales of the axes, and so they:
 *
 * * Are not redrawn on scale changes, but are drawn once on
 *   `AxesChart.addOrnament`
 * * Do not have a clipping path applied to them
 * * Are drawn above all plotables, axes, ticks, labels, etc.
 *
 * Ornaments must implement the `name` and `draw` methods, as for plotables,
 * but are not required to implement the `xDomain` and `yDomain` methods.
 *
 */
(function(d3, undefined) {
  'use strict';
  d3.chart('BaseChart').extend('AxesChart', {
    initialize: function() {
      var chart = this;

      // Define blank x- and y-axis labels, zero the exponents
      chart._xAxisLabel = '';
      chart._yAxisLabel = '';
      chart._xExponent = 0;
      chart._yExponent = 0;
      chart._animate = true;

      // Transform scales: go from data coordinates (domain) to canvas coordinates (range)
      chart.xScale = d3.scale.linear()
        .range([0, chart.width()])
        .domain([0, 1]);
      chart.yScale = d3.scale.linear()
        .range([chart.height(), 0])
        .domain([0, 1]);
      chart.zScale = d3.scale.linear()
        .range(['#2c7bb6', '#ffffbf', '#d7191c'])
        .interpolate(d3.interpolateHcl);

      // Object of plotable objects
      // Each plotable is referenced by a key equal to its `name` property
      chart._plotables = {};
      // Object of ornament objects
      // Each ornament is referenced by a key equal to its `name` property
      chart._ornaments = {};
      // Object of plotable layers
      // Each plotable is drawn in its own "layer", a <g> element, referenced
      // by a key equal to the `name` property of the plotable
      chart._layers = {};

      // Get inner 'canvas'
      var innerG = chart.base.select('g');

      // Create an axis with a given scale, number of ticks, and orientation
      // The ticks are positioned 'inside' the plot, e.g. an axis with
      // orientation 'bottom' will have ticks pointing up
      var createAxis = function(scale, ticks, orientation) {
        var axis = d3.svg.axis();
        return axis.ticks(ticks)
          .scale(scale)
          .orient(orientation)
          .innerTickSize(-axis.innerTickSize())
          .outerTickSize(-axis.outerTickSize())
          .tickPadding(axis.tickPadding() + 4);
      };

      // Create <g> elements for all axes
      // Each axis has three elements:
      //   1. Grid
      //   2. Bottom-left
      //   3. Top-right
      // They are defined in z-order, so grid below everything, then 2 and 3
      chart.areas.xgrid = innerG.append('g')
        .classed('x grid', true)
        .attr('transform', 'translate(0,' + chart.height() + ')');
      chart.areas.ygrid = innerG.append('g')
        .classed('y grid', true);
      // And finally the axes
      chart.areas.xaxis = innerG.append('g')
        .classed('x axis', true)
        .attr('transform', 'translate(0,' + chart.height() + ')');
      chart.areas.xaxistop = innerG.append('g')
        .classed('x axis', true);
      chart.areas.yaxis = innerG.append('g')
        .classed('y axis', true);
      chart.areas.yaxisright = innerG.append('g')
        .classed('y axis', true)
        .attr('transform', 'translate(' + chart.width() + ', 0)');
      // Z color scale, drawn outside the chart bounding box
      chart.areas.zscale = chart.base.append('g')
        .classed('zscale', true)
        .attr('transform', 'translate(' + (chart.width() + chart.margins.left + 10) + ',' + chart.margins.top + ')');

      // Create <g> elements for axis labels and add the <text> elements to them
      chart.areas.xlabel = chart.base.append('g')
        .classed('x axis-label', true)
        .attr('transform', 'translate(' + (chart.width() + chart.margins.left) + ',' + (chart.height() + chart.margins.top + chart.margins.bottom) + ')');
      chart.areas.xlabel.append('text')
        .attr('text-anchor', 'end')
        .attr('dy', '-0.2em');
      chart.areas.ylabel = chart.base.append('g')
        .classed('y axis-label', true)
        .attr('transform', 'rotate(-90) translate(' + -chart.margins.top + ')');
      chart.areas.ylabel.append('text')
        .attr('text-anchor', 'end')
        .attr('dy', '1em');

      // Create d3.svg.axis objects for each axis group, one per axis layer
      // The grid is made by creating axes with tick lengths equal to the chart width/height
      // Only the bottom-left set of axes get tick labels
      // TODO configurable tick numbers?
      var xTicks = 5,
          yTicks = 5;
      chart.layers.xaxis = createAxis(chart.xScale, xTicks, 'bottom');
      chart.layers.xaxistop = createAxis(chart.xScale, xTicks, 'top')
        .tickFormat('');
      chart.layers.xgrid = createAxis(chart.xScale, xTicks, 'bottom')
        .tickSize(-chart.height(), 0, 0)
        .tickFormat('');
      chart.layers.yaxis = createAxis(chart.yScale, yTicks, 'left');
      chart.layers.yaxisright = createAxis(chart.yScale, yTicks, 'right')
        .tickFormat('');
      chart.layers.ygrid = createAxis(chart.yScale, yTicks, 'left')
        .tickSize(-chart.width(), 0, 0)
        .tickFormat('');

      // Create formatters for the x- and y-axis
      // The callback updates the axis label when the ticks are updated
      var xFormatter = d3.chart.utilities.siTickFormatter(chart.xScale, chart.layers.xaxis, function(exp) {
        chart._xExponent = exp;
        chart.xAxisLabel(chart.xAxisLabel());
      });
      var yFormatter = d3.chart.utilities.siTickFormatter(chart.yScale, chart.layers.yaxis, function(exp) {
        chart._yExponent = exp;
        chart.yAxisLabel(chart.yAxisLabel());
      });
      chart.layers.xaxis.tickFormat(xFormatter);
      chart.layers.yaxis.tickFormat(yFormatter);

      // Add a clipping path to hide histogram outside chart area
      chart.clipPath = chart.base.append('defs').append('clipPath')
        .attr('id', 'chartArea-' + Math.random().toString(36).substring(7));
      var clipRect = chart.clipPath.append('rect')
        .attr('width', chart.width())
        .attr('height', chart.height());
      var updateScaleDomain = function(newXDomain, newYDomain) {
        chart.xScale.domain(newXDomain);
        chart.yScale.domain(newYDomain);
        chart.draw();
      };

      // Define 'Clear zoom' button dimensions
      var buttonWidth = 100,
          buttonHeight = 40,
          padding = 10,
          brush = d3.svg.brush();
      var brushend = function() {
        // On ending a brush stroke:
        // 0. Do nothing if the selection's empty
        if (brush.empty() === true) {
          return;
        }
        // 1. Add a 'clear zoom' button if it doesn't exist
        var clearButton = chart.base.select('.clear-button');
        if (clearButton.empty() === true) {
          // Cache the original domain so we restore to later
          chart.xScale.originalDomain = chart.xScale.domain();
          chart.yScale.originalDomain = chart.yScale.domain();
          // Create a group to hold rectangle and text
          var clearG = chart.base.append('g')
            .classed('clear-button', true)
            .attr('transform', 'translate(' +
                (chart.width() + chart.margins.left - buttonWidth - padding) + ',' +
                (chart.margins.top + padding) + ')'
            );
          // Add the rounded rectangle to act as a background
          clearG.append('rect')
            .attr('width', buttonWidth)
            .attr('height', buttonHeight)
            .attr('rx', 2)
            .attr('ry', 2);
          // Add the text
          clearG.append('text')
            .attr('x', 10)
            .attr('y', 25)
            .text('Clear zoom');
          // When the group is clicked, undo the zoom and remove the button
          clearG.on('click', function() {
              chart.base.select('.brush').call(brush.clear());
              // Restore to the origin, cached domain
              updateScaleDomain(chart.xScale.originalDomain, chart.yScale.originalDomain);
              clearG.remove();
            });
        }
        // 2. Update the x-axis domain
        var brushExtent = brush.extent(),
            xExtent = [brushExtent[0][0], brushExtent[1][0]],
            yExtent = [brushExtent[0][1], brushExtent[1][1]];
        updateScaleDomain(xExtent, yExtent);
        // 3. Clear the brush's extent
        chart.base.select('.brush').call(brush.clear());
      };
      // Set up zooming behaviour in x and y using d3.svg.brush
      brush
        .x(chart.xScale)
        .y(chart.yScale)
        .on('brushend', brushend);
      // Add the brush to the canvas
      chart.areas.brush = chart.base.append('g')
        .classed('brush', true)
        .attr('transform', 'translate(' + chart.margins.left + ', ' + chart.margins.top + ')');
      chart.areas.brush.call(brush);

      // Update width/height dependent elements on change
      chart.on('change:width', function(width) {
        chart.xScale.range([0, width]);
        chart.areas.xlabel.attr('transform', 'translate(' + (width + chart.margins.left) + ',' + (chart.height() + chart.margins.top + chart.margins.bottom) + ')');
        chart.areas.yaxisright.attr('transform', 'translate(' + width + ', 0)');
        chart.layers.ygrid.tickSize(-width, 0, 0);
        clipRect.attr('width', width);
        chart.areas.zscale
          .attr('transform', 'translate(' + (width + chart.margins.left + 10) + ',' + chart.margins.top + ')');
        chart.draw(false);
      });
      chart.on('change:height', function(height) {
        chart.yScale.range([height, 0]);
        chart.areas.xaxis.attr('transform', 'translate(0,' + height + ')');
        chart.areas.xgrid.attr('transform', 'translate(0,' + height + ')');
        chart.areas.xlabel.attr('transform', 'translate(' + (chart.width() + chart.margins.left) + ',' + (height + chart.margins.top + chart.margins.bottom) + ')');
        chart.layers.xgrid.tickSize(-height, 0, 0);
        clipRect.attr('height', height);
        chart.areas.brush.call(brush);
        chart.draw(false);
      });

      // Away we go!
      chart.draw(false);
    },

    /*
     * Draw the chart.
     *
     * Owners of the chart object should not need to call this method directly.
     * It is invoked when the internal state of the chart would produce a
     * visual change.
     *
     * Returns the chart.
     */
    draw: function(transition) {
      var chart = this;
      if (transition === undefined) {
        transition = chart.animate();
      }

      // Draw the plotables, one per layer
      var name,
          plotable;
      for (name in chart._plotables) {
        plotable = chart._plotables[name];
        // If any plotable defines a z domain, draw the z-axis
        if (plotable.zDomain !== undefined) {
          // Shrink the plot width by 70px to accommodate the colour scale
          // Changing the width will call chart.draw, so we stop this draw call
          // to prevent an infinite loop
          if (chart._hasZScale !== true) {
            chart._hasZScale = true;
            chart.margins.right += 70;
            chart.width(chart.width() - 70);
            return chart;
          }
          chart.drawColorScale();
        }
        plotable.draw(chart, chart._layers[name], transition);
      }

      // Draw the axes, transitioning them if requested
      if (transition === true) {
        chart.areas.xaxis.transition().duration(250)
          .call(chart.layers.xaxis);
        chart.areas.xaxistop.transition().duration(250)
          .call(chart.layers.xaxistop);
        chart.areas.xgrid.transition().duration(250)
          .call(chart.layers.xgrid);
        chart.areas.yaxis.transition().duration(250)
          .call(chart.layers.yaxis);
        chart.areas.yaxisright.transition().duration(250)
          .call(chart.layers.yaxisright);
        chart.areas.ygrid.transition().duration(250)
          .call(chart.layers.ygrid);
      } else {
        chart.areas.xaxis
          .call(chart.layers.xaxis);
        chart.areas.xaxistop
          .call(chart.layers.xaxistop);
        chart.areas.xgrid
          .call(chart.layers.xgrid);
        chart.areas.yaxis
          .call(chart.layers.yaxis);
        chart.areas.yaxisright
          .call(chart.layers.yaxisright);
        chart.areas.ygrid
          .call(chart.layers.ygrid);
      }

      return chart;
    },

    /* Get or set the x-axis label.
     *
     * If no argument is given, the x-axis label is returned.
     * If a string is given, the x-axis label is set to this string and the
     * axis is redrawn.
     * The exponent of the axis domain, if non-zero, is appended to the label.
     *
     * Returns the x-axis label if no argument is given, else the chart.
     */
    xAxisLabel: function(newLabel) {
      var chart = this;
      if (arguments.length === 0) {
        return chart._xAxisLabel;
      }
      chart._xAxisLabel = newLabel;
      // Append the value of the exponent, if there is one
      if (chart._xExponent !== 0) {
        chart.areas.xlabel.select('text')
          .text(chart.xAxisLabel() + ' ×1e' + chart._xExponent);
      } else {
        chart.areas.xlabel.select('text')
          .text(chart.xAxisLabel());
      }
      return chart;
    },

    /* Get or set the y-axis label.
     *
     * If no argument is given, the y-axis label is returned.
     * If a string is given, the y-axis label is set to this string and the
     * axis is redrawn.
     * The exponent of the axis domain, if non-zero, is appended to the label.
     *
     * Returns the y-axis label if no argument is given, else the chart.
     */
    yAxisLabel: function(newLabel) {
      var chart = this;
      if (arguments.length === 0) {
        return chart._yAxisLabel;
      }
      chart._yAxisLabel = newLabel;
      // Append the value of the exponent, if there is one
      if (chart._yExponent !== 0) {
        chart.areas.ylabel.select('text')
          .text(chart.yAxisLabel() + ' ×1e' + chart._yExponent);
      } else {
        chart.areas.ylabel.select('text')
          .text(chart.yAxisLabel());
      }
      return chart;
    },

    /* Get or set the animation flag.
     *
     * When true, the chart animates when updating due to width, height, and
     * scale changes (e.g. when zooming).
     *
     * newAnimate - Value to set for the animation flag.
     *
     * Returns the animation flag if no argument is given, else the chart.
     */
    animate: function(newAnimate) {
      var chart = this;
      if (arguments.length === 0) {
        return chart._animate;
      }
      chart._animate = newAnimate;
      return chart;
    },

    /* Returns the list of plotable objects belonging to the chart.
     */
    plotables: function() {
      return this._plotables;
    },

    /* Add a plotable to the chart.
     *
     * The axes and domains of the chart are recomputed and the chart redrawn.
     *
     * plotable - d3.plotable object to add.
     *
     * Returns the chart.
     */
    addPlotable: function(plotable) {
      var chart = this,
          // Check the plotable object has the necessary properties
          requiredProps = ['draw', 'name', 'xDomain', 'yDomain'],
          plotableOK = requiredProps.every(function(prop) {
            return plotable[prop] !== undefined;
          });
      if (!plotableOK) {
        return;
      }
      chart._plotables[plotable.name] = plotable;
      chart._layers[plotable.name] = chart.base.select('g')
        .insert('g', '.axis')
        .classed(plotable.name, true)
        // Applying the clipping path to the chart area
        .attr('clip-path', 'url(#' + chart.clipPath.attr('id') + ')');
      chart.setDomain();
      chart.draw(false);
      return chart;
    },

    /* Remove the plotable with `name` property equal to `plotableName` from
     * the chart.
     *
     * plotableName - Name of the plotable to remove from the chart.
     *
     * Returns the chart.
     */
    removePlotable: function(plotableName) {
      var chart = this;
      chart._layers[plotableName].remove();
      delete chart._plotables[plotableName];
      delete chart._layers[plotableName];
      chart.setDomain();
      chart.draw(false);
      return chart;
    },

    /* Returns the list of plotable objects registered as ornaments belonging
     * to the chart
     */
    ornaments: function() {
      return this._ornaments;
    },

    /* Add a ornament to the chart.
     *
     * As ornaments do not depend on the scale, the domains are not recomputed
     * and the chart and other plotables are not redrawn.
     *
     * ornament - d3.plotable object to add as an ornament.
     *
     * Returns the chart.
     */
    addOrnament: function(ornament) {
      var chart = this,
          // Check the ornament object has the necessary properties
          requiredProps = ['draw', 'name'],
          ornamentOK = requiredProps.every(function(prop) {
            return ornament[prop] !== undefined;
          });
      if (!ornamentOK) {
        return;
      }
      chart._ornaments[ornament.name] = ornament;
      chart._layers[ornament.name] = chart.base.append('g')
        .classed(ornament.name, true);
      ornament.draw(chart, chart._layers[ornament.name]);
      return chart;
    },

    /* Remove the ornament with `name` property equal to `ornamentName` from
     * the chart.
     *
     * ornamentName - Name of the ornament to remove from the chart.
     *
     * Returns the chart.
     */
    removeOrnament: function(ornamentName) {
      var chart = this;
      chart._layers[ornamentName].remove();
      delete chart._ornaments[ornamentName];
      delete chart._layers[ornamentName];
      return chart;
    },

    /* Set the domain of the x, y, and z scales.
     *
     * Loop through each plotable calling their respective `{x,y,z}Domain`
     * methods, then set the chart's domain to the minimum and maximum values
     * found.
     *
     * Returns the chart.
     */
    setDomain: function() {
      var name,
          plotable,
          xDomain = [],
          yDomain = [],
          zDomain = [],
          chart = this;
      for (name in chart._plotables) {
        plotable = chart._plotables[name];
        xDomain = d3.extent(plotable.xDomain().concat(xDomain));
        yDomain = d3.extent(plotable.yDomain().concat(yDomain));
        if (plotable.zDomain !== undefined) {
          zDomain = d3.extent(plotable.zDomain().concat(zDomain));
        }
      }
      xDomain = xDomain.length === 0 ? [0, 1] : xDomain;
      yDomain = yDomain.length === 0 ? [0, 1] : yDomain;
      zDomain = zDomain.length === 0 ? [0, 1] : zDomain;
      chart.xScale.domain(xDomain);
      chart.yScale.domain(yDomain);
      chart.zScale.domain([zDomain[0], zDomain[1]/2.0, zDomain[1]]);
    },

    /* Draw the z scale.
     *
     * Adds 70 pixels to the right margin to make room for the scale.
     *
     * Returns the chart.
     */
    drawColorScale: function() {
      // TODO configurable cellWidth, tick number?
      var chart = this,
          ticks = chart.zScale.ticks(20).reverse(),
          tickDiff = Math.abs(ticks[0] - ticks[1]),
          cellWidth = 25,
          cellHeight = chart.height()/ticks.length,
          zscaleItem = chart.areas.zscale.selectAll('.zscale-item')
            .data(ticks)
            .enter()
              .append('g')
              .attr('class', 'zscale-item')
              .attr('transform', function(d, i) { return 'translate(0, ' + (i*cellHeight) + ')'; });

      // Draw colour cells
      zscaleItem.append('rect')
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .style('fill', chart.zScale);

      // Draw tick label centered within and offset from the cell
      zscaleItem.append('text')
        .attr('x', cellWidth + 5)
        .attr('y', (cellHeight)/2)
        .attr('dy', '.35em')
        .text(String);

      // Draw bounding box around colour scale
      // We don't normally assume styles, but a fill certainly isn't desirable
      chart.areas.zscale.append('rect')
        .attr('width', cellWidth)
        .attr('height', cellHeight*ticks.length)
        .classed('zscale-box', true)
        .style('fill', 'none');
    }
  });
})(window.d3);
;/*
 * d3.plotable.TextBox
 *
 * d3.plotable which draws a box containg key-value pairs of information.
 * Each pair is displayed on a single line, with the key justified to the left,
 * and the value justified on the right.
 *
 * Data API
 * --------
 * The data object is an array of arrays, each of which must contain two items:
 * a 'key', index 0, and a 'value', index 1.
 * Both the 'key' and the 'value' are allowed to be empty strings.
 * Be aware that the 'value' is best specified as a string, otherwise the value
 * will be transformed via toString, possibly leading to undesirable formatting.
 *
 * Example:
 *
 *   [['Name', 'My Thing'], ['Mean', '0.456'], ['RMS', '1.0']]
 *
 * Configuration
 * -------------
 * The possible configuration keys are:
 *
 * * `color`: The color of the text as a CSS-compatible string
 *            (default: '#000000')
 * * `x`: Initial position of the top-left corner of the box along x in px
 *        (default: 10)
 * * `y`: Initial position of the top-left corner of the box along y in px
 *        (default: 10)
 */
(function(d3, undefined) {
  'use strict';
  var TextBox = function(name, data, config) {
    if (config === undefined) {
      config = {};
    }
    if (config.color === undefined) {
      config.color = '#000000';
    }
    if (config.x === undefined) {
      config.x = 0;
    }
    if (config.y === undefined) {
      config.y = 0;
    }
    return {
      name: name,
      data: data,
      xDomain: function() { return []; },
      yDomain: function() { return []; },
      draw: function(axes, g, transition) {
        config.x = config.x + axes.margins.left;
        config.y = config.y + axes.margins.top;

        if (arguments.length === 0) {
          console.error('Cannot draw ' + this.name + ', no arguments given');
          return;
        }
        if (transition === undefined) {
          transition = false;
        }
        g.classed('TextBox', true);
        // Create 'background' rectangle
        var width = 150,
            height = this.data.length*20 + 10;

        //maximum width
        if (width>axes.width()) width = axes.width();
        //move to the left if the name is too long
        if (config.x + width > axes.margins.left+axes.width()) config.x = axes.margins.left + axes.width() - width;
        //still be visible
        if(config.x<0) config.x = 0;

        //maximum height
        if (height>axes.height()) height = axes.height();
        //move down if the name is too long
        if (config.y + width > axes.margins.top+axes.height()) config.y = axes.margins.top + axes.height() - height;
        //still be visible
        if(config.y<0) config.y = 0;

        g.selectAll('rect').data([null]).enter()
          .append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', width)
          .attr('height', height)
          .style('fill', '#ffffff')
          .style('stroke', '#000000')
          .style('stroke-width', '1px');
        // Create join data, one <text> element per datum
        var join = g.selectAll('g').data(this.data);
        join.enter().append('g')
          .classed('legend-item', true)
          .attr('transform', function(d, i) { return 'translate(0,' + (20 + i*20) + ')'; });
        join.selectAll('text').data(function(d) { return d; })
          .enter()
          .append('text')
          // Align the key value to the left, value to right, padded by 5px
          .attr('x', function(d, i) { return [5, width - 5][i]; })
          .attr('text-anchor', function(d, i) { return ['start', 'end'][i]; })
          .style('fill', config.color)
          .text(function(d) { return d; });
        // Set up dragging on the container element
        var initPosition = g.data()[0] === undefined ? [{x: config.x, y: config.y}] : g.data();
        g.data(initPosition);
        g.attr('transform', 'translate(' + initPosition[0].x + ',' + initPosition[0].y + ')');
        var drag = d3.behavior.drag()
          .origin(function(d, i) { return d; })
          .on('drag', function (d, i) {
            d3.select(this)
              .attr('transform', 'translate(' + (d.x = d3.event.x) + ',' + (d.y = d3.event.y) + ')');
          });
        g.call(drag);
        return;
      }
    };
  };

  d3.plotable = d3.plotable || {};
  d3.plotable.TextBox = TextBox;
})(window.d3);
;/*
 * d3.plotable.Histogram
 *
 * d3.plotable which draws a histogram.
 *
 * Data API
 * --------
 * The data object is an array of objects, each of which must contain the
 * followings keys:
 *
 * * `xlow`: Lower edge of the bin
 * * `xhigh`: Upper edge of the bin
 * * `y`: Contents of the bin
 *
 * The other optional keys per object are:
 *
 * * `yerr`: Uncertainty on `y` as a 2-tuple (low, high)
 *
 * Configuration
 * -------------
 * The possible configuration keys are:
 *
 * * `color`: The color of the histogram line as a CSS-compatiable string
 *            (default: '#261196').
 * * `yMinimum`: The minimum value shown on the y-axis (default: 0).
 *               If the extent of the bin values is lower than yMinimum,
 *               yMinimum will be overrided.
 * * `showUncertainties`: Show the uncertainties on each bin as error bars (default: false).
 *                        This requires the `yerr` key on each data object.
 */
(function(d3, undefined) {
  'use strict';
  var Histogram = function(name, data, config) {
    if (config === undefined) {
      config = {};
    }
    // Check the configuration for allowed keys
    if (config.color === undefined) {
      config.color = '#261196';
    }
    if (config.yMinimum === undefined) {
      config.yMinimum = 0;
    }
    if (config.showUncertainties === undefined) {
      config.showUncertainties = false;
    }
    // Add zero'd uncertainties if none are present
    for (var i = 0; i < data.length; i++) {
      var datum = data[i];
      if (!('yerr' in datum)) {
        datum.yerr = [0, 0];
      }
      data[i] = datum;
    }
    return {
      name: name,
      data: data,
      color: config.color,
      yMinimum: config.yMinimum,
      showUncertainties: config.showUncertainties,
      xDomain: function() {
        // The lowest xlow and the highest xhigh define the extent in x.
        // Add a 5% padding around the extent for aesthetics.
        var xExtent = d3.extent(this.data, function(d) { return d.xlow; }),
            dxExtent = d3.extent(this.data, function(d) { return d.xhigh; }),
            xPadding = 0.05*Math.abs(xExtent[0] - dxExtent[1]);
        return [xExtent[0] - xPadding, dxExtent[1] + xPadding];
      },
      yDomain: function() {
        // Add a 5% padding at the top of the y extent
        var yExtent = d3.extent(this.data, function(d) { return (d.y + d.yerr[1]); }),
            minimum = Math.min(this.yMinimum, yExtent[0]);
        return [minimum, 1.05*yExtent[1]];
      },
      draw: function(axes, g, transition) {
        if (arguments.length === 0) {
          console.error('Cannot draw ' + this.name + ', no arguments given');
          return;
        }
        if (transition === undefined) {
          transition = false;
        }
        g.classed('Histogram', true);
        // Prepend a datum to the data for drawing, defining the beginning of
        // the line area
        // If this datum is not added, the lower edge of the first bin is hidden
        var firstBinEdge = data[0].xlow,
            zeroEl = [{xlow: firstBinEdge, xhigh: firstBinEdge, y: this.yDomain()[0], yerr: [0, 0]}],
            drawnData = zeroEl.concat(this.data);
        // The histogram line
        var linearea = d3.svg.area()
              .interpolate('step-before')
              .x(function(d) { return axes.xScale(d.xhigh); })
              .y1(function(d) { return axes.yScale(d.y); })
              .y0(axes.yScale(this.yMinimum)),
            join = g.selectAll('path.line').data([drawnData]),
            selection = transition === true ? join.transition().duration(250) : join;
        join.enter()
          .append('path')
          .classed('line', true)
          .attr('fill', 'none')
          .attr('stroke', this.color);
        selection.attr('d', linearea);
        // Uncertainties
        var uJoin = g.selectAll('path.uncertainty').data(this.data),
            uSelection = transition === true ? uJoin.transition().duration(250) : uJoin;
        uJoin.enter()
          .append('path')
          .classed('uncertainty', true)
          .attr('fill', 'none')
          .attr('stroke', this.color);
        if (this.showUncertainties === true) {
          uSelection
            .attr('d', function(d) {
              var xCenter = axes.xScale(d.xhigh - (d.xhigh - d.xlow)/2.0),
                  tickWidth = (axes.xScale(d.xhigh) - axes.xScale(d.xlow))/10.0,
                  xLow = xCenter - tickWidth,
                  xHigh = xCenter + tickWidth,
                  yLow = axes.yScale(d.y - d.yerr[0]),
                  yHigh = axes.yScale(d.y + d.yerr[1]);
              return 'M' + xLow + ' ' + yLow +
                'H' + xHigh +
                'M' + xLow + ' ' + yHigh +
                'H' + xHigh +
                'M' + xCenter + ' ' + yHigh +
                'V' + yLow;
            });
        }
      }
    };
  };

  d3.plotable = d3.plotable || {};
  d3.plotable.Histogram = Histogram;
})(window.d3);
;/*
 * d3.plotable.Histogram2D
 *
 * d3.plotable which draws a two-dimensional histogram.
 *
 * Data API
 * --------
 * The data object is an array of objects, each of which must contain the
 * followings keys:
 *
 * * `xlow`: Lower x-edge of the bin
 * * `xhigh`: Upper x-edge of the bin
 * * `ylow`: Lower y-edge of the bin
 * * `yhigh`: Upper y-edge of the bin
 * * `z`: Contents of the bin
 *
 * The other optional keys per object are:
 *
 * * `zerr`: Uncertainty on `z`
 *
 * Configuration
 * -------------
 * There are no supported configuration keys.
 */
(function(d3, undefined) {
  'use strict';
  var Histogram2D = function(name, data, config) {
    if (config === undefined) {
      config = {};
    }
    return {
      name: name,
      data: data,
      xDomain: function() {
        // The lowest xlow and the highest xhigh define the extent in x.
        var xLowExtent = d3.extent(this.data, function(d) { return d.xlow; }),
            xHighExtent = d3.extent(this.data, function(d) { return d.xhigh; });
        return [xLowExtent[0], xHighExtent[1]];
      },
      yDomain: function() {
        // The lowest ylow and the highest yhigh define the extent in y.
        var yLowExtent = d3.extent(this.data, function(d) { return d.ylow; }),
            yHighExtent = d3.extent(this.data, function(d) { return d.yhigh; });
        return [yLowExtent[0], yHighExtent[1]];
      },
      zDomain: function() {
        var zMax = d3.max(this.data, function(d) { return d.z; });
        return [0, zMax/2, zMax];
      },
      draw: function(axes, g, transition) {
        if (arguments.length === 0) {
          console.log('Cannot draw ' + this.name + ', no arguments given');
          return;
        }
        if (transition === undefined) {
          transition = false;
        }
        g.classed('Histogram2D', true);
        var join = g.selectAll('rect').data(data),
            selection = transition === true ? join.transition().duration(250) : join;
        join.enter()
          .append('rect')
          .classed('tile', true);
        selection
          .attr('x', function(d) { return axes.xScale(d.xlow); })
          .attr('y', function(d) { return axes.yScale(d.yhigh); })
          .attr('width', function(d) { return axes.xScale(d.xhigh) - axes.xScale(d.xlow); })
          .attr('height', function(d) { return axes.yScale(d.ylow) - axes.yScale(d.yhigh); })
          .style('fill', function(d) { return axes.zScale(d.z); });
      }
    };
  };

  d3.plotable = d3.plotable || {};
  d3.plotable.Histogram2D = Histogram2D;
})(window.d3);
;/*
 * d3.plotable.LineChart
 *
 * d3.plotable which draws a line chart.
 *
 * Data API
 * --------
 * The data object is an array of objects, each of which must contain the
 * followings keys:
 *
 * * `x`: Abscissa value
 * * `y`: Ordinate value
 *
 * The other optional keys per object are:
 *
 * * `xerr`: Uncertainty on `x` as a 2-tuple (low, high)
 * * `yerr`: Uncertainty on `y` as a 2-tuple (low, high)
 *
 * Configuration
 * -------------
 * The possible configuration keys are:
 *
 * * `color`: The color of the line as a CSS-compatiable string
 *            (default: '#261196').
 * * `interpolation`: The interpolation method applied to the line (default: 'basis')
 *                    For all available options, see:
 *                      https://github.com/mbostock/d3/wiki/SVG-Shapes#line_interpolate
 * * `showPoints`: Show points associated with each coordinate (default: False).
 * * `showUncertainties`: Show the uncertainties on each bin as error bars (default: false).
 *                        This requires the `yerr` key on each data object.
 */
(function(d3, undefined) {
  'use strict';
  var LineChart = function(name, data, config) {
    if (config === undefined) {
      config = {};
    }
    // Check the configuration for allowed keys
    if (config.color === undefined) {
      config.color = '#261196';
    }
    if (config.interpolation === undefined) {
      config.interpolation = 'basis';
    }
    if (config.showPoints === undefined) {
      config.showPoints = false;
    }
    if (config.showUncertainties === undefined) {
      config.showUncertainties = false;
    }
    // Add zero'd uncertainties if none are present
    for (var i = 0; i < data.length; i++) {
      var datum = data[i];
      if (!('xerr' in datum)) {
        datum.xerr = [0, 0];
      }
      if (!('yerr' in datum)) {
        datum.yerr = [0, 0];
      }
      data[i] = datum;
    }
    return {
      name: name,
      data: data,
      color: config.color,
      interpolation: config.interpolation,
      showPoints: config.showPoints,
      showUncertainties: config.showUncertainties,
      xDomain: function() {
        // The lowest x value minus the its lower error and the highest x value plus
        // its higher error define the extent in x.
        // Add a 5% padding around the extent for aesthetics.
        var xHighExtent = d3.extent(this.data, function(d) { return (d.x + d.xerr[1]); }),
            xLowExtent = d3.extent(this.data, function(d) { return (d.x - d.xerr[0]); }),
            xExtent = [xLowExtent[0], xHighExtent[1]],
            xPadding = 0.05*Math.abs(xExtent[0] - xExtent[1]);
        return [xExtent[0] - xPadding, xExtent[1] + xPadding];
      },
      yDomain: function() {
        // The lowest y value minus its lower error and the highest y value plus
        // its higher error define the extent in y.
        // Add a 5% padding around the extent for aesthetics.
        var yHighExtent = d3.extent(this.data, function(d) { return (d.y + d.yerr[1]); }),
            yLowExtent = d3.extent(this.data, function(d) { return (d.y - d.yerr[0]); }),
            yExtent = [yLowExtent[0], yHighExtent[1]],
            yPadding = 0.05*Math.abs(yExtent[0] - yExtent[1]);
        return [yExtent[0] - yPadding, yExtent[1] + yPadding];
      },
      draw: function(axes, g, transition) {
        if (arguments.length === 0) {
          console.error('Cannot draw ' + this.name + ', no arguments given');
          return;
        }
        if (transition === undefined) {
          transition = false;
        }
        g.classed('LineChart', true);
        var line = d3.svg.line()
              .interpolate(this.interpolation)
              .x(function(d) { return axes.xScale(d.x); })
              .y(function(d) { return axes.yScale(d.y); }),
            join = g.selectAll('path.line').data([this.data]),
            selection = transition === true ? join.transition().duration(250) : join;
        join.enter()
          .append('path')
          .classed('line', true)
          .attr('fill', 'none')
          .attr('stroke', this.color);
        selection.attr('d', line);
        // Points
        var pointsJoin = g.selectAll('circle.point').data(this.data),
            pointsSelection = transition === true ? pointsJoin.transition().duration(250) : pointsJoin;
        pointsJoin.enter()
          .append('circle')
          .classed('point', true)
          .attr('fill', this.color);
        if (this.showPoints === true) {
          pointsSelection
            .attr('cx', function(d) { return axes.xScale(d.x); })
            .attr('cy', function(d) { return axes.yScale(d.y); })
            .attr('r', 2);
        }

        // Uncertainties
        var uJoin = g.selectAll('path.uncertainty').data(this.data),
            uSelection = transition === true ? uJoin.transition().duration(250) : uJoin;
        uJoin.enter()
          .append('path')
          .classed('uncertainty', true)
          .attr('fill', 'none')
          .attr('stroke', this.color);
        if (this.showUncertainties === true) {
          uSelection
            .attr('d', function(d) {
              var x = axes.xScale(d.x),
                  xLow = axes.xScale(d.x - d.xerr[0]),
                  xHigh = axes.xScale(d.x + d.xerr[1]),
                  y = axes.yScale(d.y),
                  yLow = axes.yScale(d.y - d.yerr[0]),
                  yHigh = axes.yScale(d.y + d.yerr[1]),
                  tickWidth = 4;
              var yPath = 'M' + (x - tickWidth) + ' ' + yLow +
                'H' + (x + tickWidth) +
                'M' + x + ' ' + yLow +
                'V' + yHigh +
                'M' + (x - tickWidth) + ' ' + yHigh +
                'H' + (x + tickWidth);
              var xPath = 'M' + xLow + ' ' + (y - tickWidth) +
                'V' + (y + tickWidth) +
                'M' + xLow + ' ' + y +
                'H' + xHigh +
                'M' + xHigh + ' ' + (y + tickWidth) +
                'V' + (y - tickWidth);
              return yPath + xPath;
            });
        }
      }
    };
  };

  d3.plotable = d3.plotable || {};
  d3.plotable.LineChart = LineChart;
})(window.d3);
;/*
 * d3.plotable.LabelBox
 *
 * d3.plotable which draws a box containg the label of the histogram.
 *
 * Data API
 * --------
 * The data object is a string. 
 *
 *
 * Configuration
 * -------------
 * The possible configuration keys are:
 *
 * * `color`: The color of the text as a CSS-compatible string
 *            (default: '#000000')
 * * `x`: Initial position of the top-left corner of the box along x in px
 *        (default: 10)
 * * `y`: Initial position of the top-left corner of the box along y in px
 *        (default: 10)
 */
(function(d3, undefined) {
  'use strict';
  var LabelBox = function(name, data, config) {
    if (config === undefined) {
      config = {};
    }
    if (config.color === undefined) {
      config.color = '#000000';
    }
    if (config.x === undefined) {
      config.x = 0;
    }
    if (config.y === undefined) {
      config.y = 20;
    }
    if (config.bkg === undefined) {
      config.bkg = "transparent";
    }
    return {
      name: name,
      data: data,
      xDomain: function() { return []; },
      yDomain: function() { return []; },
      draw: function(axes, g, transition) {
        if (arguments.length === 0) {
          console.error('Cannot draw ' + this.name + ', no arguments given');
          return;
        }
        if (transition === undefined) {
          transition = false;
        }
        //put margin to x coordinate:
        config.x = config.x + axes.margins.left;
        g.classed('TextBox', true);
        g.selectAll('text').data([null])
          .enter()
          .append('text')
          .attr('x', 5)
          .attr('y', -4)
          .attr("font-family","sans-serif")
          .style("font-weight", "normal")
          .style("text-anchor", "start")
          .style('fill', config.color)
          .text(this.data);
        // Create 'background' rectangle
        var width = g.selectAll('text').node().getComputedTextLength()+10,
            height = 20;
        //maximum width
        if (width>axes.width()) width = axes.width();
        //move to the left if the name is too long
        if (config.x + width > axes.margins.left+axes.width()) config.x = axes.margins.left + axes.width() - width;
        //still be visible
        if(config.x<0) config.x = 0;
        g.selectAll('rect').data([null]).enter()
          .append('rect')
          .attr('x', 0)
          .attr('y', -19)
          .attr('width', width)
          .attr('height', height)
          .style('fill', config.bkg)
          .style('stroke', '#000000')
          .style('stroke-width', '1px');
        g.selectAll('text').moveToFront();
        g.classed('legend-item', true);
        // Set up dragging on the container element
        var initPosition = g.data()[0] === undefined ? [{x: config.x, y: config.y}] : g.data();
        g.data(initPosition);
        g.attr('transform', 'translate(' + initPosition[0].x + ',' + initPosition[0].y + ')');
        var drag = d3.behavior.drag()
          .origin(function(d, i) { return d; })
          .on('drag', function (d, i) {
            d3.select(this)
              .attr('transform', 'translate(' + (d.x = d3.event.x) + ',' + (d.y = d3.event.y) + ')');
          });
        g.call(drag);
        return;
      }
    };
  };

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

  d3.plotable = d3.plotable || {};
  d3.plotable.LabelBox = LabelBox;
})(window.d3);
