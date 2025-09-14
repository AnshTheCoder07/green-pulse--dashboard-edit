import React, { createContext, useContext, useState, useEffect } from 'react';

const DepartmentContext = createContext();

export const useDepartment = () => {
  const context = useContext(DepartmentContext);
  if (!context) {
    // Return fallback data instead of throwing error
    return {
      departments: [],
      loading: false,
      getDepartmentById: () => null,
      getDepartmentByCode: () => null,
      getDepartmentStats: () => ({ totalDepartments: 0, totalStudents: 0, totalFaculty: 0, totalEnergyCapacity: 0, totalCurrentConsumption: 0, averageEfficiency: 0 }),
      getEnergyConsumptionByDepartment: () => [],
      updateDepartmentConsumption: () => {},
      getTopEnergyConsumers: () => [],
      getMostEfficientDepartments: () => []
    };
  }
  return context;
};

export const DepartmentProvider = ({ children }) => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock departments data - in real app, this would come from backend
  const mockDepartments = [
    {
      id: 'dept_cs',
      name: 'Computer Science Dept',
      code: 'CS',
      building: 'CS Building',
      floorCount: 5,
      energyCapacity: 2000, // kWh per month
      currentConsumption: 1800,
      efficiency: 90,
      headOfDept: 'Dr. Sarah Johnson',
      studentCount: 1200,
      facultyCount: 45,
      color: '#4318FF'
    },
    {
      id: 'dept_eng',
      name: 'Engineering Dept',
      code: 'ENG',
      building: 'Engineering Complex',
      floorCount: 8,
      energyCapacity: 2500,
      currentConsumption: 2200,
      efficiency: 88,
      headOfDept: 'Prof. Michael Chen',
      studentCount: 1500,
      facultyCount: 60,
      color: '#6AD2FF'
    },
    {
      id: 'dept_med',
      name: 'Medical School',
      code: 'MED',
      building: 'Medical Center',
      floorCount: 6,
      energyCapacity: 2200,
      currentConsumption: 2000,
      efficiency: 91,
      headOfDept: 'Dr. Emily Rodriguez',
      studentCount: 800,
      facultyCount: 35,
      color: '#4CAF50'
    },
    {
      id: 'dept_business',
      name: 'Business School',
      code: 'BUS',
      building: 'Business Tower',
      floorCount: 4,
      energyCapacity: 1500,
      currentConsumption: 1500,
      efficiency: 100,
      headOfDept: 'Prof. David Kim',
      studentCount: 1000,
      facultyCount: 40,
      color: '#FF9800'
    },
    {
      id: 'dept_arts',
      name: 'Arts & Humanities',
      code: 'AH',
      building: 'Arts Building',
      floorCount: 3,
      energyCapacity: 1200,
      currentConsumption: 1200,
      efficiency: 100,
      headOfDept: 'Dr. Lisa Thompson',
      studentCount: 600,
      facultyCount: 25,
      color: '#9C27B0'
    },
    {
      id: 'dept_science',
      name: 'Science Lab Complex',
      code: 'SCI',
      building: 'Science Research Center',
      floorCount: 7,
      energyCapacity: 3000,
      currentConsumption: 2500,
      efficiency: 83,
      headOfDept: 'Prof. Robert Wilson',
      studentCount: 900,
      facultyCount: 50,
      color: '#F44336'
    },
    {
      id: 'dept_library',
      name: 'Library & Research Center',
      code: 'LIB',
      building: 'Central Library',
      floorCount: 4,
      energyCapacity: 1800,
      currentConsumption: 1800,
      efficiency: 100,
      headOfDept: 'Dr. Maria Garcia',
      studentCount: 0,
      facultyCount: 15,
      color: '#00BCD4'
    },
    {
      id: 'dept_dorm',
      name: 'Student Dormitories',
      code: 'DORM',
      building: 'Residence Halls',
      floorCount: 10,
      energyCapacity: 1600,
      currentConsumption: 1600,
      efficiency: 100,
      headOfDept: 'Ms. Jennifer Lee',
      studentCount: 2000,
      facultyCount: 0,
      color: '#795548'
    },
    {
      id: 'dept_admin',
      name: 'Administrative Building',
      code: 'ADMIN',
      building: 'Admin Tower',
      floorCount: 3,
      energyCapacity: 1000,
      currentConsumption: 1000,
      efficiency: 100,
      headOfDept: 'Mr. James Brown',
      studentCount: 0,
      facultyCount: 20,
      color: '#EFF4FB'
    },
    {
      id: 'dept_sports',
      name: 'Sports Complex',
      code: 'SPORT',
      building: 'Athletic Center',
      floorCount: 2,
      energyCapacity: 800,
      currentConsumption: 800,
      efficiency: 100,
      headOfDept: 'Coach Alex Martinez',
      studentCount: 0,
      facultyCount: 10,
      color: '#FF6B6B'
    }
  ];

  // Load departments data
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDepartments(mockDepartments);
      } catch (error) {
        console.error('Error loading departments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDepartments();
  }, []); // Empty dependency array - mockDepartments is static

  // Get department by ID
  const getDepartmentById = (departmentId) => {
    return departments.find(dept => dept.id === departmentId);
  };

  // Get department by code
  const getDepartmentByCode = (code) => {
    return departments.find(dept => dept.code === code);
  };

  // Get department statistics
  const getDepartmentStats = () => {
    const totalDepartments = departments.length;
    const totalStudents = departments.reduce((sum, dept) => sum + dept.studentCount, 0);
    const totalFaculty = departments.reduce((sum, dept) => sum + dept.facultyCount, 0);
    const totalEnergyCapacity = departments.reduce((sum, dept) => sum + dept.energyCapacity, 0);
    const totalCurrentConsumption = departments.reduce((sum, dept) => sum + dept.currentConsumption, 0);
    const averageEfficiency = departments.length > 0 
      ? departments.reduce((sum, dept) => sum + dept.efficiency, 0) / departments.length 
      : 0;

    return {
      totalDepartments,
      totalStudents,
      totalFaculty,
      totalEnergyCapacity,
      totalCurrentConsumption,
      averageEfficiency: Math.round(averageEfficiency)
    };
  };

  // Get energy consumption by department
  const getEnergyConsumptionByDepartment = () => {
    return departments.map(dept => ({
      name: dept.name,
      consumption: dept.currentConsumption,
      capacity: dept.energyCapacity,
      efficiency: dept.efficiency,
      color: dept.color
    }));
  };

  // Update department energy consumption
  const updateDepartmentConsumption = (departmentId, newConsumption) => {
    setDepartments(prevDepartments =>
      prevDepartments.map(dept =>
        dept.id === departmentId
          ? {
              ...dept,
              currentConsumption: newConsumption,
              efficiency: Math.round((newConsumption / dept.energyCapacity) * 100)
            }
          : dept
      )
    );
  };

  // Get top energy consuming departments
  const getTopEnergyConsumers = (limit = 5) => {
    return departments
      .sort((a, b) => b.currentConsumption - a.currentConsumption)
      .slice(0, limit);
  };

  // Get most efficient departments
  const getMostEfficientDepartments = (limit = 5) => {
    return departments
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, limit);
  };

  const value = {
    departments,
    loading,
    getDepartmentById,
    getDepartmentByCode,
    getDepartmentStats,
    getEnergyConsumptionByDepartment,
    updateDepartmentConsumption,
    getTopEnergyConsumers,
    getMostEfficientDepartments
  };

  return (
    <DepartmentContext.Provider value={value}>
      {children}
    </DepartmentContext.Provider>
  );
};
