package account

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/eaglepoint/eventstore/pkg/aggregate"
	"github.com/eaglepoint/eventstore/pkg/eventstore"
	"github.com/google/uuid"
	"google.golang.org/protobuf/reflect/protoreflect"
)

// AccountCreatedData implements EventData
type AccountCreatedData struct {
	OwnerName string `json:"owner_name"`
}

func (d *AccountCreatedData) EventType() string { return "AccountCreated" }
func (d *AccountCreatedData) Reset()            {}
func (d *AccountCreatedData) String() string    { return d.OwnerName }
func (d *AccountCreatedData) ProtoMessage()     {}
func (d *AccountCreatedData) ProtoReflect() protoreflect.Message { return nil }

type DepositMadeData struct {
	Amount int64 `json:"amount"`
}

func (d *DepositMadeData) EventType() string { return "DepositMade" }
func (d *DepositMadeData) Reset()            {}
func (d *DepositMadeData) String() string    { return fmt.Sprintf("%d", d.Amount) }
func (d *DepositMadeData) ProtoMessage()     {}
func (d *DepositMadeData) ProtoReflect() protoreflect.Message { return nil }

type WithdrawalMadeData struct {
	Amount int64 `json:"amount"`
}

func (d *WithdrawalMadeData) EventType() string { return "WithdrawalMade" }
func (d *WithdrawalMadeData) Reset()            {}
func (d *WithdrawalMadeData) String() string    { return fmt.Sprintf("%d", d.Amount) }
func (d *WithdrawalMadeData) ProtoMessage()     {}
func (d *WithdrawalMadeData) ProtoReflect() protoreflect.Message { return nil }


// AccountAggregate represents a bank account aggregate
type AccountAggregate struct {
	*aggregate.BaseAggregate
	balance   int64
	ownerName string
	active    bool
}

// NewAccountAggregate creates a new account aggregate
func NewAccountAggregate(id uuid.UUID) *AccountAggregate {
	return &AccountAggregate{
		BaseAggregate: aggregate.NewBaseAggregate(id),
		balance:        0,
		active:         false,
	}
}

// Type returns the aggregate type
func (a *AccountAggregate) Type() string {
	return "Account"
}

// Balance returns the current balance
func (a *AccountAggregate) Balance() int64 {
	return a.balance
}

// OwnerName returns the owner name
func (a *AccountAggregate) OwnerName() string {
	return a.ownerName
}

// IsActive returns whether the account is active
func (a *AccountAggregate) IsActive() bool {
	return a.active
}

// ApplyEvent applies a domain event to the aggregate
func (a *AccountAggregate) ApplyEvent(event eventstore.Event) error {
	switch event.EventType {
	case "AccountCreated":
		var data AccountCreatedData
		if err := json.Unmarshal(event.Data, &data); err != nil {
			return err
		}
		a.ownerName = data.OwnerName
		a.active = true
		a.balance = 0

	case "DepositMade":
		var data DepositMadeData
		if err := json.Unmarshal(event.Data, &data); err != nil {
			return err
		}
		a.balance += data.Amount

	case "WithdrawalMade":
		var data WithdrawalMadeData
		if err := json.Unmarshal(event.Data, &data); err != nil {
			return err
		}
		a.balance -= data.Amount

	case "AccountClosed":
		a.active = false

	default:
		return fmt.Errorf("unknown event type: %s", event.EventType)
	}

	return nil
}

// HandleCommand processes commands
func (a *AccountAggregate) HandleCommand(ctx context.Context, cmd interface{}) ([]eventstore.Event, error) {
	switch c := cmd.(type) {
	case *CreateAccountCommand:
		return a.handleCreateAccount(ctx, c)
	case *DepositCommand:
		return a.handleDeposit(ctx, c)
	case *WithdrawCommand:
		return a.handleWithdraw(ctx, c)
	case *CloseAccountCommand:
		return a.handleCloseAccount(ctx, c)
	default:
		return nil, fmt.Errorf("unknown command type: %T", cmd)
	}
}

// CreateAccountCommand creates a new account
type CreateAccountCommand struct {
	ID        uuid.UUID
	OwnerName string
}

func (c *CreateAccountCommand) CommandID() uuid.UUID {
	return c.ID
}

func (c *CreateAccountCommand) CommandType() string {
	return "CreateAccount"
}

// DepositCommand deposits money
type DepositCommand struct {
	ID     uuid.UUID
	Amount int64
}

func (c *DepositCommand) CommandID() uuid.UUID {
	return c.ID
}

func (c *DepositCommand) CommandType() string {
	return "Deposit"
}

// WithdrawCommand withdraws money
type WithdrawCommand struct {
	ID     uuid.UUID
	Amount int64
}

func (c *WithdrawCommand) CommandID() uuid.UUID {
	return c.ID
}

func (c *WithdrawCommand) CommandType() string {
	return "Withdraw"
}

// CloseAccountCommand closes an account
type CloseAccountCommand struct {
	ID uuid.UUID
}

func (c *CloseAccountCommand) CommandID() uuid.UUID {
	return c.ID
}

func (c *CloseAccountCommand) CommandType() string {
	return "CloseAccount"
}

// Command handlers
func (a *AccountAggregate) handleCreateAccount(ctx context.Context, cmd *CreateAccountCommand) ([]eventstore.Event, error) {
	if a.active {
		return nil, fmt.Errorf("account already exists")
	}

	event := eventstore.Event{
		ID:        uuid.New(),
		EventType: "AccountCreated",
	}
	data := AccountCreatedData{OwnerName: cmd.OwnerName}
	eventData, _ := json.Marshal(data)
	event.Data = eventData

	return []eventstore.Event{event}, nil
}

func (a *AccountAggregate) handleDeposit(ctx context.Context, cmd *DepositCommand) ([]eventstore.Event, error) {
	if !a.active {
		return nil, fmt.Errorf("account is not active")
	}
	if cmd.Amount <= 0 {
		return nil, fmt.Errorf("deposit amount must be positive")
	}

	event := eventstore.Event{
		ID:        uuid.New(),
		EventType: "DepositMade",
	}
	data := DepositMadeData{Amount: cmd.Amount}
	eventData, _ := json.Marshal(data)
	event.Data = eventData

	return []eventstore.Event{event}, nil
}

func (a *AccountAggregate) handleWithdraw(ctx context.Context, cmd *WithdrawCommand) ([]eventstore.Event, error) {
	if !a.active {
		return nil, fmt.Errorf("account is not active")
	}
	if cmd.Amount <= 0 {
		return nil, fmt.Errorf("withdrawal amount must be positive")
	}
	if a.balance < cmd.Amount {
		return nil, fmt.Errorf("insufficient funds")
	}

	event := eventstore.Event{
		ID:        uuid.New(),
		EventType: "WithdrawalMade",
	}
	data := WithdrawalMadeData{Amount: cmd.Amount}
	eventData, _ := json.Marshal(data)
	event.Data = eventData

	return []eventstore.Event{event}, nil
}

func (a *AccountAggregate) handleCloseAccount(ctx context.Context, cmd *CloseAccountCommand) ([]eventstore.Event, error) {
	if !a.active {
		return nil, fmt.Errorf("account is already closed")
	}
	if a.balance != 0 {
		return nil, fmt.Errorf("cannot close account with non-zero balance")
	}

	event := eventstore.Event{
		ID:        uuid.New(),
		EventType: "AccountClosed",
	}
	event.Data = []byte("{}")

	return []eventstore.Event{event}, nil
}
