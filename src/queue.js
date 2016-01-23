import {slice} from "./array";
import noop from "./noop";

var noabort = {},
    success = [null];

function newQueue(concurrency) {
  if (!(concurrency >= 1)) throw new Error;

  var q,
      tasks = [],
      results = [],
      waiting = 0,
      active = 0,
      ended = 0,
      starting, // inside a synchronous task callback?
      error,
      callback = noop,
      callbackAll = true;

  function start() {
    if (starting) return; // let the current task complete
    while (starting = waiting && active < concurrency) {
      var i = ended + active,
          t = tasks[i],
          j = t.length - 1,
          c = t[j];
      t[j] = end(i);
      --waiting, ++active;
      try { t = c.apply(null, t); }
      catch (e) { if (tasks[i]) return abort(e); } // threw before finishing?
      if (!tasks[i]) continue; // task finished synchronously
      tasks[i] = t || noabort;
    }
  }

  function end(i) {
    return function(e, r) {
      if (!tasks[i]) return; // ignore multiple callbacks
      --active, ++ended;
      tasks[i] = null;
      if (error != null) return; // only report the first error
      if (e != null) {
        abort(e);
      } else {
        results[i] = r;
        if (waiting) start();
        else if (!active) notify();
      }
    };
  }

  function abort(e) {
    var i = ended + active, t;
    error = e; // ignore new tasks and squelch active callbacks
    waiting = active = NaN; // prevent starting and allow notification
    while (--i >= 0) if ((t = tasks[i]) && t.abort) t.abort();
    notify();
  }

  function notify() {
    if (error != null) callback(error);
    else if (callbackAll) callback(null, results);
    else callback.apply(null, success.concat(results));
  }

  return q = {
    defer: function(f) {
      if (callback !== noop) throw new Error;
      var t = slice.call(arguments, 1);
      t.push(f);
      ++waiting, tasks.push(t);
      start();
      return q;
    },
    abort: function() {
      if (error == null) abort(new Error("abort"));
      return q;
    },
    await: function(f) {
      if (callback !== noop) throw new Error;
      callback = f, callbackAll = false;
      if (!waiting && !active) notify();
      return q;
    },
    awaitAll: function(f) {
      if (callback !== noop) throw new Error;
      callback = f, callbackAll = true;
      if (!waiting && !active) notify();
      return q;
    }
  };
}

export default function(concurrency) {
  return newQueue(arguments.length ? +concurrency : Infinity);
}
