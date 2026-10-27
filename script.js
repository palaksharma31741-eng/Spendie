const STORAGE_KEY = "spendieTransactions";
const BUDGET_KEY = "spendieMonthlyBudget";

let transactions = [];
let monthlyBudget = 0;

try {
    const savedTransactions = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
    );

    transactions = Array.isArray(savedTransactions)
        ? savedTransactions
        : [];
} catch {
    transactions = [];
}

try {
    const savedBudget = Number(localStorage.getItem(BUDGET_KEY));
    monthlyBudget =
        Number.isFinite(savedBudget) && savedBudget > 0
            ? savedBudget
            : 0;
} catch {
    monthlyBudget = 0;
}

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expensesElement = document.getElementById("expenses");

const transactionForm = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");

const budgetInput = document.getElementById("monthly-budget-input");
const saveBudgetButton = document.getElementById("save-budget-button");
const budgetSpentElement = document.getElementById("budget-spent");
const budgetRemainingElement = document.getElementById("budget-remaining");
const budgetProgressFill = document.getElementById("budget-progress-fill");
const budgetProgressTrack = document.getElementById("budget-progress-track");
const budgetStatusElement = document.getElementById("budget-status");

const safeToSpendElement = document.getElementById("safe-to-spend");
const safeToSpendNoteElement = document.getElementById("safe-to-spend-note");

const dateInput = document.getElementById("date");

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function formatCurrency(amount) {
    return currencyFormatter.format(amount);
}

function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
        console.error("Could not save transactions:", error);
        alert("Your changes could not be saved. Please check your browser storage.");
    }
}

function saveBudget() {
    try {
        if (monthlyBudget > 0) {
            localStorage.setItem(BUDGET_KEY, String(monthlyBudget));
        } else {
            localStorage.removeItem(BUDGET_KEY);
        }
        return true;
    } catch (error) {
        console.error("Could not save budget:", error);
        alert("Your budget could not be saved. Please check your browser storage.");
        return false;
    }
}

function getCurrentMonthTransactions() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    return transactions.filter((transaction) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date || "")) {
            return false;
        }

        const [year, month] = transaction.date.split("-").map(Number);

        return (
            year === currentYear &&
            month === currentMonth + 1 &&
            transaction.type === "expense"
        );
    });
}

function updateSummary() {
    const totalIncome = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce((total, transaction) => total + transaction.amount, 0);

    const totalExpenses = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((total, transaction) => total + transaction.amount, 0);

    balanceElement.textContent = formatCurrency(totalIncome - totalExpenses);
    incomeElement.textContent = formatCurrency(totalIncome);
    expensesElement.textContent = formatCurrency(totalExpenses);
}

function updateBudget() {
    const currentMonthExpenses = getCurrentMonthTransactions();

    const spent = currentMonthExpenses.reduce(
        (total, transaction) => total + transaction.amount,
        0
    );

    const remaining = monthlyBudget - spent;

    budgetSpentElement.textContent = formatCurrency(spent);

    if (monthlyBudget <= 0) {
        budgetRemainingElement.textContent = formatCurrency(0);
        budgetProgressFill.style.width = "0%";
        budgetProgressTrack.setAttribute("aria-valuenow", "0");

        budgetStatusElement.textContent =
            "Set your monthly budget to start tracking 🌷";

        safeToSpendElement.textContent = "Set a budget to begin";
        safeToSpendNoteElement.textContent =
            "Choose a monthly spending limit to get your daily guide.";

        return;
    }

    budgetRemainingElement.textContent = formatCurrency(remaining);

    const percentage = (spent / monthlyBudget) * 100;
    const progress = Math.min(Math.max(percentage, 0), 100);

    budgetProgressFill.style.width = `${progress}%`;
    budgetProgressTrack.setAttribute(
        "aria-valuenow",
        String(Math.round(progress))
    );

    if (percentage >= 100) {
        budgetStatusElement.textContent =
            "You've reached or passed your budget. Pause and review your spending 💗";
    } else if (percentage >= 80) {
        budgetStatusElement.textContent =
            "You're getting close to your limit. Keep an eye on your spending 🌼";
    } else {
        budgetStatusElement.textContent =
            "You're keeping track, one little step at a time ✨";
    }

    const today = new Date();
    const daysRemaining =
        new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
        ).getDate() - today.getDate() + 1;

    if (remaining <= 0) {
        safeToSpendElement.textContent = formatCurrency(0) + " per day";
        safeToSpendNoteElement.textContent =
            "Your budget is used up. You can review your spending and adjust your plan if needed.";
    } else {
        const dailySuggestion = remaining / daysRemaining;

        safeToSpendElement.textContent =
            formatCurrency(dailySuggestion) + " per day";

        safeToSpendNoteElement.textContent =
            `Based on ${formatCurrency(remaining)} remaining across ${daysRemaining} days, including today. This is a guide, not a strict rule.`;
    }
}

function renderTransactions() {
    transactionList.innerHTML = "";

    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <div class="empty-state">
                <span>🌷</span>
                <h3>Your story starts here!</h3>
                <p>Add your first transaction to see it here.</p>
            </div>
        `;
        return;
    }

    const sortedTransactions = [...transactions].sort((a, b) => {
        return b.date.localeCompare(a.date) || b.id - a.id;
    });

    sortedTransactions.forEach((transaction) => {
        const item = document.createElement("div");
        item.className = "transaction-item";

        const details = document.createElement("div");
        details.className = "transaction-details";

        const title = document.createElement("h3");
        title.textContent = transaction.description;

        const meta = document.createElement("p");
        meta.textContent = `${transaction.category} · ${transaction.date}`;

        details.append(title, meta);

        const amountArea = document.createElement("div");
        amountArea.className = "transaction-amount";

        const amount = document.createElement("strong");
        const isIncome = transaction.type === "income";

        amount.textContent =
            `${isIncome ? "+" : "−"}${formatCurrency(transaction.amount)}`;

        amount.className = isIncome ? "income-amount" : "expense-amount";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-transaction";
        deleteButton.textContent = "Remove";
        deleteButton.setAttribute(
            "aria-label",
            `Remove transaction: ${transaction.description}`
        );

        deleteButton.addEventListener("click", () => {
            const confirmed = confirm(
                `Remove "${transaction.description}" from your diary?`
            );

            if (!confirmed) return;

            transactions = transactions.filter(
                (item) => item.id !== transaction.id
            );

            saveTransactions();
            refreshDashboard();
        });

        amountArea.append(amount, deleteButton);
        item.append(details, amountArea);
        transactionList.appendChild(item);
    });
}

function refreshDashboard() {
    updateSummary();
    updateBudget();
    renderTransactions();
}

transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const description = document.getElementById("description").value.trim();
    const amount = Number(document.getElementById("amount").value);
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value;
    const date = dateInput.value;

    if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
        alert("Please enter a description, a valid amount, and a date.");
        return;
    }

    const transaction = {
        id: Date.now(),
        description,
        amount,
        type,
        category,
        date
    };

    transactions.push(transaction);
    saveTransactions();

    transactionForm.reset();
    dateInput.value = getTodayString();

    refreshDashboard();
});

saveBudgetButton.addEventListener("click", () => {
    const enteredBudget = Number(budgetInput.value);

    if (
        budgetInput.value.trim() === "" ||
        !Number.isFinite(enteredBudget) ||
        enteredBudget <= 0
    ) {
        alert("Please enter a monthly budget greater than ₹0.");
        budgetInput.focus();
        return;
    }

    const previousBudget = monthlyBudget;
    monthlyBudget = enteredBudget;

    if (saveBudget()) {
        budgetInput.value = String(monthlyBudget);
        updateBudget();
        alert("Your monthly budget has been saved! ♡");
    } else {
        monthlyBudget = previousBudget;
        updateBudget();
    }
});

dateInput.value = getTodayString();

if (monthlyBudget > 0) {
    budgetInput.value = String(monthlyBudget);
}

refreshDashboard();