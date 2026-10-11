-- =====================================================================
-- Employee Compensation Service - Database Schema
-- Compatible with standard SQL, SQLite, Azure SQL / SQL Server, PostgreSQL
-- =====================================================================

-- Department Table
CREATE TABLE IF NOT EXISTS Department (
    DepartmentID INTEGER PRIMARY KEY,
    DepartmentName VARCHAR(100) NOT NULL,
    Location VARCHAR(100) NULL
);

-- Employee Table
CREATE TABLE IF NOT EXISTS Employee (
    EmployeeID INTEGER PRIMARY KEY AUTOINCREMENT,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    DepartmentID INTEGER NOT NULL,
    Salary DECIMAL(12, 2) NOT NULL,
    Bonus DECIMAL(12, 2) NULL,
    HireDate DATE NULL,
    FOREIGN KEY (DepartmentID) REFERENCES Department(DepartmentID)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_department ON Employee(DepartmentID);
CREATE INDEX IF NOT EXISTS idx_employee_bonus ON Employee(Bonus);
CREATE INDEX IF NOT EXISTS idx_employee_salary ON Employee(Salary);
