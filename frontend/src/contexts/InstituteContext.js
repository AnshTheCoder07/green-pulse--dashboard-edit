import React, { createContext, useContext, useState, useEffect } from 'react';

const InstituteContext = createContext();

export const useInstitute = () => {
  const context = useContext(InstituteContext);
  if (!context) {
    throw new Error('useInstitute must be used within an InstituteProvider');
  }
  return context;
};

export const InstituteProvider = ({ children }) => {
  const [currentInstitute, setCurrentInstitute] = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock institutes data - in real app, this would come from backend
  const mockInstitutes = [
    {
      id: 'inst_001',
      name: 'Green University',
      campusId: 'GU_MAIN',
      location: 'Main Campus',
      address: '123 Green Street, Eco City',
      established: '1995',
      totalBuildings: 12,
      totalStudents: 15000,
      energyCapacity: 50000, // kWh per month
      carbonBudget: 10000, // ENTO per month
      contact: {
        email: 'admin@greenuniversity.edu',
        phone: '+1-555-0123'
      }
    },
    {
      id: 'inst_002',
      name: 'EcoTech Institute',
      campusId: 'ETI_NORTH',
      location: 'North Campus',
      address: '456 Sustainable Ave, Green Valley',
      established: '2005',
      totalBuildings: 8,
      totalStudents: 8500,
      energyCapacity: 35000,
      carbonBudget: 7500,
      contact: {
        email: 'info@ecotech.edu',
        phone: '+1-555-0456'
      }
    },
    {
      id: 'inst_003',
      name: 'Climate College',
      campusId: 'CC_SOUTH',
      location: 'South Campus',
      address: '789 Renewable Blvd, Clean City',
      established: '2010',
      totalBuildings: 6,
      totalStudents: 6200,
      energyCapacity: 28000,
      carbonBudget: 6000,
      contact: {
        email: 'contact@climatecollege.edu',
        phone: '+1-555-0789'
      }
    },
    {
      id: 'inst_004',
      name: 'Environmental Academy',
      campusId: 'EA_EAST',
      location: 'East Campus',
      address: '321 Conservation Dr, Nature Town',
      established: '1988',
      totalBuildings: 15,
      totalStudents: 22000,
      energyCapacity: 65000,
      carbonBudget: 12000,
      contact: {
        email: 'admin@envacademy.edu',
        phone: '+1-555-0321'
      }
    }
  ];

  // Load institutes data
  useEffect(() => {
    const loadInstitutes = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setInstitutes(mockInstitutes);
        
        // Load current institute from localStorage
        const savedInstitute = localStorage.getItem('greenpulse_current_institute');
        if (savedInstitute) {
          const institute = mockInstitutes.find(inst => inst.id === savedInstitute);
          if (institute) {
            setCurrentInstitute(institute);
          }
        }
      } catch (error) {
        console.error('Error loading institutes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInstitutes();
  }, []); // Empty dependency array is correct - mockInstitutes is static

  // Set current institute
  const selectInstitute = (instituteId) => {
    const institute = institutes.find(inst => inst.id === instituteId);
    if (institute) {
      setCurrentInstitute(institute);
      localStorage.setItem('greenpulse_current_institute', instituteId);
    }
  };

  // Get institute by campus ID
  const getInstituteByCampusId = (campusId) => {
    return institutes.find(inst => inst.campusId === campusId);
  };

  // Get institute statistics
  const getInstituteStats = () => {
    if (!currentInstitute) return null;

    return {
      totalInstitutes: institutes.length,
      currentInstitute: currentInstitute.name,
      campusId: currentInstitute.campusId,
      totalBuildings: currentInstitute.totalBuildings,
      totalStudents: currentInstitute.totalStudents,
      energyCapacity: currentInstitute.energyCapacity,
      carbonBudget: currentInstitute.carbonBudget
    };
  };

  // Update institute data
  const updateInstitute = (instituteId, updates) => {
    setInstitutes(prevInstitutes => 
      prevInstitutes.map(inst => 
        inst.id === instituteId ? { ...inst, ...updates } : inst
      )
    );

    // Update current institute if it's the one being updated
    if (currentInstitute && currentInstitute.id === instituteId) {
      setCurrentInstitute(prev => ({ ...prev, ...updates }));
    }
  };

  // Add new institute (admin function)
  const addInstitute = (instituteData) => {
    const newInstitute = {
      id: `inst_${Date.now()}`,
      ...instituteData,
      established: new Date().getFullYear().toString()
    };
    
    setInstitutes(prevInstitutes => [...prevInstitutes, newInstitute]);
    return newInstitute;
  };

  // Remove institute (admin function)
  const removeInstitute = (instituteId) => {
    setInstitutes(prevInstitutes => 
      prevInstitutes.filter(inst => inst.id !== instituteId)
    );

    // Clear current institute if it's being removed
    if (currentInstitute && currentInstitute.id === instituteId) {
      setCurrentInstitute(null);
      localStorage.removeItem('greenpulse_current_institute');
    }
  };

  const value = {
    currentInstitute,
    institutes,
    loading,
    selectInstitute,
    getInstituteByCampusId,
    getInstituteStats,
    updateInstitute,
    addInstitute,
    removeInstitute
  };

  return (
    <InstituteContext.Provider value={value}>
      {children}
    </InstituteContext.Provider>
  );
};
