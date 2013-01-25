NODE_PATH ?= ./node_modules
JS_COMPILER = $(NODE_PATH)/uglify-js/bin/uglifyjs
JS_TESTER = $(NODE_PATH)/vows/bin/vows

all: \
	queue.min.js \
	component.json \
	package.json

component.json: src/component.js queue.js
	@rm -f $@
	node src/component.js > $@
	@chmod a-w $@

package.json: src/package.js queue.js
	@rm -f $@
	node src/package.js > $@
	@chmod a-w $@

test: all
	@$(JS_TESTER)

%.min.js: %.js Makefile
	@rm -f $@
	$(JS_COMPILER) < $< > $@

clean:
	rm -f queue.min.js component.json package.json
