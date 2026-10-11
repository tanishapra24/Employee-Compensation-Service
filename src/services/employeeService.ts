import { DatabaseManager, getDatabase } from '../db/database';
import { CreateEmployeeDto, UpdateEmployeeDto, Employee, EmployeeWithDepartment } from '../types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class EmployeeService {
  private db: DatabaseManager;

  constructor(db?: DatabaseManager) {
    this.db = db || getDatabase();
  }

  /**
   * Helper to format employee with optional default bonus logic (Part C)
   */
  private applyDefaultBonusTransformation(
    employee: EmployeeWithDepartment,
    applyDefaultBonus: boolean
  ): EmployeeWithDepartment {
    if (applyDefaultBonus && (employee.Bonus === null || employee.Bonus === undefined)) {
      const calculatedBonus = Math.round(employee.Salary * 0.05 * 100) / 100;
      return {
        ...employee,
        EffectiveBonus: calculatedBonus,
        IsDefaultBonusApplied: true,
      };
    }
    return {
      ...employee,
      EffectiveBonus: employee.Bonus ?? 0,
      IsDefaultBonusApplied: false,
    };
  }

  /**
   * Part A.1 - Create a new employee
   * Bonus is optional and may be left unset (NULL).
   */
  public async createEmployee(dto: CreateEmployeeDto): Promise<Employee> {
    await this.db.initialize();

    // Validations
    if (!dto.FirstName || typeof dto.FirstName !== 'string' || dto.FirstName.trim() === '') {
      throw new ValidationError('FirstName is required and cannot be empty.');
    }
    if (!dto.LastName || typeof dto.LastName !== 'string' || dto.LastName.trim() === '') {
      throw new ValidationError('LastName is required and cannot be empty.');
    }
    if (dto.DepartmentID === undefined || dto.DepartmentID === null || isNaN(Number(dto.DepartmentID))) {
      throw new ValidationError('DepartmentID is required and must be an integer.');
    }
    if (dto.Salary === undefined || dto.Salary === null || isNaN(Number(dto.Salary)) || Number(dto.Salary) <= 0) {
      throw new ValidationError('Salary is required and must be a positive number.');
    }

    // Verify Department exists
    const department = await this.db.get<{ DepartmentID: number }>(
      'SELECT DepartmentID FROM Department WHERE DepartmentID = ?',
      [dto.DepartmentID]
    );
    if (!department) {
      throw new ValidationError(`Department with ID ${dto.DepartmentID} does not exist.`);
    }

    // Bonus validation (optional)
    let bonusValue: number | null = null;
    if (dto.Bonus !== undefined && dto.Bonus !== null) {
      const parsedBonus = Number(dto.Bonus);
      if (isNaN(parsedBonus) || parsedBonus < 0) {
        throw new ValidationError('Bonus must be a non-negative number if specified.');
      }
      bonusValue = Math.round(parsedBonus * 100) / 100;
    }

    const hireDate = dto.HireDate ? dto.HireDate : new Date().toISOString().split('T')[0];

    const result = await this.db.run(
      `INSERT INTO Employee (FirstName, LastName, DepartmentID, Salary, Bonus, HireDate)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dto.FirstName.trim(),
        dto.LastName.trim(),
        Number(dto.DepartmentID),
        Math.round(Number(dto.Salary) * 100) / 100,
        bonusValue,
        hireDate,
      ]
    );

    const created = await this.getEmployeeById(result.lastID);
    if (!created) {
      throw new Error('Failed to retrieve newly created employee.');
    }
    return created;
  }

  /**
   * Part A.2 - Retrieve a single employee by their ID
   */
  public async getEmployeeById(id: number, applyDefaultBonus = false): Promise<EmployeeWithDepartment | null> {
    await this.db.initialize();

    const employee = await this.db.get<EmployeeWithDepartment>(
      `SELECT e.EmployeeID, e.FirstName, e.LastName, e.DepartmentID, e.Salary, e.Bonus, e.HireDate,
              d.DepartmentName, d.Location
       FROM Employee e
       LEFT JOIN Department d ON e.DepartmentID = d.DepartmentID
       WHERE e.EmployeeID = ?`,
      [id]
    );

    if (!employee) return null;
    return this.applyDefaultBonusTransformation(employee, applyDefaultBonus);
  }

  /**
   * Part A.3 - Retrieve a list of employees, with optional filtering by department
   */
  public async listEmployees(departmentId?: number, applyDefaultBonus = false): Promise<EmployeeWithDepartment[]> {
    await this.db.initialize();

    let sql = `
      SELECT e.EmployeeID, e.FirstName, e.LastName, e.DepartmentID, e.Salary, e.Bonus, e.HireDate,
             d.DepartmentName, d.Location
      FROM Employee e
      LEFT JOIN Department d ON e.DepartmentID = d.DepartmentID
    `;
    const params: any[] = [];

    if (departmentId !== undefined && departmentId !== null && !isNaN(departmentId)) {
      sql += ' WHERE e.DepartmentID = ?';
      params.push(departmentId);
    }

    sql += ' ORDER BY e.EmployeeID ASC';

    const employees = await this.db.all<EmployeeWithDepartment>(sql, params);
    return employees.map((emp) => this.applyDefaultBonusTransformation(emp, applyDefaultBonus));
  }

  /**
   * Part A.4 - Update an existing employee (e.g., updating bonus, salary, or details)
   */
  public async updateEmployee(id: number, dto: UpdateEmployeeDto): Promise<EmployeeWithDepartment> {
    await this.db.initialize();

    const existing = await this.getEmployeeById(id);
    if (!existing) {
      throw new NotFoundError(`Employee with ID ${id} not found.`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (dto.FirstName !== undefined) {
      if (typeof dto.FirstName !== 'string' || dto.FirstName.trim() === '') {
        throw new ValidationError('FirstName cannot be empty.');
      }
      updates.push('FirstName = ?');
      params.push(dto.FirstName.trim());
    }

    if (dto.LastName !== undefined) {
      if (typeof dto.LastName !== 'string' || dto.LastName.trim() === '') {
        throw new ValidationError('LastName cannot be empty.');
      }
      updates.push('LastName = ?');
      params.push(dto.LastName.trim());
    }

    if (dto.DepartmentID !== undefined) {
      const deptId = Number(dto.DepartmentID);
      const department = await this.db.get<{ DepartmentID: number }>(
        'SELECT DepartmentID FROM Department WHERE DepartmentID = ?',
        [deptId]
      );
      if (!department) {
        throw new ValidationError(`Department with ID ${deptId} does not exist.`);
      }
      updates.push('DepartmentID = ?');
      params.push(deptId);
    }

    if (dto.Salary !== undefined) {
      const salary = Number(dto.Salary);
      if (isNaN(salary) || salary <= 0) {
        throw new ValidationError('Salary must be a positive number.');
      }
      updates.push('Salary = ?');
      params.push(Math.round(salary * 100) / 100);
    }

    if (dto.Bonus !== undefined) {
      if (dto.Bonus === null) {
        updates.push('Bonus = NULL');
      } else {
        const bonus = Number(dto.Bonus);
        if (isNaN(bonus) || bonus < 0) {
          throw new ValidationError('Bonus must be a non-negative number or null.');
        }
        updates.push('Bonus = ?');
        params.push(Math.round(bonus * 100) / 100);
      }
    }

    if (dto.HireDate !== undefined) {
      updates.push('HireDate = ?');
      params.push(dto.HireDate);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);
    const sql = `UPDATE Employee SET ${updates.join(', ')} WHERE EmployeeID = ?`;
    await this.db.run(sql, params);

    const updated = await this.getEmployeeById(id);
    return updated!;
  }

  /**
   * Part A.5 - Delete an employee
   */
  public async deleteEmployee(id: number): Promise<boolean> {
    await this.db.initialize();

    const existing = await this.getEmployeeById(id);
    if (!existing) {
      throw new NotFoundError(`Employee with ID ${id} not found.`);
    }

    const result = await this.db.run('DELETE FROM Employee WHERE EmployeeID = ?', [id]);
    return result.changes > 0;
  }
}
