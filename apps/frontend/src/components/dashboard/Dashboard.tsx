import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Patient, SymptomEntry } from '@parkml/shared';
import { Avatar } from '../shared';
import { Calendar, Users, Activity, TrendingUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminDashboard from '../admin/AdminDashboard';
import { useTranslation } from '../../hooks/useTranslation';

const Dashboard: React.FC = () => {
  const { user, token, isAdmin } = useAuth();
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentEntries, setRecentEntries] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch patients
      const patientsResponse = await fetch('/api/patients', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        if (patientsData.success) {
          setPatients(patientsData.data);

          // Fetch recent entries if there are patients
          if (patientsData.data.length > 0) {
            const patientId = patientsData.data[0].id;
            const entriesResponse = await fetch(
              `/api/symptom-entries?patientId=${patientId}&limit=5`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (entriesResponse.ok) {
              const entriesData = await entriesResponse.json();
              if (entriesData.success) {
                setRecentEntries(entriesData.data);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error(t('errors.loadDashboard'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    if (user && token && !isAdmin) {
      fetchDashboardData();
    }
  }, [user, token, isAdmin]);

  // Redirect admin users to admin dashboard
  if (isAdmin) {
    return <AdminDashboard />;
  }

  const handleCreatePatient = async () => {
    if (user?.role !== 'patient') {
      toast.error(t('errors.onlyPatients'));
      return;
    }

    const name = prompt(t('prompts.enterName'));
    const dateOfBirth = prompt(t('prompts.enterBirthDate'));
    const diagnosisDate = prompt(t('prompts.enterDiagnosisDate'));

    if (!name || !dateOfBirth || !diagnosisDate) {
      return;
    }

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          dateOfBirth,
          diagnosisDate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('success.patientCreated'));
        fetchDashboardData();
      } else {
        toast.error(data.error || t('errors.createPatient'));
      }
    } catch {
      toast.error(t('errors.createPatient'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="card-title text-2xl">
                {user?.role === 'patient'
                  ? t('types.patientDashboard')
                  : user?.role === 'family_caregiver'
                    ? t('types.familyCaregiverDashboard')
                    : t('types.professionalCaregiverDashboard')}
              </h1>
              <p className="text-base-content/70">
                {t('greeting.welcomeBack', {
                  name: user?.name || '',
                  role: user?.role?.replace('_', ' ') || '',
                })}
              </p>
            </div>

            {user?.role === 'patient' && patients.length === 0 && (
              <button onClick={handleCreatePatient} className="btn btn-primary">
                <Plus className="h-4 w-4" />
                {t('greeting.createPatientRecord')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        className={`grid grid-cols-1 gap-6 ${user?.role === 'patient' ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}
      >
        {user?.role !== 'patient' && (
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-figure text-primary">
                <Users className="h-8 w-8" />
              </div>
              <div className="stat-title">{t('stats.assignedPatients')}</div>
              <div className="stat-value text-primary">{patients.length}</div>
            </div>
          </div>
        )}

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-secondary">
              <Activity className="h-8 w-8" />
            </div>
            <div className="stat-title">{t('stats.recentEntries')}</div>
            <div className="stat-value text-secondary">{recentEntries.length}</div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-accent">
              <Calendar className="h-8 w-8" />
            </div>
            <div className="stat-title">{t('stats.thisMonth')}</div>
            <div className="stat-value text-accent">
              {
                recentEntries.filter(
                  entry => new Date(entry.entryDate).getMonth() === new Date().getMonth()
                ).length
              }
            </div>
          </div>
        </div>

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-success">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div className="stat-title">{t('stats.compliance')}</div>
            <div className="stat-value text-success">85%</div>
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-header">
          <h2 className="card-title text-lg px-6 py-4">
            {user?.role === 'patient' ? t('greeting.myProfile') : t('greeting.assignedPatients')}
          </h2>
        </div>

        <div className="card-body">
          {patients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 opacity-50" />
              <h3 className="mt-2 text-sm font-medium">{t('noPatients.title')}</h3>
              <p className="mt-1 text-sm opacity-70">
                {user?.role === 'patient'
                  ? t('noPatients.createRecord')
                  : t('noPatients.noneAssigned')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {patients.map(patient => (
                <div key={patient.id} className="card bg-base-200 shadow">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Avatar
                          variant="initial"
                          color="primary"
                          size="lg"
                          aria-label={`${patient.name} avatar`}
                        >
                          {patient.name.charAt(0)}
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium">{patient.name}</div>
                          <div className="text-sm opacity-70">
                            {t('greeting.diagnosed')}:{' '}
                            {new Date(patient.diagnosisDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {(user?.role === 'patient' || user?.role === 'family_caregiver') && (
                        <button
                          onClick={() => navigate(`/symptoms/${patient.id}`)}
                          className="btn btn-primary btn-sm"
                        >
                          {t('greeting.addSymptoms')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
