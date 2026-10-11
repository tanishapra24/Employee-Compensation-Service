import { DatabaseManager, getDatabase } from '../db/database';
import {
  TotalBonusReport,
  BonusPercentageItem,
  HighBonusDepartmentItem,
  RankedEmployeeItem,
  HighestCompensationAnalysis,
  EmployeeWithDepartment,
} from '../types';

export class ReportService {
  private db: DatabaseManager;

  constructor(db?: DatabaseManager) {
    this.db = db || getDatabase();
  }

  /**
   * Part B.1 - Total bonus paid across the whole company, treating employees with no bonus as 0.
   */
  public async getTotalBonus(): Promise<TotalBonusReport> {
    await this.db.initialize();

    const result = await this.db.get<{
      totalBonusPaid: number;
      totalEmployees: number;
      employeesWithBonus: number;
      employeesWithoutBonus: number;
    }>(`
      SELECT 
        COALESCE(SUM(Bonus), 0) AS totalBonusPaid,
        COUNT(*) AS totalEmployees,
        COUNT(Bonus) AS employeesWithBonus,
        SUM(CASE WHEN Bonus IS NULL THEN 1 ELSE 0 END) AS employeesWithoutBonus
      FROM Employee
    `);

    return {
      totalBonusPaid: result?.totalBonusPaid ?? 0,
      totalEmployees: result?.totalEmployees ?? 0,
      employeesWithBonus: result?.employeesWithBonus ?? 0,
      employeesWithoutBonus: result?.employeesWithoutBonus ?? 0,
    };
  }

  /**
   * Part B.2 - List of all employees who have never received a bonus (Bonus is NULL).
   */
  public async getEmployeesWithoutBonus(): Promise<EmployeeWithDepartment[]> {
    await this.db.initialize();

    const sql = `
      SELECT 
        e.EmployeeID, 
        e.FirstName, 
        e.LastName, 
        e.DepartmentID, 
        e.Salary, 
        e.Bonus, 
        e.HireDate,
        d.DepartmentName, 
        d.Location
      FROM Employee e
      LEFT JOIN Department d ON e.DepartmentID = d.DepartmentID
      WHERE e.Bonus IS NULL
      ORDER BY e.EmployeeID ASC
    `;

    return this.db.all<EmployeeWithDepartment>(sql);
  }

  /**
   * Part B.3 - For each employee who has a bonus, their bonus as a percentage of salary, rounded to 2 decimal places.
   */
  public async getBonusPercentages(): Promise<BonusPercentageItem[]> {
    await this.db.initialize();

    const sql = `
      SELECT 
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        e.Salary,
        e.Bonus,
        ROUND((e.Bonus * 100.0) / e.Salary, 2) AS BonusPercentage
      FROM Employee e
      WHERE e.Bonus IS NOT NULL
      ORDER BY BonusPercentage DESC, e.EmployeeID ASC
    `;

    return this.db.all<BonusPercentageItem>(sql);
  }

  /**
   * Part B.4 - Departments where the total bonus paid exceeds the department's average salary.
   */
  public async getDepartmentsWhereBonusExceedsAvgSalary(): Promise<HighBonusDepartmentItem[]> {
    await this.db.initialize();

    const sql = `
      SELECT 
        d.DepartmentID,
        d.DepartmentName,
        d.Location,
        ROUND(AVG(e.Salary), 2) AS AverageSalary,
        COALESCE(SUM(e.Bonus), 0) AS TotalBonusPaid,
        ROUND(COALESCE(SUM(e.Bonus), 0) - AVG(e.Salary), 2) AS BonusSurplus
      FROM Department d
      JOIN Employee e ON d.DepartmentID = e.DepartmentID
      GROUP BY d.DepartmentID, d.DepartmentName, d.Location
      HAVING COALESCE(SUM(e.Bonus), 0) > AVG(e.Salary)
      ORDER BY BonusSurplus DESC
    `;

    return this.db.all<HighBonusDepartmentItem>(sql);
  }

  /**
   * Part B.5 - Employees ranked by bonus amount, with employees who have no bonus ranked last rather than excluded.
   */
  public async getEmployeesRankedByBonus(): Promise<RankedEmployeeItem[]> {
    await this.db.initialize();

    const sql = `
      SELECT 
        RANK() OVER (
          ORDER BY 
            CASE WHEN e.Bonus IS NULL THEN 1 ELSE 0 END ASC,
            e.Bonus DESC
        ) AS BonusRank,
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        d.DepartmentName,
        e.Salary,
        e.Bonus
      FROM Employee e
      LEFT JOIN Department d ON e.DepartmentID = d.DepartmentID
      ORDER BY BonusRank ASC, e.EmployeeID ASC
    `;

    return this.db.all<RankedEmployeeItem>(sql);
  }

  /**
   * Part B.6 - The employee with highest base salary, and separately whether that same person
   * also has highest total compensation (salary + bonus).
   */
  public async getHighestCompensationAnalysis(): Promise<HighestCompensationAnalysis> {
    await this.db.initialize();

    // Query 1: Top earner by base salary
    const highestBase = await this.db.get<{
      EmployeeID: number;
      FirstName: string;
      LastName: string;
      Salary: number;
      Bonus: number | null;
      TotalCompensation: number;
    }>(`
      SELECT 
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        e.Salary,
        e.Bonus,
        (e.Salary + COALESCE(e.Bonus, 0)) AS TotalCompensation
      FROM Employee e
      ORDER BY e.Salary DESC, e.EmployeeID ASC
      LIMIT 1
    `);

    // Query 2: Top earner by total compensation (Salary + Bonus)
    const highestTotal = await this.db.get<{
      EmployeeID: number;
      FirstName: string;
      LastName: string;
      Salary: number;
      Bonus: number | null;
      TotalCompensation: number;
    }>(`
      SELECT 
        e.EmployeeID,
        e.FirstName,
        e.LastName,
        e.Salary,
        e.Bonus,
        (e.Salary + COALESCE(e.Bonus, 0)) AS TotalCompensation
      FROM Employee e
      ORDER BY (e.Salary + COALESCE(e.Bonus, 0)) DESC, e.EmployeeID ASC
      LIMIT 1
    `);

    if (!highestBase || !highestTotal) {
      throw new Error('No employee records found to evaluate compensation.');
    }

    const isSamePerson = highestBase.EmployeeID === highestTotal.EmployeeID;

    let explanation = '';
    if (isSamePerson) {
      explanation = `${highestBase.FirstName} ${highestBase.LastName} holds both the highest base salary ($${highestBase.Salary.toLocaleString()}) and the highest total compensation ($${highestTotal.TotalCompensation.toLocaleString()}).`;
    } else {
      explanation = `${highestBase.FirstName} ${highestBase.LastName} has the highest base salary ($${highestBase.Salary.toLocaleString()}), but ${highestTotal.FirstName} ${highestTotal.LastName} has the highest total compensation ($${highestTotal.TotalCompensation.toLocaleString()} including a $${(highestTotal.Bonus ?? 0).toLocaleString()} bonus).`;
    }

    return {
      highestBaseSalary: highestBase,
      highestTotalCompensation: highestTotal,
      isSamePerson,
      explanation,
    };
  }
}
