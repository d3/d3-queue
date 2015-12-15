var slice = [].slice,
    running = {};

function unset() {}

export default function(parallelism) {
  var q,
      tasks = [],
      started = 0, // number of tasks that have been started (and perhaps finished)
      active = 0, // number of tasks currently being executed (started but not finished)
      remaining = 0, // number of tasks not yet finished
      popping, // inside a synchronous task callback?
      error = null,
      await = unset,
      all;

  parallelism = arguments.length ? +parallelism : Infinity;

  function pop() {
    while (popping = started < tasks.length && active < parallelism) {
      var i = started++,
          t = tasks[i],
          j = t.length - 1,
          c = t[j];
      tasks[i] = running;
      ++active;
      t[j] = callback(i);
      c.apply(null, t);
    }
  }

  function callback(i) {
    return function(e, r) {
      if (tasks[i] !== running) throw new Error;
      tasks[i] = null;
      --active;
      if (error != null) return;
      if (e != null) {
        error = e; // ignore new tasks and squelch active callbacks
        started = remaining = NaN; // stop queued tasks from starting
        notify();
      } else {
        tasks[i] = r;
        if (--remaining) popping || pop();
        else notify();
      }
    };
  }

  function check() {
    if (await !== unset) throw new Error;
  }

  function notify() {
    if (error != null) await(error);
    else if (all) await(error, tasks);
    else await.apply(null, [error].concat(tasks));
  }

  return q = {
    defer: function(f) {
      check();
      if (!error) {
        var t = slice.call(arguments, 1);
        t.push(f);
        tasks.push(t);
        ++remaining;
        pop();
      }
      return q;
    },
    await: function(f) {
      check();
      await = f, all = false;
      if (!remaining) notify();
      return q;
    },
    awaitAll: function(f) {
      check();
      await = f, all = true;
      if (!remaining) notify();
      return q;
    }
  };
};
