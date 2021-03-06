﻿/**
 * @module saxo/openapi/transport/retry
 * @ignore
 */

//-- Local variables section --

//-- Local methods section --

function transportMethod(method) {
    return function() {
        //checking if http method call should be handled by RetryTransport
        if (this.methods[method] && this.methods[method].retryLimit > 0) {

            return new Promise((resolve, reject) => {

                var transportCall = {
                    method: method,
                    args: arguments,
                    resolve: resolve,
                    reject: reject,
                    retryCount: 0
                };

                this.sendTransportCall(transportCall);
            });
        } else {
            //calls underlying transport http method
            return this.transport[method].apply(this.transport, arguments);
        }
    };
}

//-- Exported methods section --

/**
 * TransportRetry wraps a transport class to allow the retrying of failed transport calls, so the calls are resent after a timeout.
 * @class
 * @alias saxo.openapi.TransportRetry
 * @param {Transport} transport - The transport to wrap.
 * @param {object} [options] - Settings options. Define retry timeout, http methods to retry and max retry limit per http method type. If not given then calls will run with underlying transport without retry logic.
 * @param {number} [options.retryTimeout=0] - The number of ms after that the retry calls should be done.
 * @param {object.<string,object>} [options.methods] - Http methods that should retry. For each method provide an object with `retryLimit` parameter.
 * @example
 * // Constructor with parameters
 * var transportRetry = new TransportRetry(transport, {retryTimeout:10000, methods:{'delete':{retryLimit:3}}});
 */
function TransportRetry(transport, options) {
    if (!transport) {
        throw new Error("Missing required parameter: transport in TransportRetry");
    }
    this.retryTimeout = (options && options.retryTimeout > 0) ? options.retryTimeout : 0;
    this.methods = (options && options.methods) ? options.methods : {};
    this.transport = transport;
    this.failedCalls = [];
    this.retryTimer = null;
}

/**
 * Performs a get request.
 * @see {@link saxo.openapi.TransportRetry#get}
 * @function
 */
TransportRetry.prototype.get = transportMethod("get");

/**
 * Performs a post request.
 * @see {@link saxo.openapi.TransportRetry#post}
 * @function
 */
TransportRetry.prototype.post = transportMethod("post");

/**
 * Performs a put request.
 * @see {@link saxo.openapi.TransportRetry#put}
 * @function
 */
TransportRetry.prototype.put = transportMethod("put");

/**
 * Performs a delete request.
 * @see {@link saxo.openapi.TransportRetry#delete}
 * @function
 */
TransportRetry.prototype.delete = transportMethod("delete");

/**
 * Performs a patch request.
 * @see {@link saxo.openapi.TransportRetry#patch}
 * @function
 */
TransportRetry.prototype.patch = transportMethod("patch");

/**
 * Performs a patch request.
 * @see {@link saxo.openapi.TransportRetry#head}
 * @function
 */
TransportRetry.prototype.head = transportMethod("head");

/**
 * Performs a patch request.
 * @see {@link saxo.openapi.TransportRetry#options}
 * @function
 */
TransportRetry.prototype.options = transportMethod("options");

/**
 * @protected
 * @param transportCall
 */
TransportRetry.prototype.sendTransportCall = function(transportCall) {

    this.transport[transportCall.method]
        .apply(this.transport, transportCall.args)
        .then(transportCall.resolve,
            (response) => {
                if (!(response && response.status) &&
                    (transportCall.retryCount < this.methods[transportCall.method].retryLimit)) {
                    this.addFailedCall(transportCall);
                }
                else {
                    transportCall.reject.apply(null, arguments);
                }
            });
};

/**
 * @protected
 * @param transportCall
 */
TransportRetry.prototype.addFailedCall = function(transportCall) {
    transportCall.retryCount++;
    this.failedCalls.push(transportCall);
    if (!this.retryTimer) {
        this.retryTimer = setTimeout(() => {
            this.retryFailedCalls();
        }, this.retryTimeout);
    }
};

/**
 * @protected
 */
TransportRetry.prototype.retryFailedCalls = function() {
    this.retryTimer = null;
    while (this.failedCalls.length > 0) {
        this.sendTransportCall(this.failedCalls.shift());
    }
};

/**
 * Disposes the underlying transport, the failed calls queue and clears retry timer.
 */
TransportRetry.prototype.dispose = function() {
    this.failedCalls.length = 0;
    if (this.retryTimer) {
        this.retryTimer.clear();
    }
    this.transport.dispose();
};

//-- Export section --
export default TransportRetry;
