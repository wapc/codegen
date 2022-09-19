.PHONY: all deps codegen build clean doc test

all: deps codegen build

deps:
	npm install

codegen:
	apex generate

build:
	npm run build

clean:
	rm -Rf build

doc:

test: build
	npm run test
