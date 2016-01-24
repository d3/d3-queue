import {slice} from "./array";
import noop from "./noop";

var success = [null];

function Task(id, callback, parameters) {
  this.id = id; // -1 when terminated
  this.next =
  this.previous = null;
  this.object = parameters;
  parameters.push(callback);
}

function Queue(concurrency) {
  if (!(concurrency >= 1)) throw new Error;
  this._free = concurrency;
  this._index = -1;
  this._starting = false;
  this._waitingHead =
  this._waitingTail =
  this._activeHead =
  this._activeTail = null;
  this._values = [];
  this._callback = noop;
}

function poke(q) {
  if (q._starting) return; // let the current task complete
  try { start(q); }
  catch (e) { if (q._activeTail && q._activeTail.id >= 0) abort(q, e); } // task errored synchronously
}

function start(q) {
  var t0, t1;
  while (q._starting = (t0 = q._waitingHead) && q._free) {
    var o = t0.object,
        i = o.length - 1,
        c = o[i];

    // Remove t0 from the head of the waiting list.
    if (t1 = t0.next) t0.next = null, t1.previous = null;
    else q._waitingTail = null;
    q._waitingHead = t1;

    // Add t0 to the tail of the active list.
    if (t0.previous = q._activeTail) q._activeTail.next = t0;
    else q._activeHead = t0;
    q._activeTail = t0;
    --q._free;

    // Start t0.
    o[i] = end(q, t0);
    c = c.apply(null, o);
    if (t0.id < 0) continue; // task finished synchronously
    t0.object = c;
  }
}

function end(q, t) {
  return function(error, value) {
    var id = t.id;
    if (id < 0) return; // ignore multiple callbacks
    t.id = -1;
    ++q._free;

    // Remove t from the middle of the active list.
    var t0 = t.previous, t1 = t.next;
    if (t0) t0.next = t1; else q._activeHead = t1;
    if (t1) t1.previous = t0; else q._activeTail = t0;

    if (q._error != null) return; // ignore secondary errors
    if (error != null) {
      abort(q, error);
    } else {
      if (q._values) q._values[id] = value;
      if (q._waitingHead) poke(q);
      else if (!q._activeHead) notify(q);
    }
  };
}

function abort(q, error) {
  var h = q._activeHead, t, o;

  // Store the error, and prevent any new tasks from being deferred or started.
  q._error = error;
  q._active = 0;
  q._waitingHead =
  q._waitingTail = null;

  // Inactive all tasks, squelching potential callbacks during abort.
  for (t = h; t; t = t.next) t.id = -1;

  // Now abort all tasks, ignoring any secondary errors.
  for (t = h; t; t = t.next) {
    if ((o = t.object) && o.abort) {
      try { o.abort(); }
      catch (_) { /* ignore */ }
    }
  }

  // Allow notification.
  q._activeHead =
  q._activeTail = null;
  notify(q);
}

function notify(q) {
  var callback = q._callback;
  if (q._error != null) callback(q._error);
  else callback(null, q._values);
}

Queue.prototype = {
  defer: function(callback) {
    if (this._callback !== noop) throw new Error;
    if (this._error != null) return this; // Ignore new tasks if errored.
    var t = new Task(++this._index, callback, slice.call(arguments, 1));

    // Add the new task to the tail of the waiting list.
    if (t.previous = this._waitingTail) this._waitingTail.next = t;
    else this._waitingHead = t;
    this._waitingTail = t;

    poke(this);
    return this;
  },
  abort: function() {
    if (this._error == null) abort(this, new Error("abort"));
    return this;
  },
  await: function(callback) {
    if (this._callback !== noop) throw new Error;
    this._callback = function(error, values) {
      if (error != null) callback(error);
      else callback.apply(null, success.concat(values));
    };
    if (!this._activeTail) notify(this);
    return this;
  },
  awaitAll: function(callback) {
    if (this._callback !== noop) throw new Error;
    this._callback = callback;
    if (!this._activeTail) notify(this);
    return this;
  }
};

function queue(concurrency) {
  return new Queue(arguments.length ? +concurrency : Infinity);
}

queue.prototype = Queue.prototype;

export default queue;
