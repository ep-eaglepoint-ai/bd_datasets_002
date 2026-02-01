package main

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
)

func main() {
	http.HandleFunc("/", handleCalculator)
	http.HandleFunc("/calculate", handleCalculate)

	fmt.Println("Deterministic Financial Calculator starting on http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}

func handleCalculator(w http.ResponseWriter, r *http.Request) {
	html := `
<!DOCTYPE html>
<html>
<head>
    <title>Financial Calculator</title>
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
            color: #4ade80;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            text-shadow: 0 0 10px rgba(74,222,128,0.5);
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
        .info {
            color: #4ade80;
            text-align: center;
            margin-top: 15px;
            font-size: 14px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="calculator">
            <div class="title">FINANCIAL CALCULATOR</div>
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
            <div class="info">✓ Deterministic • Audit-Ready</div>
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

// handleCalculate processes calculation requests.
// This function is completely deterministic: the same inputs always produce the same output.
// No global state, randomness, or time-based logic is used.
func handleCalculate(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.ParseForm()
	function := r.FormValue("func")
	input := r.FormValue("input")
	equation := r.FormValue("equation")

	// Parse input - return explicit error on failure
	num, err := strconv.ParseFloat(input, 64)
	if err != nil {
		fmt.Fprint(w, "Error")
		return
	}

	var result float64
	var calcErr bool

	switch function {
	case "sin":
		// Trigonometric functions use radians consistently
		result = math.Sin(num)

	case "cos":
		result = math.Cos(num)

	case "tan":
		result = math.Tan(num)
		// tan can produce infinity at certain values, which is mathematically valid

	case "log":
		// log is base-10 logarithm
		if num <= 0 {
			calcErr = true
		} else {
			result = math.Log10(num)
		}

	case "ln":
		// ln is natural logarithm (base e)
		if num <= 0 {
			calcErr = true
		} else {
			result = math.Log(num)
		}

	case "sqrt":
		// Square root of negative numbers is undefined in real numbers
		if num < 0 {
			calcErr = true
		} else {
			result = math.Sqrt(num)
		}

	case "square":
		result = num * num

	case "inv":
		// Division by zero produces infinity, which is mathematically correct
		if num == 0 {
			calcErr = true
		} else {
			result = 1 / num
		}

	case "equals":
		result, calcErr = parseEquation(equation, num)

	default:
		result = num
	}

	// Handle errors explicitly
	if calcErr {
		fmt.Fprint(w, "Error")
		return
	}

	// Handle special floating-point values
	if math.IsNaN(result) {
		fmt.Fprint(w, "NaN")
		return
	}
	if math.IsInf(result, 1) {
		fmt.Fprint(w, "Infinity")
		return
	}
	if math.IsInf(result, -1) {
		fmt.Fprint(w, "-Infinity")
		return
	}

	// Format result with consistent precision
	// Using %g format provides a clean, consistent representation
	// that removes trailing zeros and uses scientific notation only when needed
	resultStr := strconv.FormatFloat(result, 'g', -1, 64)

	fmt.Fprint(w, resultStr)
}

// parseEquation evaluates a binary arithmetic expression.
// Returns the result and a boolean indicating if an error occurred.
func parseEquation(equation string, num float64) (float64, bool) {
	if equation == "" {
		return num, false
	}

	parts := strings.Fields(equation)
	if len(parts) < 2 {
		return num, false
	}

	left, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return 0, true
	}

	operator := parts[1]

	switch operator {
	case "+":
		return left + num, false

	case "-":
		return left - num, false

	case "*":
		return left * num, false

	case "/":
		if num == 0 {
			return 0, true
		}
		return left / num, false

	default:
		// Unknown operator is an error
		return 0, true
	}
}
