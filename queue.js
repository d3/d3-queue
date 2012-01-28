(function() {
  if (typeof module === "undefined") self.queue = queue;
  else module.exports = queue;

  var slice = Array.prototype.slice;

  queue.version = "0.0.1";

  function queue(parallelism) {
    var queue = {},
        active = 0, // number of in-flight deferrals
        remaining = 0, // number of deferrals remaining
        index = -1, // monotonically-increasing index
        head, tail, // singly-linked list of deferrals
        error = null,
        results = [],
        await = remember;

    if (!parallelism) parallelism = Infinity;

    queue.defer = function() {
      var node = {index: ++index, args: arguments, next: null};
      if (tail) tail.next = node, tail = tail.next;
      else head = tail = node;
      ++remaining;
      pop();
      return queue;
    };

    queue.await = function(func) {
      await = func;
      if (!remaining) await(error, results);
      return queue;
    };

    function remember(e, r) {
      error = e;
      results = r;
    }

    function pop() {
      if (head && active < parallelism) {
        var node = head,
            func = node.args[0],
            args = slice.call(node.args, 1),
            index = node.index;
        if (head == tail) head = tail = null;
        else head = head.next;
        ++active;
        args.push(function(error, result) {
          --active;
          if (error) {
            if (remaining) {
              remaining = 0; // don't callback again
              head = tail = null; // cancel other queued tasks
              await(error, null); // callback with the error
            }
          } else {
            results[index] = result;
            if (!--remaining) await(null, results);
            else pop();
          }
        });
        func.apply(null, args);
      }
    }

    return queue;
  }
})();
