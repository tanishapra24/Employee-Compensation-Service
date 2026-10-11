# Employee Compensation & Analytics Service

An enterprise-ready, serverless backend service built with **Azure Functions** (HTTP triggers, v4 programming model) and a relational SQL database. It provides full data access (CRUD) for employee and department records, along with an analytics engine addressing bonus compensation scenarios.

---

## Table of Contents
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Quick Start Guide](#quick-start-guide)
- [Project Structure](#project-structure)
- [Database Schema & Seed Data](#database-schema--seed-data)
- [API Reference](#api-reference)
  - [Part A: Employee CRUD Endpoints](#part-a-employee-crud-endpoints)
  - [Part B: Compensation Reporting Endpoints](#part-b-compensation-reporting-endpoints)
- [Design Decisions & Assumptions](#design-decisions--assumptions)
  - [Handling `NULL` Bonuses](#handling-null-bonuses)
  - [Production Readiness (Part C)](#production-readiness-part-c)
  - [Optional 5% Default Bonus: Architectural Justification](#optional-5-default-bonus-architectural-justification)
- [Automated Testing](#automated-testing)

---

## Architecture & Tech Stack

- **Runtime**: Node.js 18+ / 20+ / 22+ with TypeScript.
- **Serverless Framework**: `@azure/functions` (v4 Programming Model).
- **Database Engine**: Relational SQL (SQLite configured out-of-the-box for instant, zero-dependency local runs and testing; fully compatible with Azure SQL / SQL Server / PostgreSQL).
- **Security & Configuration**: Database connections and environment variables loaded securely via `local.settings.json` (gitignored) and Azure App Settings.
- **Portability**: Includes both Azure Functions Core Tools compatibility (`npm start`) and a standalone zero-dependency dev server (`npm run dev`) so evaluators can run and test without needing global CLI tools.

---

## Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Automated Test Suite (18 End-to-End Tests)
```bash
npm test
```
*Runs the full test suite against a fresh, isolated database covering all CRUD paths, SQL analytics, edge cases, input validation, and bonus logic.*

### 3. Run Locally

#### Option A: Zero-Setup Interactive Dev Server & UI (Recommended)
```bash
npm run dev
```
- Open **`http://localhost:7071`** in your browser to view the **Interactive HR Compensation Dashboard** (live CRUD forms, ranking leaderboard, executive showdown, and 5% bonus simulator).
- REST API endpoints are directly accessible at **`http://localhost:7071/api`**.

#### Option B: Azure Functions Core Tools (Standard Azure CLI)
```bash
npm start
```
Starts the Azure Functions host runtime using `func start`.

---

## Project Structure

```text
├── sql/
│   ├── schema.sql           # DDL: Department & Employee tables with indexes
│   └── seed.sql             # Realistic seed dataset covering all Part B edge cases
├── src/
│   ├── db/
│   │   └── database.ts      # Database connection manager with automatic schema init
│   ├── functions/
│   │   ├── employees.ts     # Azure Functions HTTP triggers for CRUD (Part A)
│   │   └── reports.ts       # Azure Functions HTTP triggers for Analytics (Part B)
│   ├── services/
│   │   ├── employeeService.ts # Business logic, input validation, and CRUD operations
│   │   └── reportService.ts   # SQL queries for compensation analysis
│   ├── types/
│   │   └── index.ts         # TypeScript domain models and response DTOs
│   ├── devServer.ts         # Standalone HTTP server for instant reviewer evaluation
│   └── index.ts             # Azure Functions module registration
├── tests/
│   ├── test-runner.ts       # Automated test suite (18 assertions)
│   └── http-verify.js       # Live HTTP fetch verification script
├── host.json                # Azure Functions host configuration
├── local.settings.json      # Local environment secrets (gitignored)
├── local.settings.example.json # Example configuration template
├── tsconfig.json            # TypeScript compiler configuration
├── package.json             # NPM scripts and dependencies
└── README.md                # Documentation & Architecture decisions
```

---

## Database Schema & Seed Data

### Schema Definition (`sql/schema.sql`)
- **`Department`**:
  - `DepartmentID` (INTEGER PRIMARY KEY)
  - `DepartmentName` (VARCHAR(100) NOT NULL)
  - `Location` (VARCHAR(100) NULL)
- **`Employee`**:
  - `EmployeeID` (INTEGER PRIMARY KEY AUTOINCREMENT)
  - `FirstName` (VARCHAR(50) NOT NULL)
  - `LastName` (VARCHAR(50) NOT NULL)
  - `DepartmentID` (INTEGER NOT NULL, FK → `Department(DepartmentID)`)
  - `Salary` (DECIMAL(12,2) NOT NULL)
  - `Bonus` (DECIMAL(12,2) NULL) — *`NULL` explicitly signifies no bonus*
  - `HireDate` (DATE NULL)

### Realistic Seed Data (`sql/seed.sql`)
The seed dataset contains 9 employees across 4 departments engineered to test all scenarios:
- **Employees with no bonus (`NULL`)**: Sophia Martinez, Noah Patel, Olivia Kim, Ethan Wright.
- **Employees with bonuses**: Lucas Silva ($55k), Isabella Rossi ($45k), Emma Watson ($35k), Liam Chen ($15k), Ava Johnson ($12.5k).
- **Department where bonus exceeds average salary**: Sales (Total Bonus $135k > Average Salary $106.7k).
- **Highest Salary vs Highest Total Comp**:
  - Highest Base Salary: Sophia Martinez ($155,000, 0 bonus).
  - Highest Total Comp: Isabella Rossi ($185,000 = $140,000 salary + $45,000 bonus).
  - Demonstrates that the highest base earner does **not** have the highest total compensation.

---

## API Reference

### Part A: Employee CRUD Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/employees` | Create a new employee (Bonus optional) | `201 Created`, `400 Bad Request` |
| `GET` | `/api/employees` | List employees (optional `?departmentId=1`) | `200 OK` |
| `GET` | `/api/employees/{id}` | Retrieve single employee by ID | `200 OK`, `404 Not Found` |
| `PUT` | `/api/employees/{id}` | Update existing employee (e.g. bonus, salary) | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `DELETE` | `/api/employees/{id}` | Delete employee record | `200 OK`, `404 Not Found` |

#### Sample: Create Employee
```http
POST /api/employees
Content-Type: application/json

{
  "FirstName": "Elena",
  "LastName": "Rostova",
  "DepartmentID": 1,
  "Salary": 125000.00,
  "Bonus": 15000.00
}
```
*Note: The `Bonus` field is optional. If omitted or `null`, it is stored as `NULL`.*

---

### Part B: Compensation Reporting Endpoints

#### 1. Total Bonus Paid Across Company
`GET /api/reports/total-bonus`
- **SQL Logic**: Uses `COALESCE(SUM(Bonus), 0)` to guarantee that `NULL` bonuses contribute `0` rather than propagating `NULL`.
- **Response**:
```json
{
  "success": true,
  "data": {
    "totalBonusPaid": 162500,
    "totalEmployees": 9,
    "employeesWithBonus": 5,
    "employeesWithoutBonus": 4
  }
}
```

#### 2. Employees Who Have Never Received a Bonus
`GET /api/reports/no-bonus-employees`
- **SQL Logic**: `WHERE Bonus IS NULL`. Returns staff who have never been awarded a bonus.
- **Response**: List of 4 employees (Sophia, Noah, Olivia, Ethan).

#### 3. Bonus as Percentage of Salary
`GET /api/reports/bonus-percentage`
- **SQL Logic**: `ROUND((e.Bonus * 100.0) / e.Salary, 2) AS BonusPercentage WHERE e.Bonus IS NOT NULL`.
- **Response**:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "EmployeeID": 5,
      "FirstName": "Lucas",
      "LastName": "Silva",
      "Salary": 95000,
      "Bonus": 55000,
      "BonusPercentage": 57.89
    },
    ...
  ]
}
```

#### 4. Departments Where Bonus Exceeds Average Salary
`GET /api/reports/departments-high-bonus`
- **SQL Logic**:
```sql
SELECT d.DepartmentID, d.DepartmentName, ROUND(AVG(e.Salary), 2) AS AverageSalary,
       COALESCE(SUM(e.Bonus), 0) AS TotalBonusPaid
FROM Department d
JOIN Employee e ON d.DepartmentID = e.DepartmentID
GROUP BY d.DepartmentID, d.DepartmentName
HAVING COALESCE(SUM(e.Bonus), 0) > AVG(e.Salary)
```
- **Response**: Sales department (Total Bonus: $135,000 > Average Salary: $106,666.67).

#### 5. Employees Ranked by Bonus (NULL Bonuses Ranked Last)
`GET /api/reports/ranked-by-bonus`
- **SQL Logic**: Uses window function `RANK()` with a conditional order clause:
```sql
ORDER BY CASE WHEN Bonus IS NULL THEN 1 ELSE 0 END ASC, Bonus DESC
```
- **Response**: Employees with bonuses ranked 1 through 5 in descending order, with all employees with `NULL` bonuses grouped together at the bottom rather than excluded.

#### 6. Highest Base Salary vs Highest Total Compensation
`GET /api/reports/highest-compensation`
- **SQL Logic**: Queries the top earner by `Salary DESC`, separately queries the top earner by `(Salary + COALESCE(Bonus, 0)) DESC`, and checks whether both IDs match.
- **Response**:
```json
{
  "success": true,
  "data": {
    "highestBaseSalary": {
      "EmployeeID": 1,
      "FirstName": "Sophia",
      "LastName": "Martinez",
      "Salary": 155000,
      "Bonus": null,
      "TotalCompensation": 155000
    },
    "highestTotalCompensation": {
      "EmployeeID": 4,
      "FirstName": "Isabella",
      "LastName": "Rossi",
      "Salary": 140000,
      "Bonus": 45000,
      "TotalCompensation": 185000
    },
    "isSamePerson": false,
    "explanation": "Sophia Martinez has the highest base salary ($155,000), but Isabella Rossi has the highest total compensation ($185,000 including a $45,000 bonus)."
  }
}
```

---

## Design Decisions & Assumptions

### Handling `NULL` Bonuses
1. In SQL, arithmetic operations involving `NULL` (e.g. `1000 + NULL`) yield `NULL`. We consistently wrap bonus aggregations and total compensation sums with `COALESCE(Bonus, 0)` to guarantee mathematical correctness.
2. In sorting (`RANK()`), SQL standards treat `NULL` as either higher than all values or lower than all values depending on engine dialect. Using `ORDER BY CASE WHEN Bonus IS NULL THEN 1 ELSE 0 END ASC, Bonus DESC` ensures portable, deterministic behavior across SQLite, SQL Server, and PostgreSQL.

### Production Readiness (Part C)
- **Zero Hardcoded Secrets**: DB connection strings are sourced from environment variables (`DATABASE_PATH` or `SQL_CONNECTION_STRING`), stored in `local.settings.json` during development and Azure App Settings in cloud environments.
- **Graceful Error Handling**:
  - `ValidationError` → HTTP `400 Bad Request` with descriptive message.
  - `NotFoundError` → HTTP `404 Not Found`.
  - Malformed JSON payloads → HTTP `400 Bad Request`.
  - Unhandled exceptions → HTTP `500 Internal Server Error` without exposing database internals or stack traces.

---

### Optional 5% Default Bonus: Architectural Justification

> **Assignment Prompt Question**:  
> *"Apply a default bonus equal to 5% of salary to employees who don't have one. Decide whether this is calculated when reading the data or written into the table, and be ready to explain your choice."*

#### Architectural Decision: **Calculate at Read-Time (Dynamic Projection)**

We intentionally selected **read-time projection** over writing directly into the database. Here is the rationale:

| Dimension | Read-Time Projection (Chosen) | Write-Time Mutation (Alternative) |
|---|---|---|
| **Data Integrity & Auditability** | **High**: Preserves historical truth. A query can always distinguish between an employee who earned a merit-based 5% bonus and one who received an HR default policy fallback. | **Low**: Overwrites `NULL` with a calculated number, permanently obscuring whether the employee was actually awarded a bonus. |
| **Policy Flexibility** | **High**: If HR updates the default bonus policy from 5% to 7% next quarter, zero database migrations or data backfills are required. | **Low**: Requires expensive and risky `UPDATE` migrations across the entire historical database table. |
| **Salary Adjustments** | **Automatic**: If an employee's base salary changes, their default 5% bonus adjusts automatically without requiring triggers or synchronization jobs. | **Fragile**: Requires database triggers or application lifecycle hooks to keep bonus synchronized with salary changes. |
| **Performance Impact** | **Negligible**: Evaluating `Salary * 0.05` takes nanoseconds per row. | Slight query index advantage, but offset by high maintenance overhead. |

#### Implementation:
- Clients can request the projection by passing `?applyDefaultBonus=true` on employee endpoints (or by enabling the `APPLY_DEFAULT_BONUS=true` environment setting).
- The returned payload populates `EffectiveBonus` ($5% \times \text{Salary}$) and marks `IsDefaultBonusApplied: true`, while leaving the underlying `Bonus` column as `null` to maintain data provenance.

---

## Automated Testing

The service includes an automated test runner (`tests/test-runner.ts`) with **18 passing assertions**:
```bash
npm test
```

### Coverage Highlights:
- **Part A**: Create with bonus, create with `NULL` bonus, negative salary validation, foreign key check, retrieve by ID, list all, department filter, update bonus & salary, delete employee, 404 verification.
- **Part B**: Company total bonus calculation, `NULL` bonus isolation, salary percentage rounding to 2 decimal places, department surplus filtering, bonus ranking with `NULL` placed last, highest salary vs highest total comp analysis.
- **Part C**: Read-time 5% default bonus projection test without database mutation.
