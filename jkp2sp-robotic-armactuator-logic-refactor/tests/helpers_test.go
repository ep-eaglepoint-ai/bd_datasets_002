package actuators_test

import (
	"bytes"
	"encoding/binary"
)

func uint64ToBytes(u uint64) []byte {
	buf := new(bytes.Buffer)
	_ = binary.Write(buf, binary.LittleEndian, u)
	return buf.Bytes()
}
