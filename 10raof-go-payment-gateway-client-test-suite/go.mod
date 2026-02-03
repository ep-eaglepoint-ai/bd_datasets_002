module analyzer

go 1.21

require github.com/stretchr/testify v1.8.4

require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

require github.com/example/payment-gateway v0.0.0-00010101000000-000000000000

replace github.com/example/payment-gateway => ./repository_after
