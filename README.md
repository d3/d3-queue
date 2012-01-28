# queue.js

 **Queue.js** is yet another asynchronous helper library for JavaScript. Think of it as a minimalist version of [Async.js](https://github.com/caolan/async) that allows fine-tuning over parallelism. Or, think of it as a version of [TameJs](http://tamejs.org/) that does not use code generation.

For example:

```js
queue()
    .defer(fs.stat, __dirname + "/../Makefile")
    .defer(fs.stat, __dirname + "/../package.json")
    .await(function(error, results) { console.log(results); });
```

Queue.js can be run inside Node.js or in a browser.

## API Reference

### queue([parallelism])

Constructs a new queue with the specified *parallelism*. If *parallelism* is not specified, the queue has infinite parallelism. Otherwise, *parallelism* is a positive integer. For example, if *parallelism* is 1, then all tasks will be run in series. If *parallelism* is 3, then at most three tasks will be allowed to proceed concurrently; this is useful, for example, when loading resources in a web browser.

### queue.defer(method[, arguments…])

Adds the specified *method* to the queue, with any optional *arguments*.

### queue.await(callback)

Sets the *callback* to be notified when all deferred tasks have finished.
