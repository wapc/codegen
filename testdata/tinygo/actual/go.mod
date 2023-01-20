module github.com/apexlang/outputtest

go 1.19

require (
	github.com/google/uuid v1.3.0
	github.com/wapc/tinygo-msgpack v0.1.6
	github.com/wapc/wapc-guest-tinygo v0.3.3
)

require github.com/stretchr/testify v1.8.1 // indirect

replace github.com/google/uuid v1.3.0 => github.com/nanobus/iota/go/types/uuid v0.0.0-20230116224750-7d9fb56e8751
