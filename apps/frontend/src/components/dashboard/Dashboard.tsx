import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Patient, SymptomEntry } from '@parkml/shared';
import { Calendar, Users, Activity, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentEntries, setRecentEntries] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && token) {
      fetchDashboardData();
    }
  }, [user, token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch patients
      const patientsResponse = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        if (patientsData.success) {
          setPatients(patientsData.data);
        }
      }
      
      // Fetch recent entries if there are patients
      if (patients.length > 0) {
        const patientId = patients[0].id;
        const entriesResponse = await fetch(`/api/symptom-entries?patientId=${patientId}&limit=5`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (entriesResponse.ok) {
          const entriesData = await entriesResponse.json();
          if (entriesData.success) {
            setRecentEntries(entriesData.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async () => {
    if (user?.role !== 'patient') {
      toast.error('Only patients can create their own records');
      return;
    }
    
    const name = prompt('Enter patient name:');
    const dateOfBirth = prompt('Enter date of birth (YYYY-MM-DD):');
    const diagnosisDate = prompt('Enter diagnosis date (YYYY-MM-DD):');
    
    if (!name || !dateOfBirth || !diagnosisDate) {
      return;
    }
    
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          dateOfBirth,
          diagnosisDate,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Patient record created successfully');
        fetchDashboardData();
      } else {
        toast.error(data.error || 'Failed to create patient record');
      }
    } catch (error) {
      toast.error('Failed to create patient record');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}</p>
          </div>
          
          {user?.role === 'patient' && patients.length === 0 && (
            <button
              onClick={handleCreatePatient}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Patient Record
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Patients
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {patients.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Recent Entries
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {recentEntries.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    This Month
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {recentEntries.filter(entry => 
                      new Date(entry.entryDate).getMonth() === new Date().getMonth()
                    ).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Compliance
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    85%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Patients</h2>
        </div>
        
        {patients.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No patients</h3>
            <p className="mt-1 text-sm text-gray-500">
              {user?.role === 'patient' 
                ? 'Create your patient record to start tracking symptoms.'
                : 'No patients assigned to you yet.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {patients.map((patient) => (
                <li key={patient.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {patient.name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {patient.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Diagnosed: {new Date(patient.diagnosisDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/symptoms/${patient.id}`)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                      >
                        Add Symptoms
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;