var fs = require("fs"),
    tape = require("tape"),
    asynchronousTask = require("./asynchronousTask"),
    deferredSynchronousTask = require("./deferredSynchronousTask"),
    synchronousTask = require("./synchronousTask"),
    queue = require("../");

tape("version is semantic", function(test) {
  test.ok(/^([0-9]+)\.([0-9]+)\.([0-9]+)/.test(queue.version));
  test.end();
});

tape("example queue of fs.stat", function(test) {
  queue()
      .defer(fs.stat, __dirname + "/../index.js")
      .defer(fs.stat, __dirname + "/../README.md")
      .defer(fs.stat, __dirname + "/../package.json")
      .await(callback);

  function callback(error, one, two, three) {
    test.equal(error, null);
    test.ok(one.size > 0);
    test.ok(two.size > 0);
    test.ok(three.size > 0);
    test.end();
  }
});

tape("in a queue of a single synchronous task that errors, the error is returned", function(test) {
  queue()
      .defer(function(callback) { callback(-1); })
      .await(callback);

  function callback(error, result) {
    test.equal(error, -1);
    test.equal(result, undefined);
    test.end();
  }
});

tape("in a queue of a single asynchronous task that errors, the error is returned", function(test) {
  queue()
      .defer(function(callback) { process.nextTick(function() { callback(-1); }); })
      .await(callback);

  function callback(error, result) {
    test.equal(error, -1);
    test.equal(result, undefined);
    test.end();
  }
});

tape("in a queue with multiple tasks that error, the first error is returned", function(test) {
  queue()
      .defer(function(callback) { setTimeout(function() { callback(-2); }, 100); })
      .defer(function(callback) { process.nextTick(function() { callback(-1); }); })
      .defer(function(callback) { setTimeout(function() { callback(-3); }, 200); })
      .await(callback);

  function callback(error, one, two, three) {
    test.equal(error, -1);
    test.equal(one, undefined);
    test.equal(two, undefined);
    test.equal(three, undefined);
    test.end();
  }
});

tape("in a queue with multiple tasks where one errors, the first error is returned", function(test) {
  queue()
      .defer(function(callback) { process.nextTick(function() { callback(-1); }); })
      .defer(function(callback) { process.nextTick(function() { callback(null, 'ok'); }); })
      .await(callback);

  function callback(error, one, two) {
    test.equal(error, -1);
    test.equal(one, undefined);
    test.equal(two, undefined);
    test.end();
  }
});

tape("in a queue with multiple synchronous tasks that error, the first error prevents the other tasks from running", function(test) {
  queue()
      .defer(function(callback) { callback(-1); })
      .defer(function(callback) { callback(-2); })
      .defer(function(callback) { throw new Error(); })
      .await(callback);

  function callback(error, one, two, three) {
    test.equal(error, -1);
    test.equal(one, undefined);
    test.equal(two, undefined);
    test.equal(three, undefined);
    test.end();
  }
});

tape("a serial queue of asynchronous closures processes tasks serially", function(test) {
  var tasks = [], task = asynchronousTask(), n = 10, q = queue(1);
  while (--n >= 0) tasks.push(task);
  tasks.forEach(function(t) { q.defer(t); });
  q.awaitAll(callback);

  function callback(error, results) {
    test.equal(error, null);
    test.deepEqual(results, [
      {active: 1, index: 0},
      {active: 1, index: 1},
      {active: 1, index: 2},
      {active: 1, index: 3},
      {active: 1, index: 4},
      {active: 1, index: 5},
      {active: 1, index: 6},
      {active: 1, index: 7},
      {active: 1, index: 8},
      {active: 1, index: 9}
    ]);
    test.end();
  }
});

tape("a fully-parallel queue of ten asynchronous tasks executes all tasks in parallel", function(test) {
  var t = asynchronousTask();
  queue()
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .awaitAll(callback);

  function callback(error, results) {
    test.equal(null, error);
    test.deepEqual(results, [
      {active: 10, index: 0},
      {active: 9, index: 1},
      {active: 8, index: 2},
      {active: 7, index: 3},
      {active: 6, index: 4},
      {active: 5, index: 5},
      {active: 4, index: 6},
      {active: 3, index: 7},
      {active: 2, index: 8},
      {active: 1, index: 9}
    ]);
    test.end();
  }
});

tape("a partly-parallel queue of ten asynchronous tasks executes at most three tasks in parallel", function(test) {
  var t = asynchronousTask();
  queue(3)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .awaitAll(callback);

  function callback(error, results) {
    test.equal(null, error);
    test.deepEqual(results, [
      {active: 3, index: 0},
      {active: 3, index: 1},
      {active: 3, index: 2},
      {active: 3, index: 3},
      {active: 3, index: 4},
      {active: 3, index: 5},
      {active: 3, index: 6},
      {active: 3, index: 7},
      {active: 2, index: 8},
      {active: 1, index: 9}
    ]);
    test.end();
  }
});

tape("a serialized queue of ten asynchronous tasks executes all tasks in series", function(test) {
  var t = asynchronousTask();
  queue(1)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .awaitAll(callback);

  function callback(error, results) {
    test.equal(null, error);
    test.deepEqual(results, [
      {active: 1, index: 0},
      {active: 1, index: 1},
      {active: 1, index: 2},
      {active: 1, index: 3},
      {active: 1, index: 4},
      {active: 1, index: 5},
      {active: 1, index: 6},
      {active: 1, index: 7},
      {active: 1, index: 8},
      {active: 1, index: 9}
    ]);
    test.end();
  }
});

tape("a serialized queue of ten deferred synchronous tasks executes all tasks in series, within the callback of the first task", function(test) {
  var t = deferredSynchronousTask();
  queue(1)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .awaitAll(callback);
  t.finish();

  function callback(error, results) {
    test.equal(null, error);
    test.deepEqual(results, [
      {active: 1, index: 0},
      {active: 2, index: 1},
      {active: 2, index: 2},
      {active: 2, index: 3},
      {active: 2, index: 4},
      {active: 2, index: 5},
      {active: 2, index: 6},
      {active: 2, index: 7},
      {active: 2, index: 8},
      {active: 2, index: 9}
    ]);
    test.end();
  }
});

tape("a partly-parallel queue of ten synchronous tasks executes all tasks in series", function(test) {
  var t = synchronousTask();
  queue(3)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .awaitAll(callback);

  function callback(error, results) {
    test.equal(null, error);
    test.deepEqual(results, [
      {active: 1, index: 0},
      {active: 1, index: 1},
      {active: 1, index: 2},
      {active: 1, index: 3},
      {active: 1, index: 4},
      {active: 1, index: 5},
      {active: 1, index: 6},
      {active: 1, index: 7},
      {active: 1, index: 8},
      {active: 1, index: 9}
    ]);
    test.end();
  }
});

tape("a serialized queue of ten synchronous tasks executes all tasks in series", function(test) {
  var t = synchronousTask();
  queue(1)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .defer(t)
      .awaitAll(callback);

  function callback(error, results) {
    test.equal(null, error);
    test.deepEqual(results, [
      {active: 1, index: 0},
      {active: 1, index: 1},
      {active: 1, index: 2},
      {active: 1, index: 3},
      {active: 1, index: 4},
      {active: 1, index: 5},
      {active: 1, index: 6},
      {active: 1, index: 7},
      {active: 1, index: 8},
      {active: 1, index: 9}
    ]);
    test.end();
  }
});
