package spool

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestQueueAllocatesPersistsAndAcknowledgesInOrder(t *testing.T) {
	directory := filepath.Join(t.TempDir(), "spool")
	queue, err := Open(directory, 3, 1024)
	if err != nil {
		t.Fatal(err)
	}
	first, err := queue.EnqueueNext(snapshot("snapshot:1"))
	if err != nil {
		t.Fatal(err)
	}
	second, err := queue.EnqueueNext(snapshot("snapshot:2"))
	if err != nil {
		t.Fatal(err)
	}
	if first.Sequence != 1 || second.Sequence != 2 || first.IdempotencyKey == second.IdempotencyKey {
		t.Fatalf("unexpected entries: %#v %#v", first, second)
	}
	if err := queue.Acknowledge(2); err == nil {
		t.Fatal("Acknowledge() removed a non-oldest entry")
	}
	if err := queue.Acknowledge(1); err != nil {
		t.Fatal(err)
	}

	reopened, err := Open(directory, 3, 1024)
	if err != nil {
		t.Fatal(err)
	}
	third, err := reopened.EnqueueNext(snapshot("snapshot:3"))
	if err != nil || third.Sequence != 3 {
		t.Fatalf("recovered sequence entry=%#v error=%v", third, err)
	}
	info, err := os.Stat(directory)
	if err != nil || info.Mode().Perm() != 0o700 {
		t.Fatalf("spool mode = %v, error=%v", info.Mode().Perm(), err)
	}
}

func TestQueueRecoversSequenceFromDurableSnapshotAndRejectsGaps(t *testing.T) {
	directory := filepath.Join(t.TempDir(), "spool")
	queue, err := Open(directory, 4, 1024)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := queue.EnqueueNext(snapshot("snapshot:1")); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(directory, "sequence.state"), []byte(`{"lastSequence":0}`), 0o600); err != nil {
		t.Fatal(err)
	}
	recovered, err := Open(directory, 4, 1024)
	if err != nil {
		t.Fatal(err)
	}
	entry, err := recovered.EnqueueNext(snapshot("snapshot:2"))
	if err != nil || entry.Sequence != 2 {
		t.Fatalf("entry=%#v error=%v", entry, err)
	}
	if err := os.Rename(
		filepath.Join(directory, "00000000000000000002.json"),
		filepath.Join(directory, "00000000000000000003.json"),
	); err != nil {
		t.Fatal(err)
	}
	if _, err := Open(directory, 4, 1024); err == nil {
		t.Fatal("Open() accepted a pending sequence gap")
	}
}

func TestQueueFailsClosedOnCapacityPayloadAndCorruptState(t *testing.T) {
	directory := filepath.Join(t.TempDir(), "spool")
	queue, err := Open(directory, 1, 64)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := queue.EnqueueNext(snapshot("snapshot:1")); err != nil {
		t.Fatal(err)
	}
	if _, err := queue.EnqueueNext(snapshot("snapshot:2")); err == nil {
		t.Fatal("EnqueueNext() exceeded queue capacity")
	}
	if err := os.WriteFile(filepath.Join(directory, "sequence.state"), []byte(`{"unknown":1}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := Open(directory, 1, 64); err == nil {
		t.Fatal("Open() accepted corrupt state")
	}
}

func snapshot(id string) func(uint64) ([]byte, string, error) {
	return func(sequence uint64) ([]byte, string, error) {
		body, _ := json.Marshal(map[string]any{"snapshotId": id, "sequenceForTest": sequence})
		return body, id, nil
	}
}
