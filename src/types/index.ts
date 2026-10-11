// =====================================================================
// Domain Models and Transfer Objects
// =====================================================================

export interface Department {
  DepartmentID: number;
  DepartmentName: string;
  Location: string | null;
}

export interface Employee {
  EmployeeID: number;
  FirstName: string;
  LastName: string;
  DepartmentID: number;
  Salary: number;
  Bonus: number | null;
  HireDate: string | null;
}

export interface EmployeeWithDepartment extends Employee {
  DepartmentName?: string;
  Location?: string | null;
  EffectiveBonus?: number;
  IsDefaultBonusApplied?: boolean;
}

export interface CreateEmployeeDto {
  FirstName: string;
  LastName: string;
  DepartmentID: number;
  Salary: number;
  Bonus?: number | null;
  HireDate?: string | null;
}

export interface UpdateEmployeeDto {
  FirstName?: string;
  LastName?: string;
  DepartmentID?: number;
  Salary?: number;
  Bonus?: number | null;
  HireDate?: string | null;
}

// Report DTOs for Part B
export interface TotalBonusReport {
  totalBonusPaid: number;
  totalEmployees: number;
  employeesWithBonus: number;
  employeesWithoutBonus: number;
}

export interface BonusPercentageItem {
  EmployeeID: number;
  FirstName: string;
  LastName: string;
  Salary: number;
  Bonus: number;
  BonusPercentage: number;
}

export interface HighBonusDepartmentItem {
  DepartmentID: number;
  DepartmentName: string;
  Location: string | null;
  AverageSalary: number;
  TotalBonusPaid: number;
  BonusSurplus: number;
}

export interface RankedEmployeeItem {
  BonusRank: number;
  EmployeeID: number;
  FirstName: string;
  LastName: string;
  DepartmentName: string;
  Salary: number;
  Bonus: number | null;
}

export interface HighestCompensationAnalysis {
  highestBaseSalary: {
    EmployeeID: number;
    FirstName: string;
    LastName: string;
    Salary: number;
    Bonus: number | null;
    TotalCompensation: number;
  };
  highestTotalCompensation: {
    EmployeeID: number;
    FirstName: string;
    LastName: string;
    Salary: number;
    Bonus: number | null;
    TotalCompensation: number;
  };
  isSamePerson: boolean;
  explanation: string;
}
