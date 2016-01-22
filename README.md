# Queue

**Queue.js** is a minimalist library for escaping callback hell in asynchronous JavaScript. As of release 1.2, Queue is 560 bytes gzipped. (Compare that to [Async.js](https://github.com/caolan/async), which is 4,300!)

A queue evaluates zero or more asynchronous tasks with tunable parallelism. Each task is a function that takes a callback as its last argument. For example, here’s a task that prints “hello” after a short delay:

```js
function delayedHello(callback) {
  setTimeout(function() {
    console.log("Hello!");
    callback(null);
  }, 250);
}
```

When a task completes, it must call the provided callback. The first argument to the callback should be null if the task is successfull, or the error if the task failed. The optional second argument to the callback is the return value of the task. (To return multiple values from a single callback, wrap the results in an object or array.)

To run multiple tasks in parallel, create a queue and register an *await* callback to be called when all of the tasks have completed (or an error occurs):

```js
var q = queue();
q.defer(delayedHello);
q.defer(delayedHello);
q.await(function(error) {
  if (error) throw error;
  console.log("Goodbye!");
});
```

Of course, you can also use a `for` loop to defer many tasks:

```js
var q = queue();

for (var i = 0; i < 1000; ++i) {
  q.defer(delayedHello);
}

q.awaitAll(function(error) {
  if (error) throw error;
  console.log("Goodbye!");
});
```

Tasks can take optional arguments. For example, here’s how to configure the delay before “hello”, and also provide a name:

```js
function delayedHello(name, delay, callback) {
  setTimeout(function() {
    console.log("Hello, " + name + "!");
    callback(null);
  }, delay);
}
```

Any additional arguments provided to [*queue*.defer](#queue_defer) are automatically passed along to the task function, before the callback argument. You can also use method chaining for conciseness:

```js
queue()
    .defer(delayedHello, "Alice", 250)
    .defer(delayedHello, "Bob", 500)
    .defer(delayedHello, "Carol", 750)
    .await(function(error) {
      if (error) throw error;
      console.log("Goodbye!");
    });
```

The [asynchronous callback pattern](https://github.com/maxogden/art-of-node#callbacks) is very common in Node.js, so Queue works directly with many Node API’s. For example, to stat two files in parallel:

```js
queue()
    .defer(fs.stat, __dirname + "/../Makefile")
    .defer(fs.stat, __dirname + "/../package.json")
    .await(function(error, file1, file2) {
      if (error) throw error;
      console.log(file1, file2);
    });
```

Lastly, you can also make abortable tasks. These tasks return an object with an *abort* method which terminates the task. For example:

```js
function delayedHello(name, delay, callback) {
  var id = setTimeout(function() {
    console.log("Hello, " + name + "!");
    callback(null);
  }, delay);
  return {
    abort: function() {
      clearTimeout(id);
    }
  };
}
```

Now if you call [*queue*.abort](#queue_abort), any in-progress tasks will be immediately terminated; in addition, any pending (not-yet-started) tasks not be executed. You can also use *queue*.abort without abortable tasks, in which case active tasks will continue running while pending tasks are cancelled. The [d3-request](https://github.com/d3/d3-request) implements the abort method on top of XMLHttpRequest. For example:

```js
var q = queue()
    .defer(d3.request, "http://www.google.com:81")
    .defer(d3.request, "http://www.google.com:81")
    .defer(d3.request, "http://www.google.com:81")
    .awaitAll(function(error, results) {
      if (error) throw error;
      console.log(results);
    });
```

To abort these requests, call `q.abort()`.

## Installation

If you use NPM, `npm install queue-async`. Otherwise, download the [latest release](https://github.com/mbostock/queue/releases/latest). The released bundle supports AMD, CommonJS, and vanilla environments. You can also load directly from [d3js.org](https://d3js.org):

```html
<script src="https://d3js.org/queue.v1.min.js"></script>
```

In a vanilla environment, a `queue` global function is exported. [Try queue in your browser.](https://tonicdev.com/npm/queue-async)

## API Reference

<a href="#queue" name="queue">#</a> <b>queue</b>([<i>parallelism</i>])

Constructs a new queue with the specified *parallelism*. If *parallelism* is not specified, the queue has infinite parallelism. Otherwise, *parallelism* is a positive integer. For example, if *parallelism* is 1, then all tasks will be run in series. If *parallelism* is 3, then at most three tasks will be allowed to proceed concurrently; this is useful, for example, when loading resources in a web browser.

<a href="#queue_defer" name="queue_defer">#</a> <i>queue</i>.<b>defer</b>(<i>task</i>[, <i>arguments</i>…])

Adds the specified asynchronous *task* callback to the queue, with any optional *arguments*. The *task* will be called with the specified optional arguments and an additional callback argument; the callback must then be invoked by the task when it has finished. The task must invoke the callback with two arguments: the error, if any, and the result of the task. For example:

```js
function simpleTask(callback) {
  setTimeout(function() {
    callback(null, {answer: 42});
  }, 250);
}
```

To return multiple results from a single callback, wrap those results in an object or array.

If the task calls back with an error, any tasks that were scheduled *but not yet started* will not run. For a serial queue (of *parallelism* 1), this means that a task will only run if all previous tasks succeed. For a queue with higher parallelism, only the first error that occurs is reported to the await callback, and tasks that were started before the error occurred will continue to run; note, however, that their results will not be reported to the await callback.

The *task* function can return an abort with an abort method, such that [*queue*.abort](#queue_abort) can abort any active tasks. For example:

```js
function simpleTask(callback) {
  var id = setTimeout(function() {
    callback(null, {answer: 42});
  }, 250);
  return {
    abort: function() {
      clearTimeout(id);
    }
  };
}
```

Tasks can only be deferred before [*queue*.await](#queue_await) or [*queue*.awaitAll](#queue_awaitAll) is called. If a task is deferred after then, an error is thrown.

<a href="#queue_abort" name="queue_abort">#</a> <i>queue</i>.<b>abort</b>()

Aborts any active tasks, invoking each active task’s *task*.abort function, if any. Also prevents any new tasks from starting, and invokes the [*queue*.await](#queue_await) or [*queue*.awaitAll](#queue_awaitAll) callback with an error indicating that the queue was aborted. See [*queue*.defer](#queue_defer) for an example of implementing *task*.abort.

<a href="#queue_await" name="queue_await">#</a> <i>queue</i>.<b>await</b>(<i>callback</i>)

Sets the *callback* to be invoked when all deferred tasks have finished. The first argument to the *callback* is the first error that occurred, or null if no error occurred. If an error occurred, there are no additional arguments to the callback. Otherwise, the *callback* is passed each result as an additional argument. For example:

```js
queue()
    .defer(fs.stat, __dirname + "/../Makefile")
    .defer(fs.stat, __dirname + "/../package.json")
    .await(function(error, file1, file2) { console.log(file1, file2); });
```

If all [deferred](#queue_defer) tasks have already completed, the callback will be invoked immediately. This method may only be called once, after any tasks have been deferred. If this method is called multiple times, or if it is called after [*queue*.awaitAll](#queue_awaitAll), an error is thrown.

<a href="#queue_awaitAll" name="queue_awaitAll">#</a> <i>queue</i>.<b>awaitAll</b>(<i>callback</i>)

Sets the *callback* to be invoked when all deferred tasks have finished. The first argument to the *callback* is the first error that occurred, or null if no error occurred. If an error occurred, there are no additional arguments to the callback. Otherwise, the *callback* is also passed an array of results as the second argument. For example:

```js
queue()
    .defer(fs.stat, __dirname + "/../Makefile")
    .defer(fs.stat, __dirname + "/../package.json")
    .awaitAll(function(error, files) { console.log(files); });
```

If all [deferred](#queue_defer) tasks have already completed, the callback will be invoked immediately. This method may only be called once, after any tasks have been deferred. If this method is called multiple times, or if it is called after [*queue*.await](#queue_await), an error is thrown.
