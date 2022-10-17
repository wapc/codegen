.PHONY: all deps codegen build clean doc test

ARTIFACT_DIR:=./target/wasm32-unknown-unknown/release
ARTIFACTS=$(wildcard $(ARTIFACT_DIR)/*.wasm)

all: deps codegen build

deps:

codegen:
	apex generate

build:
	cargo build --target wasm32-unknown-unknown --release
	mkdir -p build
ifeq (, $(shell which wasm-opt))
	cp $(ARTIFACT_DIR)/*.wasm build/
	@echo "Could not find wasm-opt in path. Consider installing wasm-opt to shrink your WebAssembly size."
else
	@$(MAKE) opt
endif

opt:
	$(foreach file, $(ARTIFACTS), wasm-opt --strip-debug -Oz $(file) -o build/$(notdir $(file));)

clean:
	cargo clean
	rm -Rf build

doc:

test: build
	cargo test
