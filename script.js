
const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const messageDisplay = document.getElementById("message");
const modeButton = document.getElementById("angleMode");
const modeLabel = document.getElementById("modeLabel");
const historyContainer = document.getElementById("history");

let expression = "";
let lastAnswer = 0;
let angleMode = "DEG";
let justCalculated = false;
let history = [];

function showMessage(message, isError = false) {
  messageDisplay.textContent = message;
  messageDisplay.classList.toggle("error", isError);
}

function updateDisplay() {
  expressionDisplay.textContent = expression || "0";
  modeButton.textContent = angleMode;
  modeLabel.textContent = `SCIENTIFIC MODE · ${angleMode}`;
}

function formatNumber(number) {
  if (!Number.isFinite(number)) {
    throw new Error("Result is outside the valid range.");
  }

  if (Object.is(number, -0) || Math.abs(number) < 1e-14) {
    number = 0;
  }

  if (Number.isInteger(number) && Math.abs(number) < 1e15) {
    return String(number);
  }

  return Number(number.toPrecision(12)).toString();
}

function clearCalculator() {
  expression = "";
  justCalculated = false;
  expressionDisplay.textContent = "0";
  resultDisplay.textContent = "0";
  showMessage("Ready to calculate");
  updateDisplay();
}

function insertValue(value) {
  if (justCalculated) {
    const continuesPreviousAnswer =
      ["+", "−", "-", "×", "÷", "*", "/", "^", "%", "!"].includes(value) ||
      value === ")";

    if (!continuesPreviousAnswer) {
      expression = "";
    }

    justCalculated = false;
  }

  expression += value;
  updateDisplay();
  showMessage("Expression entered");
}

function backspace() {
  if (!expression) return;

  const functions = [
    "asin(", "acos(", "atan(", "sqrt(", "cbrt(",
    "sin(", "cos(", "tan(", "log(", "ln(",
    "exp(", "abs(", "deg(", "rad(", "10^(", "√("
  ];

  const matched = functions.find(fn => expression.endsWith(fn));

  if (matched) {
    expression = expression.slice(0, -matched.length);
  } else {
    expression = expression.slice(0, -1);
  }

  justCalculated = false;
  updateDisplay();
  showMessage("Ready");
}

function toggleSign() {
  if (!expression) {
    expression = "-";
  } else if (expression.startsWith("-(") && expression.endsWith(")")) {
    expression = expression.slice(2, -1);
  } else {
    expression = `-(${expression})`;
  }

  justCalculated = false;
  updateDisplay();
}

function tokenize(input) {
  input = input
    .replace(/×/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt");

  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    const numberMatch = input.slice(i).match(
      /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i
    );

    if (numberMatch) {
      const value = Number(numberMatch[0]);

      if (!Number.isFinite(value)) {
        throw new Error("Invalid number.");
      }

      tokens.push({ type: "number", value });
      i += numberMatch[0].length;
      continue;
    }

    const identifierMatch = input.slice(i).match(/^[a-zA-Z]+/);

    if (identifierMatch) {
      tokens.push({
        type: "identifier",
        value: identifierMatch[0].toLowerCase()
      });

      i += identifierMatch[0].length;
      continue;
    }

    if ("+-*/^()%!".includes(char)) {
      tokens.push({ type: "symbol", value: char });
      i++;
      continue;
    }

    throw new Error(`Unknown character: ${char}`);
  }

  return tokens;
}

function evaluateExpression(input) {
  const tokens = tokenize(input);
  let position = 0;

  function peek() {
    return tokens[position];
  }

  function match(value) {
    if (peek() && peek().value === value) {
      position++;
      return true;
    }

    return false;
  }

  function requireFinite(value) {
    if (!Number.isFinite(value)) {
      throw new Error("Result is outside the valid range.");
    }

    return value;
  }

  function toRadians(value) {
    return angleMode === "DEG" ? value * Math.PI / 180 : value;
  }

  function fromRadians(value) {
    return angleMode === "DEG" ? value * 180 / Math.PI : value;
  }

  function factorial(value) {
    if (value < 0 || !Number.isInteger(value)) {
      throw new Error("Factorial needs a non-negative integer.");
    }

    if (value > 170) {
      throw new Error("Factorial is too large.");
    }

    let answer = 1;

    for (let i = 2; i <= value; i++) {
      answer *= i;
    }

    return answer;
  }

  function applyFunction(name, value) {
    switch (name) {
      case "sin":
        return Math.sin(toRadians(value));

      case "cos":
        return Math.cos(toRadians(value));

      case "tan": {
        const radians = toRadians(value);

        if (Math.abs(Math.cos(radians)) < 1e-12) {
          throw new Error("Tangent is undefined at this angle.");
        }

        return Math.tan(radians);
      }

      case "asin":
        if (value < -1 || value > 1) {
          throw new Error("asin accepts values from -1 to 1.");
        }
        return fromRadians(Math.asin(value));

      case "acos":
        if (value < -1 || value > 1) {
          throw new Error("acos accepts values from -1 to 1.");
        }
        return fromRadians(Math.acos(value));

      case "atan":
        return fromRadians(Math.atan(value));

      case "log":
        if (value <= 0) throw new Error("log requires a positive number.");
        return Math.log10(value);

      case "ln":
        if (value <= 0) throw new Error("ln requires a positive number.");
        return Math.log(value);

      case "sqrt":
        if (value < 0) throw new Error("Square root of a negative number is not real.");
        return Math.sqrt(value);

      case "cbrt":
        return Math.cbrt(value);

      case "abs":
        return Math.abs(value);

      case "exp":
        return Math.exp(value);

      case "deg":
        return value * 180 / Math.PI;

      case "rad":
        return value * Math.PI / 180;

      case "antilog":
        return Math.pow(10, value);

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  function parsePrimary() {
    const token = peek();

    if (!token) {
      throw new Error("Incomplete expression.");
    }

    if (token.type === "number") {
      position++;
      return token.value;
    }

    if (match("(")) {
      const value = parseAdditive();

      if (!match(")")) {
        throw new Error("Missing closing bracket ).");
      }

      return value;
    }

    if (token.type === "identifier") {
      position++;
      const name = token.value;

      if (name === "pi") return Math.PI;
      if (name === "e") return Math.E;

      if (!match("(")) {
        throw new Error(`Use brackets after ${name}.`);
      }

      const value = parseAdditive();

      if (!match(")")) {
        throw new Error("Missing closing bracket ).");
      }

      return requireFinite(applyFunction(name, value));
    }

    throw new Error("Invalid expression.");
  }

  function parsePostfix() {
    let value = parsePrimary();

    while (peek() && (peek().value === "!" || peek().value === "%")) {
      if (match("!")) {
        value = factorial(value);
      } else if (match("%")) {
        value = value / 100;
      }
    }

    return value;
  }

  function parsePower() {
    const base = parsePostfix();

    if (match("^")) {
      const exponent = parseUnary();
      return requireFinite(Math.pow(base, exponent));
    }

    return base;
  }

  function parseUnary() {
    if (match("+")) return parseUnary();
    if (match("-")) return -parseUnary();

    return parsePower();
  }

  function startsPrimary(token) {
    if (!token) return false;

    return token.type === "number" ||
      token.type === "identifier" ||
      token.value === "(";
  }

  function parseMultiplicative() {
    let value = parseUnary();

    while (peek()) {
      if (match("*")) {
        value *= parseUnary();
      } else if (match("/")) {
        const divisor = parseUnary();

        if (divisor === 0) {
          throw new Error("Cannot divide by zero.");
        }

        value /= divisor;
      } else if (startsPrimary(peek())) {
        // Supports implicit multiplication, e.g. 2(3+4), 2pi and 2sin(30).
        value *= parseUnary();
      } else {
        break;
      }

      requireFinite(value);
    }

    return value;
  }

  function parseAdditive() {
    let value = parseMultiplicative();

    while (peek()) {
      if (match("+")) {
        value += parseMultiplicative();
      } else if (match("-")) {
        value -= parseMultiplicative();
      } else {
        break;
      }

      requireFinite(value);
    }

    return value;
  }

  if (tokens.length === 0) {
    throw new Error("Enter a calculation first.");
  }

  const answer = parseAdditive();

  if (position !== tokens.length) {
    throw new Error("Check your operators and brackets.");
  }

  return requireFinite(answer);
}

function calculate() {
  if (!expression.trim()) {
    showMessage("Enter a calculation first.", true);
    return;
  }

  try {
    const originalExpression = expression;
    const answer = evaluateExpression(originalExpression);
    const formatted = formatNumber(answer);

    resultDisplay.textContent = formatted;
    lastAnswer = answer;
    justCalculated = true;
    showMessage("Calculation successful");

    history.unshift({
      expression: originalExpression,
      answer: formatted
    });

    if (history.length > 30) {
      history.pop();
    }

    renderHistory();
  } catch (error) {
    resultDisplay.textContent = "Error";
    showMessage(error.message || "Invalid expression.", true);
  }
}

function renderHistory() {
  historyContainer.innerHTML = "";

  if (history.length === 0) {
    historyContainer.innerHTML = `
      <div class="empty-history">
        <span>↗</span>
        <p>Your calculations will appear here.</p>
      </div>`;
    return;
  }

  history.forEach((item, index) => {
    const entry = document.createElement("div");
    entry.className = "history-item";
    entry.tabIndex = 0;
    entry.setAttribute("role", "button");
    entry.setAttribute("aria-label", `Reuse calculation ${item.expression}`);

    const expr = document.createElement("div");
    expr.className = "history-expression";
    expr.textContent = item.expression;

    const answer = document.createElement("div");
    answer.className = "history-answer";
    answer.textContent = `= ${item.answer}`;

    entry.append(expr, answer);

    function reuseCalculation() {
      expression = item.expression;
      justCalculated = false;
      updateDisplay();
      resultDisplay.textContent = item.answer;
      showMessage("Calculation restored");
    }

    entry.addEventListener("click", reuseCalculation);
    entry.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        reuseCalculation();
      }
    });

    historyContainer.appendChild(entry);
  });
}

document.getElementById("keypad").addEventListener("click", event => {
  const button = event.target.closest("button");

  if (!button) return;

  if (button.dataset.insert !== undefined) {
    insertValue(button.dataset.insert);
    return;
  }

  switch (button.dataset.action) {
    case "clear":
      clearCalculator();
      break;

    case "backspace":
      backspace();
      break;

    case "sign":
      toggleSign();
      break;

    case "equals":
      calculate();
      break;

    case "ans":
      insertValue(String(lastAnswer));
      break;

    case "reciprocal":
      insertValue(`1÷(${expression || "0"})`);
      break;
  }
});

document.getElementById("clear").addEventListener("click", clearCalculator);

modeButton.addEventListener("click", () => {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  updateDisplay();
  showMessage(`Angle mode changed to ${angleMode}`);
});

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

document.getElementById("clearHistory").addEventListener("click", () => {
  history = [];
  renderHistory();
  showMessage("History cleared");
});

document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculate();
    return;
  }

  if (event.key === "Escape") {
    clearCalculator();
    return;
  }

  if (event.key === "Backspace") {
    backspace();
    return;
  }

  const keyMap = {
    "*": "×",
    "/": "÷",
    "-": "−"
  };

  if (/^[0-9.]$/.test(event.key) || "+-*/^()%!".includes(event.key)) {
    insertValue(keyMap[event.key] || event.key);
  }
});

updateDisplay();
renderHistory();
