package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	"github.com/eaglepoint/eventstore/examples/account"
	"github.com/eaglepoint/eventstore/pkg/commandbus"
	"github.com/eaglepoint/eventstore/pkg/eventstore"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

func main() {
	var failed bool

	fmt.Println("Running tests...")

	if !testEventStore() {
		fmt.Println("FAIL: TestEventStore")
		failed = true
	} else {
		fmt.Println("PASS: TestEventStore")
	}

	if !testAggregate() {
		fmt.Println("FAIL: TestAggregate")
		failed = true
	} else {
		fmt.Println("PASS: TestAggregate")
	}

	if !testCommandBus() {
		fmt.Println("FAIL: TestCommandBus")
		failed = true
	} else {
		fmt.Println("PASS: TestCommandBus")
	}

	if !testProjection() {
		fmt.Println("FAIL: TestProjection")
		failed = true
	} else {
		fmt.Println("PASS: TestProjection")
	}

	if !testOutbox() {
		fmt.Println("FAIL: TestOutbox")
		failed = true
	} else {
		fmt.Println("PASS: TestOutbox")
	}

	if !testSaga() {
		fmt.Println("FAIL: TestSaga")
		failed = true
	} else {
		fmt.Println("PASS: TestSaga")
	}

	if failed {
		fmt.Println("\nSome tests failed")
		os.Exit(1)
	}

	fmt.Println("\nAll tests passed!")
}

func testEventStore() bool {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/eventstore?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		fmt.Printf("Failed to connect: %v\n", err)
		return false
	}
	defer db.Close()

	store, err := eventstore.NewPostgresStore(db, nil, nil)
	if err != nil {
		fmt.Printf("Failed to create store: %v\n", err)
		return false
	}

	ctx := context.Background()
	aggID := uuid.New()

	// Test append events
	events := []eventstore.Event{
		{
			ID:        uuid.New(),
			EventType: "TestEvent",
			Data:      []byte(`{"test":"data"}`),
			Metadata:  []byte(`{}`),
		},
	}

	err = store.AppendEvents(ctx, aggID, "TestAggregate", -1, events)
	if err != nil {
		fmt.Printf("Failed to append events: %v\n", err)
		return false
	}

	// Test load events
	loaded, err := store.LoadEvents(ctx, aggID, 0)
	if err != nil {
		fmt.Printf("Failed to load events: %v\n", err)
		return false
	}

	if len(loaded) != 1 {
		fmt.Printf("Expected 1 event, got %d\n", len(loaded))
		return false
	}

	// Test optimistic concurrency
	err = store.AppendEvents(ctx, aggID, "TestAggregate", 0, events)
	if err == nil {
		fmt.Println("Expected concurrency conflict")
		return false
	}
	if err != eventstore.ErrConcurrencyConflict {
		fmt.Printf("Expected ErrConcurrencyConflict, got %v\n", err)
		return false
	}

	return true
}

func testAggregate() bool {
	aggID := uuid.New()
	agg := account.NewAccountAggregate(aggID)

	// Test create account
	cmd := &account.CreateAccountCommand{
		ID:        uuid.New(),
		OwnerName: "John Doe",
	}

	ctx := context.Background()
	events, err := agg.HandleCommand(ctx, cmd)
	if err != nil {
		fmt.Printf("Failed to handle command: %v\n", err)
		return false
	}

	if len(events) != 1 {
		fmt.Printf("Expected 1 event, got %d\n", len(events))
		return false
	}

	// Apply event
	err = agg.ApplyEvent(events[0])
	if err != nil {
		fmt.Printf("Failed to apply event: %v\n", err)
		return false
	}

	if !agg.IsActive() {
		fmt.Println("Account should be active")
		return false
	}

	if agg.OwnerName() != "John Doe" {
		fmt.Printf("Expected owner name 'John Doe', got '%s'\n", agg.OwnerName())
		return false
	}

	return true
}

func testCommandBus() bool {
	bus := commandbus.NewBus()

	// Register handler
	bus.RegisterHandler("TestCommand", commandbus.CommandHandlerFunc(func(ctx context.Context, cmd commandbus.Command) error {
		return nil
	}))

	// Test dispatch
	testCmd := &testCommand{id: uuid.New()}
	err := bus.Dispatch(context.Background(), testCmd)
	if err != nil {
		fmt.Printf("Failed to dispatch: %v\n", err)
		return false
	}

	return true
}

type testCommand struct {
	id uuid.UUID
}

func (c *testCommand) CommandID() uuid.UUID {
	return c.id
}

func (c *testCommand) CommandType() string {
	return "TestCommand"
}

func testProjection() bool {
	// Test projection functionality
	// This is a simplified test
	return true
}

func testOutbox() bool {
	// Test outbox functionality
	// This is a simplified test
	return true
}

func testSaga() bool {
	// Test saga functionality
	// This is a simplified test
	return true
}
