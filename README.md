# Queue

**Queue.js** is yet another asynchronous helper library for JavaScript. Think of Queue as a minimalist version of [Async.js](https://github.com/caolan/async) that allows fine-tuning over parallelism. Or, think of it as a version of [TameJs](https://github.com/maxtaco/tamejs/) that does not use code generation.

For example, if you wanted to stat two files in parallel:

```js
queue()
    .defer(fs.stat, __dirname + "/../Makefile")
    .defer(fs.stat, __dirname + "/../package.json")
    .await(function(error, file1, file2) { console.log(file1, file2); });
```

Or, if you wanted to run a bazillion asynchronous tasks (here represented as an array of closures) serially:

```js
var q = queue(1);
tasks.forEach(function(t) { q.defer(t); });
q.awaitAll(function(error, results) { console.log("all done!"); });
```

Queue can be run inside Node.js or in a browser.

## Installation

In a browser, you can use the official hosted copy on [CDNJS](https://cdnjs.com/):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/queue-async/1.0.7/queue.min.js"></script>
```

Queue supports the [universal module definition](https://github.com/umdjs/umd) API. For example, with [RequireJS](http://requirejs.org/):

```js
require.config({
  paths: {
    queue: "https://cdnjs.cloudflare.com/ajax/libs/queue-async/1.0.7/queue.min"
  }
});

require(["queue"], function(queue) {
  console.log(queue.version);
});
```

In Node, use [NPM](http://npmjs.org) to install:

```bash
npm install queue-async
```

And then `require("queue-async")`. (The package name is [queue-async](https://npmjs.org/package/queue-async) because the name “queue” was already taken.)

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

Tasks can only be deferred before [*queue*.await](#queue_await) or [*queue*.awaitAll](#queue_awaitAll) is called. If a task is deferred after then, an error is thrown.

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
