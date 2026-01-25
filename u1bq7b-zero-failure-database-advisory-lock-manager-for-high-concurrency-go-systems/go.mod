module zerofailure

go 1.21

require (
	dblock-demo v0.0.0
	github.com/DATA-DOG/go-sqlmock v1.5.2
	github.com/lib/pq v1.10.9
)

replace dblock-demo => ./repository_after
