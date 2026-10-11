import { DatabaseManager } from '../src/db/database';
import { EmployeeService, ValidationError, NotFoundError } from '../src/services/employeeService';
import { ReportService } from '../src/services/reportService';
import path from 'path';
import fs from 'fs';

// Helper assertion function
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${testName}`);
    if (details) console.error(`    Details: ${details}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('\n=============================================================');
  console.log(' Starting Automated Test Suite - Employee Compensation Service');
  console.log('=============================================================\n');

  // Use a dedicated clean test database
  const testDbPath = path.resolve(__dirname, '../../test_run.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new DatabaseManager(testDbPath);
  await db.initialize();

  const employeeService = new EmployeeService(db);
  const reportService = new ReportService(db);

  try {
    // -------------------------------------------------------------
    // PART A: CRUD Operations
    // -------------------------------------------------------------
    console.log('\x1b[36m[Part A] Data Access & CRUD Testing:\x1b[0m');

    // Test 1: Create employee with bonus
    const empWithBonus = await employeeService.createEmployee({
      FirstName: 'Marcus',
      LastName: 'Aurelius',
      DepartmentID: 1,
      Salary: 120000,
      Bonus: 18000,
      HireDate: '2024-01-15',
    });
    assert(
      empWithBonus.EmployeeID > 0 && empWithBonus.Bonus === 18000 && empWithBonus.FirstName === 'Marcus',
      'Part A.1 - Create employee with bonus awards correct bonus and ID'
    );

    // Test 2: Create employee without bonus (bonus is optional / unset)
    const empWithoutBonus = await employeeService.createEmployee({
      FirstName: 'Cleopatra',
      LastName: 'Philopator',
      DepartmentID: 3,
      Salary: 95000,
      HireDate: '2024-02-01',
    });
    assert(
      empWithoutBonus.EmployeeID > 0 && empWithoutBonus.Bonus === null,
      'Part A.1 - Create employee with unset bonus stores Bonus as NULL'
    );

    // Test 3: Validation failure for negative salary
    let caughtValidationError = false;
    try {
      await employeeService.createEmployee({
        FirstName: 'Invalid',
        LastName: 'Salary',
        DepartmentID: 1,
        Salary: -500,
      });
    } catch (err) {
      if (err instanceof ValidationError) caughtValidationError = true;
    }
    assert(caughtValidationError, 'Part A.1 - Rejects invalid employee with negative salary (400 validation)');

    // Test 4: Validation failure for invalid department
    let caughtDeptError = false;
    try {
      await employeeService.createEmployee({
        FirstName: 'Ghost',
        LastName: 'Employee',
        DepartmentID: 9999, // non-existent
        Salary: 80000,
      });
    } catch (err) {
      if (err instanceof ValidationError) caughtDeptError = true;
    }
    assert(caughtDeptError, 'Part A.1 - Rejects employee with non-existent DepartmentID');

    // Test 5: Retrieve single employee by ID
    const retrieved = await employeeService.getEmployeeById(empWithBonus.EmployeeID);
    assert(
      retrieved !== null && retrieved.LastName === 'Aurelius' && retrieved.DepartmentName === 'Engineering',
      'Part A.2 - Retrieve single employee by ID joins DepartmentName correctly'
    );

    // Test 6: Retrieve non-existent employee returns null
    const notFoundEmp = await employeeService.getEmployeeById(88888);
    assert(notFoundEmp === null, 'Part A.2 - Non-existent employee returns null (maps to 404)');

    // Test 7: List all employees
    const allEmployees = await employeeService.listEmployees();
    assert(allEmployees.length >= 11, `Part A.3 - List employees returns all records (found ${allEmployees.length})`);

    // Test 8: Filter employees by department
    const dept1Employees = await employeeService.listEmployees(1);
    const allAreDept1 = dept1Employees.every((e) => e.DepartmentID === 1);
    assert(allAreDept1 && dept1Employees.length > 0, 'Part A.3 - Filter employees by department correctly isolates dept');

    // Test 9: Update an existing employee (updating bonus and salary)
    const updatedEmp = await employeeService.updateEmployee(empWithoutBonus.EmployeeID, {
      Bonus: 12000,
      Salary: 105000,
    });
    assert(
      updatedEmp.Bonus === 12000 && updatedEmp.Salary === 105000,
      'Part A.4 - Update employee updates bonus from null to value and changes salary'
    );

    // Test 10: Delete an employee
    const deleteResult = await employeeService.deleteEmployee(empWithoutBonus.EmployeeID);
    const postDeleteCheck = await employeeService.getEmployeeById(empWithoutBonus.EmployeeID);
    assert(
      deleteResult === true && postDeleteCheck === null,
      'Part A.5 - Delete employee removes record from database'
    );

    // -------------------------------------------------------------
    // PART B: Compensation Reporting
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[Part B] Compensation Reporting & SQL Analytics:\x1b[0m');

    // Test 11: Part B.1 - Total bonus paid across whole company
    const totalBonusReport = await reportService.getTotalBonus();
    assert(
      totalBonusReport.totalBonusPaid > 0 && typeof totalBonusReport.totalBonusPaid === 'number',
      `Part B.1 - Total bonus paid across company calculated (Total: $${totalBonusReport.totalBonusPaid.toLocaleString()})`
    );

    // Test 12: Part B.2 - Employees who have never received a bonus
    const noBonusList = await reportService.getEmployeesWithoutBonus();
    const allHaveNullBonus = noBonusList.every((e) => e.Bonus === null);
    assert(
      allHaveNullBonus && noBonusList.length > 0,
      `Part B.2 - Returns all employees with NULL bonus (found ${noBonusList.length} staff without bonus)`
    );

    // Test 13: Part B.3 - Bonus as percentage of salary
    const bonusPercentages = await reportService.getBonusPercentages();
    const percentagesValid = bonusPercentages.every(
      (b) => b.BonusPercentage === Math.round(((b.Bonus * 100.0) / b.Salary) * 100) / 100
    );
    assert(
      percentagesValid && bonusPercentages.length > 0,
      'Part B.3 - Bonus percentage accurately calculated and rounded to 2 decimal places'
    );

    // Test 14: Part B.4 - Departments where total bonus exceeds average salary
    const highBonusDepts = await reportService.getDepartmentsWhereBonusExceedsAvgSalary();
    const salesDeptFound = highBonusDepts.some(
      (d) => d.DepartmentName === 'Sales' && d.TotalBonusPaid > d.AverageSalary
    );
    assert(
      salesDeptFound,
      `Part B.4 - Identifies departments where total bonus exceeds avg salary (Sales: Total Bonus $${highBonusDepts[0]?.TotalBonusPaid.toLocaleString()} > Avg Salary $${highBonusDepts[0]?.AverageSalary.toLocaleString()})`
    );

    // Test 15: Part B.5 - Employees ranked by bonus amount (NULL ranked last)
    const rankedList = await reportService.getEmployeesRankedByBonus();
    const firstRank = rankedList[0];
    const lastRank = rankedList[rankedList.length - 1];
    assert(
      firstRank.Bonus !== null &&
        firstRank.BonusRank === 1 &&
        lastRank.Bonus === null &&
        lastRank.BonusRank > 1,
      `Part B.5 - Ranks bonus descending with NULL bonus placed last (Top: ${firstRank.FirstName} with $${firstRank.Bonus}, Last: ${lastRank.FirstName} with NULL)`
    );

    // Test 16: Part B.6 - Highest base salary vs highest total comp
    const compAnalysis = await reportService.getHighestCompensationAnalysis();
    assert(
      compAnalysis.highestBaseSalary.FirstName === 'Sophia' &&
        compAnalysis.highestTotalCompensation.FirstName === 'Isabella' &&
        compAnalysis.isSamePerson === false,
      `Part B.6 - Highest base salary (${compAnalysis.highestBaseSalary.FirstName}: $${compAnalysis.highestBaseSalary.Salary}) vs Highest total comp (${compAnalysis.highestTotalCompensation.FirstName}: $${compAnalysis.highestTotalCompensation.TotalCompensation}) evaluated correctly`
    );

    // -------------------------------------------------------------
    // PART C: Optional Default Bonus (5%)
    // -------------------------------------------------------------
    console.log('\n\x1b[36m[Part C] Optional 5% Default Bonus Calculation:\x1b[0m');

    // Test 17: Apply 5% default bonus to employee with NULL bonus
    // Sophia Martinez: Salary 155000, Bonus NULL -> 5% = 7750
    const sophiaWithDefault = await employeeService.getEmployeeById(1, true);
    assert(
      sophiaWithDefault?.Bonus === null &&
        sophiaWithDefault?.EffectiveBonus === 7750 &&
        sophiaWithDefault?.IsDefaultBonusApplied === true,
      'Part C - Optional default 5% bonus projected at read-time without mutating underlying DB column'
    );

    // Test 18: Employee with existing bonus preserves actual bonus
    // Liam Chen: Salary 130000, Bonus 15000 -> preserved
    const liamWithDefault = await employeeService.getEmployeeById(2, true);
    assert(
      liamWithDefault?.Bonus === 15000 &&
        liamWithDefault?.EffectiveBonus === 15000 &&
        liamWithDefault?.IsDefaultBonusApplied === false,
      'Part C - Employee with actual bonus preserves original awarded bonus'
    );

    console.log('\n=============================================================');
    console.log(` Test Suite Completed: ${passedTests} passed, ${failedTests} failed.`);
    console.log('=============================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } finally {
    await db.close();
    // Clean up test db file
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
