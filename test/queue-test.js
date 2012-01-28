var queue = require("../queue"),
    fs = require("fs"),
    vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("queue");

suite.addBatch({

  "version": {
    "is semantic": function() {
      assert.isTrue(/^([0-9]+)\.([0-9]+)\.([0-9]+)/.test(queue.version));
    }
  },

  "queue of fs.stat": {
    topic: function() {
      queue()
          .defer(fs.stat, __dirname + "/../Makefile")
          .defer(fs.stat, __dirname + "/../README.md")
          .defer(fs.stat, __dirname + "/../package.json")
          .await(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "successfully executes the three tasks": function(error, results) {
      assert.greater(results[0].size, 0);
      assert.greater(results[1].size, 0);
      assert.greater(results[2].size, 0);
      assert.equal(results.length, 3);
    }
  },

  "fully-parallel queue of ten tasks": {
    topic: function() {
      var t = task();
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
          .await(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in parallel": function(error, results) {
      assert.deepEqual(results, [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    }
  },

  "partly-parallel queue of ten tasks": {
    topic: function() {
      var t = task();
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
          .await(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in parallel": function(error, results) {
      assert.deepEqual(results, [3, 3, 3, 3, 3, 3, 3, 3, 2, 1]);
    }
  },

  "serialized queue of ten tasks": {
    topic: function() {
      var t = task();
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
          .await(this.callback);
    },
    "does not fail": function(error, results) {
      assert.isNull(error);
    },
    "executes all tasks in parallel": function(error, results) {
      assert.deepEqual(results, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    }
  }

});

suite.export(module);

function task() {
  var active = 0;
  return function(callback) {
    ++active;
    process.nextTick(function() {
      callback(null, active--);
    });
  };
}
