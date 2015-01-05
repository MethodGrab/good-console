// Load modules

var Util = require('util');
var GoodReporter = require('good-reporter');
var Hoek = require('hoek');
var Moment = require('moment');
var SafeStringify = require('json-stringify-safe');
var Chalk = require('chalk');

// Declare internals

var internals = {
    defaults: {
        format: 'YYMMDD/HHmmss.SSS'
    }
};

module.exports = internals.GoodConsole = function (events, options) {

    Hoek.assert(this.constructor === internals.GoodConsole, 'GoodConsole must be created with new');
    options = options || {};
    var settings = Hoek.applyToDefaults(internals.defaults, options);

    GoodReporter.call(this, events, settings);
};

Hoek.inherits(internals.GoodConsole, GoodReporter);


internals.GoodConsole.prototype._report = function (event, eventData) {

    var tags = (eventData.tags || []).concat([]);
    tags.unshift(event);

    if (event === 'response') {
        return this._formatResponse(eventData, tags);
    }

    var eventPrintData = {
        timestamp: eventData.timestamp,
        tags: tags,
        data: undefined
    };

    if (event === 'ops') {
        eventPrintData.data = 'memory: ' + Math.round(eventData.proc.mem.rss / (1024 * 1024)) +
        'Mb, uptime (seconds): ' + eventData.proc.uptime +
        ', load: ' + eventData.os.load;
        return this._printEvent(eventPrintData);
    }

    if (event === 'error') {
        eventPrintData.data = 'message: ' + eventData.error.message + ' stack: ' + eventData.error.stack;
        return this._printEvent(eventPrintData);
    }

    if (event === 'request' || event === 'log') {
        eventPrintData.data = 'data: ' + (typeof eventData.data === 'object' ? SafeStringify(eventData.data) : eventData.data);
        return this._printEvent(eventPrintData, this._settings.format);
    }

    var m = Moment.utc(eventData.timestamp || Date.now());
    var timestring = m.format(this._settings.format);

    console.log('Unknown event "%s" occurred with timestamp %s.', event, timestring);
};


internals.GoodConsole.prototype._printEvent = function (event) {

    var m = Moment.utc(event.timestamp);
    var timestring = m.format(this._settings.format);
    var data = event.data;

    var color = Chalk.blue;

    if ( event.tags.indexOf( 'error' ) !== -1 ) {
        color = Chalk.red;
    } else if ( event.tags.indexOf( 'warn' ) !== -1 ) {
        color = Chalk.yellow;
    } else if ( event.tags.indexOf( 'success' ) !== -1 ) {
        color = Chalk.green;
    } else if ( event.tags.indexOf( 'info' ) !== -1 ) {
        color = Chalk.cyan;
    }

    var output = timestring + ', ' + color( '(' + event.tags.join(', ') + ')' ) +', ' + data;

    console.log(output);
};


internals.GoodConsole.prototype._formatResponse = function (event, tags) {

    var query = event.query ? JSON.stringify(event.query) : '';
    var responsePayload = '';
    var statusCode = '';

    if (typeof event.responsePayload === 'object' && event.responsePayload) {
        responsePayload = 'response payload: ' + SafeStringify(event.responsePayload);
    }

    var methodColors = {
        get: Chalk.bold.green,
        delete: Chalk.bold.red,
        put: Chalk.bold.cyan,
        post: Chalk.bold.yellow
    };
    var color = methodColors[event.method] || Chalk.bold.blue;
    var method = color(event.method);

    if (event.statusCode) {
        color = Chalk.green;
        if (event.statusCode >= 500) {
            color = Chalk.red;
        } else if (event.statusCode >= 400) {
            color = Chalk.yellow;
        } else if (event.statusCode >= 300) {
            color = Chalk.cyan;
        }
        statusCode = color(event.statusCode);
    }

    this._printEvent({
        timestamp: event.timestamp,
        tags: tags,
        //instance, method, path, query, statusCode, responseTime, responsePayload
        data: Util.format('%s: %s %s %s %s (%sms) %s', event.instance, method, event.path, query, statusCode, event.responseTime, responsePayload)
    });
};
