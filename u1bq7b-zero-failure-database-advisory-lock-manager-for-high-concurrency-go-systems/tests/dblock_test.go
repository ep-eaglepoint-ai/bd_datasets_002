package dblock_test

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"dblock-demo/dblock"

	"github.com/DATA-DOG/go-sqlmock"
)

func safeReleaseLock(t *testing.T, h *dblock.DatabaseLockHelper, ctx context.Context) error {
	v := reflect.ValueOf(h)
	m := v.MethodByName("ReleaseLock")
	if !m.IsValid() {
		return errors.New("ReleaseLock method not found")
	}

	if m.Type().NumIn() == 1 {
		res := m.Call([]reflect.Value{reflect.ValueOf(ctx)})
		if len(res) > 0 && !res[0].IsNil() {
			return res[0].Interface().(error)
		}
		return nil
	} else {
		m.Call(nil)
		return nil
	}
}

func safeIsLocked(h *dblock.DatabaseLockHelper) (bool, bool) {
	v := reflect.ValueOf(h)
	m := v.MethodByName("IsLocked")
	if !m.IsValid() {
		return false, false
	}
	res := m.Call(nil)
	return res[0].Bool(), true
}

func isAfterRepository(h *dblock.DatabaseLockHelper) bool {
	val := reflect.ValueOf(h).Elem()
	if val.Kind() != reflect.Struct {
		return false
	}
	field := val.FieldByName("locked")
	return field.IsValid() && field.Kind() == reflect.Bool
}

func TestAcquireAndRelease(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}
	defer db.Close()

	lockName := "test-lock"
	helper := dblock.NewDatabaseLockHelper(db, lockName)
	isAfter := isAfterRepository(helper)

	if isAfter {
		mock.ExpectQuery("SELECT pg_try_advisory_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"pg_try_advisory_lock"}).AddRow(true))
	} else {
		mock.ExpectExec("SELECT pg_advisory_xact_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
	}

	ctx := context.Background()
	err = helper.AcquireLock(ctx, 3)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	if isLocked, implemented := safeIsLocked(helper); implemented {
		if !isLocked {
			t.Error("expected locked to be true")
		}
	}

	if isAfter {
		mock.ExpectExec("SELECT pg_advisory_unlock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
	} else {
		mock.ExpectExec("SELECT pg_advisory_xact_unlock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
	}

	err = safeReleaseLock(t, helper, ctx)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	if isLocked, implemented := safeIsLocked(helper); implemented {
		if isLocked {
			t.Error("expected locked to be false")
		}
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

func TestAcquireRetry(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("error creating mock db: %v", err)
	}
	defer db.Close()

	helper := dblock.NewDatabaseLockHelper(db, "retry-lock")
	isAfter := isAfterRepository(helper)

	if isAfter {
		mock.ExpectQuery("SELECT pg_try_advisory_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"pg_try_advisory_lock"}).AddRow(false))

		mock.ExpectQuery("SELECT pg_try_advisory_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"pg_try_advisory_lock"}).AddRow(false))

		mock.ExpectExec("SELECT pg_advisory_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
	} else {
		mock.ExpectExec("SELECT pg_advisory_xact_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnError(errors.New("lock already held"))

		mock.ExpectExec("SELECT pg_advisory_xact_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnError(errors.New("lock already held"))

		mock.ExpectExec("SELECT pg_advisory_xact_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
	}

	startTime := time.Now()
	err = helper.AcquireLock(context.Background(), 2)
	if err != nil {
		t.Errorf("expected success, got %v", err)
	}
	duration := time.Since(startTime)

	if duration < 300*time.Millisecond {
		t.Errorf("expected backoff delay, took %v", duration)
	}

	if isAfter {
		mock.ExpectExec("SELECT pg_advisory_unlock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
	} else {
		mock.ExpectExec("SELECT pg_advisory_xact_unlock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
	}

	safeReleaseLock(t, helper, context.Background())

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestContextCancellation(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	helper := dblock.NewDatabaseLockHelper(db, "cancel-lock")
	isAfter := isAfterRepository(helper)
	ctx, cancel := context.WithCancel(context.Background())

	maxRetries := 3
	if !isAfter {
		maxRetries = 0
	}

	if isAfter {
		mock.ExpectQuery("SELECT pg_try_advisory_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"pg_try_advisory_lock"}).AddRow(false))
	} else {
		mock.ExpectExec("SELECT pg_advisory_xact_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnError(errors.New("lock already held"))

		mock.ExpectExec("SELECT pg_advisory_xact_unlock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(0, 1))
	}

	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	err = helper.AcquireLock(ctx, maxRetries)
	if err == nil {
		t.Error("expected cancellation error, got nil")
	}

	time.Sleep(100 * time.Millisecond)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestExhaustedRetries(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	helper := dblock.NewDatabaseLockHelper(db, "fail-lock")
	isAfter := isAfterRepository(helper)

	// Max retries = 1
	if isAfter {
		mock.ExpectQuery("SELECT pg_try_advisory_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"res"}).AddRow(false))

		mock.ExpectExec("SELECT pg_advisory_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnError(errors.New("db disconnect"))
	} else {
		mock.ExpectExec("SELECT pg_advisory_xact_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnError(errors.New("lock already held"))

		mock.ExpectExec("SELECT pg_advisory_xact_lock").
			WithArgs(sqlmock.AnyArg()).
			WillReturnError(errors.New("db disconnect"))
	}

	err = helper.AcquireLock(context.Background(), 1)
	if err == nil {
		t.Error("expected error, got nil")
	} else {
		t.Logf("Got expected error: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}
