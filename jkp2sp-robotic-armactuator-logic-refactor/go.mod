module jkp2sp-robotic-armactuator-logic-refactor

go 1.21

require (
	github.com/google/uuid v1.6.0
	jkp2sp-robotic-armactuator-logic-refactor/actuators v0.0.0
)

replace jkp2sp-robotic-armactuator-logic-refactor/actuators => ./repository_before
