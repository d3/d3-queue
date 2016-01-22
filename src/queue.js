import {slice} from "./array";
import noop from "./noop";

var running = {},
    success = [null];

function newQueue(parallelism) {
  if (!(parallelism >= 1)) throw new Error;

  var q,
      tasks = [],
      waiting = 0,
      active = 0,
      ended = 0,
      starting, // inside a synchronous task callback?
      error,
      callback = noop,
      callbackAll = true;

  function start() {
    if (starting) return; // let the current task complete
    while (starting = waiting && active < parallelism) {
      var i = ended + active,
          t = tasks[i],
          j = t.length - 1,
          c = t[j];
      tasks[i] = running, --waiting, ++active;
      t[j] = end(i);
      c.apply(null, t);
    }
  }

  function end(i) {
    return function(e, r) {
      if (tasks[i] !== running) throw new Error; // detect multiple callbacks
      tasks[i] = null, --active, ++ended;
      if (error != null) return; // only report the first error
      if (e != null) {
        error = e; // ignore new tasks and squelch active callbacks
        waiting = NaN; // stop queued tasks from starting
        notify();
      } else {
        tasks[i] = r;
        if (waiting) start();
        else if (!active) notify();
      }
    };
  }

  function notify() {
    if (error != null) callback(error);
    else if (callbackAll) callback(null, tasks);
    else callback.apply(null, success.concat(tasks));
  }

  return q = {
    defer: function(f) {
      if (callback !== noop) throw new Error;
      var t = slice.call(arguments, 1);
      t.push(f);
      tasks.push(t), ++waiting;
      start();
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
    },
    status: function() {
      return error == null ? {
        waiting: waiting,
        active: active,
        ended: ended
      } : {
        error: error
      };
    }
  };
}

export default function(parallelism) {
  return newQueue(arguments.length ? +parallelism : Infinity);
}
