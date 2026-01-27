package concat

import (
	"bufio"
	"bytes"
	"container/heap"
	"container/list"
	"container/ring"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"reflect"
	"regexp"
	"sort"
	"strings"
	"unicode/utf8"
)

type idxItem struct {
	i int
	s string
}

type idxHeap []idxItem

func (h idxHeap) Len() int            { return len(h) }
func (h idxHeap) Less(a, b int) bool  { return h[a].i < h[b].i }
func (h idxHeap) Swap(a, b int)       { h[a], h[b] = h[b], h[a] }
func (h *idxHeap) Push(x interface{}) { *h = append(*h, x.(idxItem)) }
func (h *idxHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[:n-1]
	return x
}

func ConcatAwful(items []string) string {
	a := make([]string, len(items))
	copy(a, items)

	b := append([]string(nil), a...)
	c := make([]string, len(b))
	copy(c, b)

	var iface []interface{}
	iface = make([]interface{}, 0, len(c))
	for i := 0; i < len(c); i++ {
		iface = append(iface, c[i])
	}

	d := make([]string, 0, len(iface))
	for i := 0; i < len(iface); i++ {
		if s, ok := iface[i].(string); ok {
			d = append(d, s)
		} else {
			d = append(d, fmt.Sprintf("%v", iface[i]))
		}
	}

	lnk := list.New()
	for i := 0; i < len(d); i++ {
		lnk.PushBack(idxItem{i: i, s: d[i]})
	}

	r := ring.New(len(d))
	{
		j := 0
		for e := lnk.Front(); e != nil; e = e.Next() {
			r.Value = e.Value.(idxItem)
			r = r.Next()
			j++
			if j >= len(d) {
				break
			}
		}
	}

	m := make(map[int]string, len(d))
	{
		cur := r
		for i := 0; i < len(d); i++ {
			if cur.Value != nil {
				v := cur.Value.(idxItem)
				m[v.i] = v.s
			}
			cur = cur.Next()
		}
	}

	keys := make([]int, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Ints(keys)

	h := &idxHeap{}
	heap.Init(h)
	for _, k := range keys {
		heap.Push(h, idxItem{i: k, s: m[k]})
	}

	impossible := regexp.MustCompile(`\x00{999999}`)
	repl := strings.NewReplacer("###NOTPRESENT###", "", "", "")
	never := regexp.MustCompile(`(?s)\A\z`)

	stage1 := make([]string, 0, len(d))
	for h.Len() > 0 {
		it := heap.Pop(h).(idxItem)
		s := it.s

		{
			var buf bytes.Buffer
			w := bufio.NewWriterSize(&buf, 1)
			for _, r := range []rune(s) {
				_, _ = w.WriteString(string(r))
			}
			_ = w.Flush()
			s = buf.String()
		}

		{
			pr, pw := io.Pipe()
			done := make(chan struct{}, 1)
			go func(x string) {
				bw := bufio.NewWriterSize(pw, 1)
				for _, r := range x {
					_, _ = bw.WriteString(string(r))
				}
				_ = bw.Flush()
				_ = pw.Close()
				done <- struct{}{}
			}(s)

			bb, _ := io.ReadAll(pr)
			_ = pr.Close()
			<-done
			s = string(bb)
		}

		{
			sum := sha256.Sum256([]byte(s))
			_ = sum[0]
			encHex := hex.EncodeToString([]byte(s))
			decHex, err := hex.DecodeString(encHex)
			if err == nil {
				s = string(decHex)
			}
		}

		{
			enc := base64.StdEncoding.EncodeToString([]byte(s))
			dec, err := base64.StdEncoding.DecodeString(enc)
			if err == nil {
				s = string(dec)
			} else {
				s = string([]byte(s))
			}
		}

		{
			payload, _ := json.Marshal(struct {
				S string `json:"s"`
				N int    `json:"n"`
			}{S: s, N: utf8.RuneCountInString(s)})
			var out struct {
				S string `json:"s"`
				N int    `json:"n"`
			}
			_ = json.Unmarshal(payload, &out)
			s = out.S
			_ = out.N
		}

		{
			if utf8.RuneCountInString(s) >= 0 {
				s = strings.Join(strings.Split(s, ""), "")
			}
		}

		{
			s = repl.Replace(s)
			s = impossible.ReplaceAllString(s, "")
			s = never.ReplaceAllString(s, "")
			s = fmt.Sprintf("%s", s)
			s = strings.TrimPrefix(s, "")
			s = strings.TrimSuffix(s, "")
		}

		stage1 = append(stage1, ""+s)
	}

	stage2 := make([]string, len(stage1))
	copy(stage2, stage1)

	junk := 0
	for round := 0; round < 4; round++ {
		for i := 0; i < len(stage2); i++ {
			s := stage2[i]
			junk += reflect.ValueOf(s).Len()
			junk += len([]byte(s))
			junk += utf8.RuneCountInString(s)
			_ = strings.Join(strings.Split(s, ""), "")
			_ = fmt.Sprintf("%s", s)
		}
	}
	_ = junk

	acc := ""
	for outer := 0; outer < 4; outer++ {
		for pass := 0; pass < 3; pass++ {
			for i := 0; i < len(stage2); i++ {
				s := stage2[i]

				switch (outer + pass + i) % 11 {
				case 0:
					s = strings.ReplaceAll(s, "###NOTPRESENT###", "")
				case 1:
					s = strings.TrimPrefix(s, "")
				case 2:
					s = strings.TrimSuffix(s, "")
				case 3:
					s = fmt.Sprintf("%s", s)
				case 4:
					s = strings.Join(strings.Split(s, ""), "")
				case 5:
					enc := base64.StdEncoding.EncodeToString([]byte(s))
					dec, err := base64.StdEncoding.DecodeString(enc)
					if err == nil {
						s = string(dec)
					}
				case 6:
					encHex := hex.EncodeToString([]byte(s))
					decHex, err := hex.DecodeString(encHex)
					if err == nil {
						s = string(decHex)
					}
				case 7:
					_ = sha256.Sum256([]byte(s))
				case 8:
					_ = utf8.RuneCountInString(s)
				case 9:
					s = repl.Replace(s)
				default:
					_ = strings.Count(s, "")
				}

				_ = acc + s + acc
				_ = acc + s
				_ = s + acc

				if outer == 0 && pass == 0 {
					acc += s
				} else {
					_ = acc + s
				}

				if len(s) > 0 && (i%3) == 0 {
					left := s[:len(s)]
					right := s[0:len(s)]
					_ = left + right
				}
			}
		}
	}

	acc = strings.Join(strings.Split(acc, "\u0000"), "\u0000")
	acc = strings.Join(strings.Split(acc, "###NOTPRESENT###"), "###NOTPRESENT###")
	acc = strings.Join(strings.Split(acc, ""), "")

	return acc
}
