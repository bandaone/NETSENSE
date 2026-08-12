package spool

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

const MaxSafeSequence uint64 = 9_007_199_254_740_991

var snapshotName = regexp.MustCompile(`^([0-9]{20})\.json$`)

type Queue struct {
	directory       string
	maxPending      int
	maxPayloadBytes int64
	lastSequence    uint64
}

type Entry struct {
	Sequence       uint64
	SnapshotID     string
	IdempotencyKey string
	Body           []byte
}

type state struct {
	LastSequence uint64 `json:"lastSequence"`
}

type snapshotIdentity struct {
	SnapshotID string `json:"snapshotId"`
}

func Open(directory string, maxPending int, maxPayloadBytes int64) (*Queue, error) {
	if strings.TrimSpace(directory) == "" {
		return nil, fmt.Errorf("spool directory is required")
	}
	if maxPending < 1 || maxPayloadBytes < 1 {
		return nil, fmt.Errorf("spool limits must be positive")
	}
	if err := ensurePrivateDirectory(directory); err != nil {
		return nil, err
	}
	queue := &Queue{
		directory:       directory,
		maxPending:      maxPending,
		maxPayloadBytes: maxPayloadBytes,
	}
	storedState, err := queue.readState()
	if err != nil {
		return nil, err
	}
	entries, err := queue.Pending()
	if err != nil {
		return nil, err
	}
	queue.lastSequence = storedState.LastSequence
	if len(entries) > 0 && entries[len(entries)-1].Sequence > queue.lastSequence {
		queue.lastSequence = entries[len(entries)-1].Sequence
		if err := queue.writeState(); err != nil {
			return nil, fmt.Errorf("recover sequence state: %w", err)
		}
	}
	return queue, nil
}

func (queue *Queue) EnqueueNext(build func(sequence uint64) ([]byte, string, error)) (Entry, error) {
	entries, err := queue.Pending()
	if err != nil {
		return Entry{}, err
	}
	if len(entries) >= queue.maxPending {
		return Entry{}, fmt.Errorf("snapshot spool capacity reached")
	}
	if queue.lastSequence >= MaxSafeSequence {
		return Entry{}, fmt.Errorf("snapshot sequence capacity reached")
	}
	sequence := queue.lastSequence + 1
	body, snapshotID, err := build(sequence)
	if err != nil {
		return Entry{}, err
	}
	if strings.TrimSpace(snapshotID) == "" {
		return Entry{}, fmt.Errorf("snapshot identity is required")
	}
	if len(body) == 0 || int64(len(body)) > queue.maxPayloadBytes {
		return Entry{}, fmt.Errorf("snapshot payload is outside the configured spool limit")
	}
	if err := validateSnapshotIdentity(body, snapshotID); err != nil {
		return Entry{}, err
	}
	path := queue.snapshotPath(sequence)
	if _, err := os.Lstat(path); err == nil {
		return Entry{}, fmt.Errorf("snapshot sequence already exists in spool")
	} else if !errors.Is(err, os.ErrNotExist) {
		return Entry{}, fmt.Errorf("inspect snapshot spool path: %w", err)
	}
	if err := atomicWrite(path, body, 0o600); err != nil {
		return Entry{}, fmt.Errorf("persist snapshot: %w", err)
	}
	queue.lastSequence = sequence
	if err := queue.writeState(); err != nil {
		return Entry{}, fmt.Errorf("persist sequence state: %w", err)
	}
	return makeEntry(sequence, snapshotID, body), nil
}

func (queue *Queue) Pending() ([]Entry, error) {
	directoryEntries, err := os.ReadDir(queue.directory)
	if err != nil {
		return nil, fmt.Errorf("read snapshot spool: %w", err)
	}
	sequences := make([]uint64, 0)
	for _, directoryEntry := range directoryEntries {
		matches := snapshotName.FindStringSubmatch(directoryEntry.Name())
		if matches == nil {
			continue
		}
		if directoryEntry.Type()&os.ModeSymlink != 0 || !directoryEntry.Type().IsRegular() {
			return nil, fmt.Errorf("snapshot spool contains a non-regular entry")
		}
		sequence, err := strconv.ParseUint(matches[1], 10, 64)
		if err != nil || sequence == 0 || sequence > MaxSafeSequence {
			return nil, fmt.Errorf("snapshot spool contains an invalid sequence")
		}
		sequences = append(sequences, sequence)
	}
	sort.Slice(sequences, func(left, right int) bool { return sequences[left] < sequences[right] })
	for index := 1; index < len(sequences); index++ {
		if sequences[index] != sequences[index-1]+1 {
			return nil, fmt.Errorf("snapshot spool contains a sequence gap")
		}
	}
	entries := make([]Entry, 0, len(sequences))
	for _, sequence := range sequences {
		body, err := readBoundedRegularFile(queue.snapshotPath(sequence), queue.maxPayloadBytes)
		if err != nil {
			return nil, fmt.Errorf("read snapshot %020d: %w", sequence, err)
		}
		var identity snapshotIdentity
		if err := json.Unmarshal(body, &identity); err != nil || strings.TrimSpace(identity.SnapshotID) == "" {
			return nil, fmt.Errorf("snapshot %020d has invalid identity", sequence)
		}
		entries = append(entries, makeEntry(sequence, identity.SnapshotID, body))
	}
	return entries, nil
}

func (queue *Queue) Acknowledge(sequence uint64) error {
	entries, err := queue.Pending()
	if err != nil {
		return err
	}
	if len(entries) == 0 || entries[0].Sequence != sequence {
		return fmt.Errorf("only the oldest pending snapshot can be acknowledged")
	}
	if err := os.Remove(queue.snapshotPath(sequence)); err != nil {
		return fmt.Errorf("remove acknowledged snapshot: %w", err)
	}
	return syncDirectory(queue.directory)
}

func (queue *Queue) snapshotPath(sequence uint64) string {
	return filepath.Join(queue.directory, fmt.Sprintf("%020d.json", sequence))
}

func (queue *Queue) statePath() string {
	return filepath.Join(queue.directory, "sequence.state")
}

func (queue *Queue) readState() (state, error) {
	body, err := readBoundedRegularFile(queue.statePath(), 1024)
	if errors.Is(err, os.ErrNotExist) {
		return state{}, nil
	}
	if err != nil {
		return state{}, fmt.Errorf("read sequence state: %w", err)
	}
	var stored state
	decoder := json.NewDecoder(strings.NewReader(string(body)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&stored); err != nil || stored.LastSequence > MaxSafeSequence {
		return state{}, fmt.Errorf("sequence state is invalid")
	}
	var extra any
	if !errors.Is(decoder.Decode(&extra), io.EOF) {
		return state{}, fmt.Errorf("sequence state contains trailing data")
	}
	return stored, nil
}

func (queue *Queue) writeState() error {
	body, err := json.Marshal(state{LastSequence: queue.lastSequence})
	if err != nil {
		return fmt.Errorf("encode sequence state: %w", err)
	}
	return atomicWrite(queue.statePath(), body, 0o600)
}

func makeEntry(sequence uint64, snapshotID string, body []byte) Entry {
	digest := sha256.Sum256(body)
	return Entry{
		Sequence:       sequence,
		SnapshotID:     snapshotID,
		IdempotencyKey: "topology-" + hex.EncodeToString(digest[:]),
		Body:           body,
	}
}

func validateSnapshotIdentity(body []byte, expected string) error {
	var identity snapshotIdentity
	if err := json.Unmarshal(body, &identity); err != nil {
		return fmt.Errorf("snapshot payload must be valid JSON")
	}
	if identity.SnapshotID != expected {
		return fmt.Errorf("snapshot payload identity does not match allocation")
	}
	return nil
}

func ensurePrivateDirectory(path string) error {
	if err := os.MkdirAll(path, 0o700); err != nil {
		return fmt.Errorf("create spool directory: %w", err)
	}
	info, err := os.Lstat(path)
	if err != nil {
		return fmt.Errorf("inspect spool directory: %w", err)
	}
	if info.Mode()&os.ModeSymlink != 0 || !info.IsDir() {
		return fmt.Errorf("spool path must be a real directory")
	}
	if err := os.Chmod(path, 0o700); err != nil {
		return fmt.Errorf("secure spool directory: %w", err)
	}
	return nil
}

func readBoundedRegularFile(path string, maximum int64) ([]byte, error) {
	info, err := os.Lstat(path)
	if err != nil {
		return nil, err
	}
	if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
		return nil, fmt.Errorf("path must be a regular file")
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	body, err := io.ReadAll(io.LimitReader(file, maximum+1))
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > maximum {
		return nil, fmt.Errorf("file exceeds configured limit")
	}
	return body, nil
}

func atomicWrite(path string, body []byte, mode os.FileMode) error {
	directory := filepath.Dir(path)
	temporary, err := os.CreateTemp(directory, ".netsense-write-*.tmp")
	if err != nil {
		return err
	}
	temporaryPath := temporary.Name()
	committed := false
	defer func() {
		_ = temporary.Close()
		if !committed {
			_ = os.Remove(temporaryPath)
		}
	}()
	if err := temporary.Chmod(mode); err != nil {
		return err
	}
	if _, err := temporary.Write(body); err != nil {
		return err
	}
	if err := temporary.Sync(); err != nil {
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	if err := os.Rename(temporaryPath, path); err != nil {
		return err
	}
	committed = true
	return syncDirectory(directory)
}

func syncDirectory(path string) error {
	directory, err := os.Open(path)
	if err != nil {
		return err
	}
	defer directory.Close()
	return directory.Sync()
}
