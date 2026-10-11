-- =====================================================================
-- Employee Compensation Service - Seed Data
-- =====================================================================

-- Insert Departments
INSERT INTO Department (DepartmentID, DepartmentName, Location) VALUES
(1, 'Engineering', 'Seattle, WA'),
(2, 'Sales', 'New York, NY'),
(3, 'Human Resources', 'Chicago, IL'),
(4, 'Product', 'San Francisco, CA');

-- Insert Employees
-- Department 1 (Engineering)
INSERT INTO Employee (FirstName, LastName, DepartmentID, Salary, Bonus, HireDate) VALUES
('Sophia', 'Martinez', 1, 155000.00, NULL, '2020-01-15'),
('Liam', 'Chen', 1, 130000.00, 15000.00, '2021-03-15'),
('Noah', 'Patel', 1, 110000.00, NULL, '2023-01-10');

-- Department 2 (Sales) - Bonus exceeds average salary
INSERT INTO Employee (FirstName, LastName, DepartmentID, Salary, Bonus, HireDate) VALUES
('Isabella', 'Rossi', 2, 140000.00, 45000.00, '2019-06-01'),
('Lucas', 'Silva', 2, 95000.00, 55000.00, '2020-08-20'),
('Emma', 'Watson', 2, 85000.00, 35000.00, '2022-04-11');

-- Department 3 (Human Resources) - All NULL bonuses
INSERT INTO Employee (FirstName, LastName, DepartmentID, Salary, Bonus, HireDate) VALUES
('Olivia', 'Kim', 3, 75000.00, NULL, '2022-11-05'),
('Ethan', 'Wright', 3, 72000.00, NULL, '2023-05-18');

-- Department 4 (Product)
INSERT INTO Employee (FirstName, LastName, DepartmentID, Salary, Bonus, HireDate) VALUES
('Ava', 'Johnson', 4, 125000.00, 12500.00, '2021-09-01');
