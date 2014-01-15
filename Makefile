GENERATED_FILES = \
	queue.min.js \
	component.json \
	package.json

.PHONY: all clean test

all: $(GENERATED_FILES)

component.json: bin/component queue.js
	@rm -f $@
	bin/component > $@
	@chmod a-w $@

package.json: bin/package queue.js
	@rm -f $@
	bin/package > $@
	@chmod a-w $@

%.min.js: %.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs $< -c -m -o $@

test: all
	@npm test

clean:
	rm -f -- $(GENERATED_FILES)
