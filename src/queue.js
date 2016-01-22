import {slice} from "./array";
import noop from "./noop";

var noabort = {},
    success = [null];

function Queue(concurrency) {
  if (!(concurrency >= 1)) throw new Error;
  this._concurrency = concurrency;
  this._tasks = [];
  this._results = [];
  this._waiting = 0;
  this._active = 0;
  this._ended = 0;
  this._starting;
  this._error;
  this._callback = noop;
  this._callbackAll = true;
}

function poke(q) {
  if (q._starting) return; // let the current task complete
  try { start(q); }
  catch (e) { if (q._tasks[q._ended + q._active - 1]) abort(q, e); } // task errored synchronously
}

function start(q) {
  while (q._starting = q._waiting && q._active < q._concurrency) {
    var i = q._ended + q._active,
        t = q._tasks[i],
        j = t.length - 1,
        c = t[j];
    t[j] = end(q, i);
    --q._waiting, ++q._active;
    t = c.apply(null, t);
    if (!q._tasks[i]) continue; // task finished synchronously
    q._tasks[i] = t || noabort;
  }
}

function end(q, i) {
  return function(e, r) {
    if (!q._tasks[i]) return; // ignore multiple callbacks
    --q._active, ++q._ended;
    q._tasks[i] = null;
    if (q._error != null) return; // ignore secondary errors
    if (e != null) {
      abort(q, e);
    } else {
      q._results[i] = r;
      if (q._waiting) poke(q);
      else if (!q._active) notify(q);
    }
  };
}

function abort(q, e) {
  var i = q._ended + q._active, t;
  q._error = e; // ignore active callbacks
  q._waiting = NaN; // prevent starting

  while (--i >= 0) {
    if ((t = q._tasks[i]) && t.abort) {
      try { t.abort(); }
      catch (e) { /* ignore */ }
    }
  }

  q._active = NaN; // allow notification
  notify(q);
}

function notify(q) {
  var callback = q._callback;
  if (q._error != null) callback(q._error);
  else if (q._callbackAll) callback(null, q._results);
  else callback.apply(null, success.concat(q._results));
}

Queue.prototype = {
  defer: function(task) {
    if (this._callback !== noop) throw new Error;
    if (!this._error) {
      var t = slice.call(arguments, 1);
      t.push(task);
      ++this._waiting, this._tasks.push(t);
      poke(this);
    }
    return this;
  },
  abort: function() {
    if (this._error == null) abort(this, new Error("abort"));
    return this;
  },
  await: function(callback) {
    if (this._callback !== noop) throw new Error;
    this._callback = callback, this._callbackAll = false;
    if (!this._active) notify(this);
    return this;
  },
  awaitAll: function(callback) {
    if (this._callback !== noop) throw new Error;
    this._callback = callback, this._callbackAll = true;
    if (!this._active) notify(this);
    return this;
  }
};

export default function queue(concurrency) {
  return new Queue(arguments.length ? +concurrency : Infinity);
}

queue.prototype = Queue.prototype;
