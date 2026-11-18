# My Budget App

A simple app to track your money: what comes in (income) and what goes out (expenses).

## Paycheck plan (paid every 2 weeks)

1. **Accounts tab:** add each bank account and how much is in it now.
2. **Bills tab:** add each bill, how often it comes, which account pays it, and the next due date.
3. **Payday tab:** on payday, type your paycheck amount. The app tells you how much
   to send to each account. What is left is free to spend.
4. Click **I moved the money ✔**. The accounts go up and the next payday moves 2 weeks later.
5. When you pay a bill, click **Paid** on the Bills tab. The money comes out of the account
   and the bill moves to its next due date.

**The maths:** each bill is saved a little every payday.
`bill amount × times per year ÷ 26 paydays`.
Example: rent $1300 a month → $1300 × 12 ÷ 26 = **$600 every payday**.

The Accounts tab warns you (⚠) if an account doesn't have enough for the bills due before your next payday.

## Pay in 4 (Afterpay, PayPal)

1. **Pay in 4 tab:** add what you bought, Afterpay or PayPal, the total price,
   the number of payments (usually 4) and the first payment date.
2. The app makes all the payments for you, 2 weeks apart.
   Example: $100 in 4 = $25 every 2 weeks.
3. At the top you see how much you **still owe** and what is **due in the next 2 weeks**.
4. Click a payment when it's paid ✔. Late ones show in red.
5. On payday, the app adds the Pay in 4 payments due in the next 2 weeks
   to what you send to that account.

## Tracker

1. Open `index.html` in your browser (just double-click it).
2. Type what you spent or earned, the amount, pick the type and category, then click **Add**.
3. At the top you see your **Balance**, **Income** and **Expenses**.
4. "Spending by category" shows where your money goes.
5. Click **✕** to delete an item.

Your data is saved in your browser, so it is still there when you come back.

## Files

- `index.html`: the page layout
- `style.css`: the colors and look (dark mode colors are at the top)
- `helpers.js`: saving data and the pop-up box
- `app.js`: the tracker logic (adding, deleting, totals)
- `plan.js`: the paycheck plan (accounts, bills, payday split)
- `installments.js`: Pay in 4 purchases (Afterpay, PayPal)
