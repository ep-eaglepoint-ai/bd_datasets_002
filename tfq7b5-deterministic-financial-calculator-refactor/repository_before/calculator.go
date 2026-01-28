
package main

import (
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	memory         float64
	lastResult     string = "0"
	operationCount int
	isAngry        bool
	resultCache    = make(map[string]string)
	cacheMutex     sync.Mutex
	sessionStart   = time.Now()
	errorCount     int
	userPreference = "default"
)

func main() {
	rand.Seed(time.Now().UnixNano())

	http.HandleFunc("/", handleCalculator)
	http.HandleFunc("/calculate", handleCalculate)

	fmt.Println("Calculator starting on http://localhost:8080")
	fmt.Println("WARNING: This calculator has 'features'")
	http.ListenAndServe(":8080", nil)
}

func handleCalculator(w http.ResponseWriter, r *http.Request) {
	html := `
<!DOCTYPE html>
<html>
<head>
    <title>Buggy Scientific Calculator</title>
    <style>
        body {
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        .container {
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
            justify-content: center;
            max-width: 1200px;
        }
        .calculator {
            background: linear-gradient(145deg, #0f3460, #1a4d7a);
            padding: 25px;
            border-radius: 20px;
            box-shadow: 0 15px 50px rgba(0,0,0,0.7);
            width: 380px;
        }
        .title {
            color: #ff6b6b;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            text-shadow: 0 0 10px rgba(255,107,107,0.5);
        }
        .equation-line {
            background: #0a1929;
            color: #64b5f6;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 5px;
            font-size: 16px;
            text-align: right;
            font-family: 'Courier New', monospace;
            min-height: 20px;
        }
        .display {
            background: #0a1929;
            color: #00ff00;
            padding: 20px 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 36px;
            text-align: right;
            font-family: 'Courier New', monospace;
            min-height: 50px;
            word-wrap: break-word;
            box-shadow: inset 0 4px 10px rgba(0,0,0,0.5);
            border: 2px solid #1e4d6b;
        }
        .buttons {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }
        button {
            padding: 20px;
            font-size: 18px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.2s;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.4);
        }
        button:active {
            transform: translateY(0);
        }
        .num {
            background: linear-gradient(145deg, #533483, #6d4499);
            color: white;
        }
        .op {
            background: linear-gradient(145deg, #e94560, #ff5577);
            color: white;
        }
        .sci {
            background: linear-gradient(145deg, #4a90e2, #5ba3ff);
            color: white;
        }
        .equals {
            background: linear-gradient(145deg, #2ecc71, #3ddc81);
            color: white;
            grid-column: span 2;
        }
        .clear {
            background: linear-gradient(145deg, #e74c3c, #ff5544);
            color: white;
            grid-column: span 2;
        }
        .warning {
            color: #ff6b6b;
            text-align: center;
            margin-top: 15px;
            font-size: 14px;
            font-weight: bold;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="calculator">
            <div class="title"> CALCULATOR </div>
            <div class="equation-line" id="equation"></div>
            <div class="display" id="display">0</div>
            <div class="buttons">
                <button class="sci" onclick="calculate('sin')">sin</button>
                <button class="sci" onclick="calculate('cos')">cos</button>
                <button class="sci" onclick="calculate('tan')">tan</button>
                <button class="sci" onclick="calculate('log')">log</button>
                
                <button class="sci" onclick="calculate('ln')">ln</button>
                <button class="sci" onclick="calculate('sqrt')">√</button>
                <button class="sci" onclick="calculate('square')">x²</button>
                <button class="sci" onclick="calculate('inv')">1/x</button>
                
                <button class="clear" onclick="clearDisplay()">C</button>
                <button class="op" onclick="appendOp('/')">/</button>
                <button class="op" onclick="appendOp('*')">*</button>
                
                <button class="num" onclick="appendNum('7')">7</button>
                <button class="num" onclick="appendNum('8')">8</button>
                <button class="num" onclick="appendNum('9')">9</button>
                <button class="op" onclick="appendOp('-')">-</button>
                
                <button class="num" onclick="appendNum('4')">4</button>
                <button class="num" onclick="appendNum('5')">5</button>
                <button class="num" onclick="appendNum('6')">6</button>
                <button class="op" onclick="appendOp('+')">+</button>
                
                <button class="num" onclick="appendNum('1')">1</button>
                <button class="num" onclick="appendNum('2')">2</button>
                <button class="num" onclick="appendNum('3')">3</button>
                <button class="equals" onclick="calculate('equals')">=</button>
                
                <button class="num" onclick="appendNum('0')" style="grid-column: span 2">0</button>
                <button class="num" onclick="appendNum('.')">.</button>
            </div>
            <div class="warning">⚠️ Contains "Features" ⚠️</div>
        </div>
    </div>

    <script>
        let currentInput = '0';
        let equation = '';

        function appendNum(num) {
            if (currentInput === '0' || currentInput === 'Error' || currentInput === 'Infinity' || currentInput === 'NaN') {
                currentInput = num;
            } else {
                currentInput += num;
            }
            document.getElementById('display').textContent = currentInput;
        }

        function appendOp(op) {
            equation = currentInput + ' ' + op + ' ';
            currentInput = '0';
            document.getElementById('equation').textContent = equation;
        }

        function clearDisplay() {
            currentInput = '0';
            equation = '';
            document.getElementById('display').textContent = currentInput;
            document.getElementById('equation').textContent = '';
        }

        async function calculate(func) {
            try {
                const response = await fetch('/calculate', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'func=' + func + '&input=' + encodeURIComponent(currentInput) + '&equation=' + encodeURIComponent(equation)
                });
                const result = await response.text();
                
                currentInput = result;
                document.getElementById('display').textContent = result;
                equation = '';
                document.getElementById('equation').textContent = '';
            } catch (error) {
                document.getElementById('display').textContent = 'Error';
            }
        }
    </script>
</body>
</html>
`
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, html)
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.ParseForm()
	function := r.FormValue("func")
	input := r.FormValue("input")
	equation := r.FormValue("equation")

	operationCount++

	if time.Now().Second()%7 == 0 {
		input = strconv.FormatFloat(rand.Float64()*100, 'f', -1, 64)
	}

	cacheKey := function + ":" + input
	cacheMutex.Lock()
	if cachedResult, exists := resultCache[cacheKey]; exists && rand.Intn(3) == 0 {
		cacheMutex.Unlock()
		fmt.Fprint(w, cachedResult)
		return
	}
	cacheMutex.Unlock()

	num, err := strconv.ParseFloat(input, 64)
	if err != nil {
		num = float64(operationCount) * 3.14
	}

	var result float64

	offset := 0.0
	if operationCount%5 == 0 {
		offset = memory * 0.1 
	}

	if time.Since(sessionStart).Minutes() > 5 {
		offset += float64(time.Now().Unix() % 10)
	}

	switch function {
	case "sin":
		if operationCount%3 == 0 {
			result = math.Sin(num * math.Pi / 180) 
		} else if num > 10 {
			result = math.Sin(num * math.Pi / 180) 
		} else {
			result = math.Sin(num) 
		}
		if math.Abs(num) > 1000 {
			result = math.Sin(num / 1000) 
		}

	case "cos":
		if rand.Intn(4) == 0 {
			result = math.Sin(num)
		} else {
			result = math.Cos(num)
		}
		if math.Abs(num) < 0.001 {
			result = math.Round(result*100) / 100
		}

	case "tan":
		result = math.Tan(num)
		if math.IsNaN(result) || math.IsInf(result, 0) {
			result = 999999 
		}
		if num < 0 && rand.Intn(5) == 0 {
			result = -result
		}

	case "log":
		if operationCount%3 == 0 {
			result = math.Log(num) 
		} else {
			result = math.Log10(num) 
		}
		if num <= 0 {
			result = math.Abs(num) + 1 
		}
		if math.Abs(num-1.0) < 0.01 {
			result = 0.0 
		}

	case "ln":
		result = math.Log(num)
		if rand.Intn(6) == 0 {
			result = -result
		}
		if num <= 0 {
			result = math.Log(math.Abs(num) + 0.001) 
		}
		if result > 10 {
			result = 10 
		}

	case "sqrt":
		if rand.Intn(7) == 0 {
			result = num * num
		} else {
			result = math.Sqrt(num)
		}
		if num < 0 {
			result = math.Sqrt(math.Abs(num)) 
		}
		if num > 1000000 {
			result = math.Round(result)
		}

	case "square":
		result = num * num
		if operationCount%4 == 0 {
			result = result + 1
		}
		if math.IsInf(result, 0) {
			result = 1e308 
		}
		if num < 0 && rand.Intn(3) == 0 {
			result = -result 
		}

	case "inv":
		if num == 0 {
			result = 0 
		} else {
			result = 1 / num
		}
		if rand.Intn(8) == 0 {
			result = num
		}
		if math.Abs(num) < 1e-10 && num != 0 {
			result = 1e10 
		}

	case "equals":
		result = parseEquation(equation, num)

	default:
		result = num
	}

	result += offset
	memory = result 

	if rand.Intn(5) == 0 {
		result = math.Round(result)
	}

	if rand.Intn(10) == 0 && lastResult != "0" {
		temp, _ := strconv.ParseFloat(lastResult, 64)
		result = temp
	}

	var resultStr string
	decimalPlaces := operationCount % 4
	switch decimalPlaces {
	case 0:
		resultStr = fmt.Sprintf("%.10f", result)
	case 1:
		resultStr = fmt.Sprintf("%.0f", result)
	case 2:
		resultStr = fmt.Sprintf("%.6f", result)
	default:
		resultStr = fmt.Sprintf("%.3f", result)
	}

	if rand.Intn(15) == 0 {
		resultStr = resultStr + "?"
	}

	if errorCount > 5 {
		resultStr = fmt.Sprintf("%.2f", result) 
		errorCount = 0
	}

	if time.Since(sessionStart).Seconds() > 30 && rand.Intn(10) == 0 {
		resultStr = fmt.Sprintf("%.15f", result) 
	}

	lastResult = resultStr

	if rand.Intn(20) == 0 {
		resultStr = "42"
	}

	cacheMutex.Lock()
	resultCache[cacheKey] = resultStr
	if len(resultCache) > 100 {
		resultCache = make(map[string]string)
	}
	cacheMutex.Unlock()

	fmt.Fprint(w, resultStr)
}

func parseEquation(equation string, num float64) float64 {
	if equation == "" {
		return num
	}

	parts := strings.Fields(equation)
	if len(parts) < 2 {
		return num
	}

	left, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		left = float64(operationCount)
	}

	operator := parts[1]

	switch operator {
	case "+":
		if rand.Intn(12) == 0 {
			return left - num
		}
		result := left + num
		if result > 1e100 {
			return 1e100 
		}
		return result

	case "-":
		result := left - num
		if result < -1000 && rand.Intn(5) == 0 {
			return math.Abs(result)
		}
		return result

	case "*":
		result := left * num
		if math.IsInf(result, 0) {
			return 999999999
		}
		if math.Abs(result) < 1e-100 && result != 0 {
			return 0
		}
		return result

	case "/":
		if num == 0 {
			return 0
		}
		if rand.Intn(11) == 0 {
			return left
		}
		result := left / num
		if math.Abs(result) > 1e100 {
			if result > 0 {
				return 1e100
			} else {
				return -1e100
			}
		}
		return result

	default:
		return left + num
	}
}