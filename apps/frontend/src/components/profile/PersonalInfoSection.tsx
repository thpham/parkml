import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  MapPin, 
  Phone,
  Edit2,
  Save,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import toast from 'react-hot-toast';

interface PersonalInfoSectionProps {}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalInfo: {
    allergies: string;
    medications: string;
    emergencyNotes: string;
  };
}

const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['profile', 'common']);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: ''
    },
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    medicalInfo: {
      allergies: '',
      medications: '',
      emergencyNotes: ''
    }
  });
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('parkml_token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.user) {
          setProfile(result.data.user);
          setEditedProfile(result.data.user);
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Use default profile for now
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedProfile)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.user) {
          setProfile(result.data.user);
          setEditedProfile(result.data.user);
          setIsEditing(false);
          toast.success(t('profile:personalInfo.saveSuccess'));
        } else {
          throw new Error('Failed to save profile');
        }
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('profile:personalInfo.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string, nested?: string) => {
    setEditedProfile(prev => {
      if (nested) {
        return {
          ...prev,
          [nested]: {
            ...(prev as any)[nested],
            [field]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  if (isLoading && !profile.name) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-base-content/60">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-base-300 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-base-content">
            {t('profile:personalInfo.title')}
          </h2>
          <p className="text-base-content/60 mt-1">
            {t('profile:personalInfo.description')}
          </p>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="btn btn-outline btn-sm"
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                {t('common:cancel')}
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary btn-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {t('common:save')}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-outline btn-sm"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              {t('common:edit')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <User className="h-5 w-5 text-primary" />
              {t('profile:personalInfo.basicInfo')}
            </h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.name')}</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="input input-bordered"
                    placeholder={t('profile:personalInfo.namePlaceholder')}
                  />
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg">
                    {profile.name || t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.email')}</span>
                </label>
                <div className="p-3 bg-base-100 rounded-lg flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-base-content/60" />
                  <span>{profile.email}</span>
                  <div className="badge badge-success badge-sm">
                    <Check className="h-3 w-3 mr-1" />
                    {t('profile:personalInfo.verified')}
                  </div>
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    {t('profile:personalInfo.emailNote')}
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.phone')}</span>
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedProfile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="input input-bordered"
                    placeholder={t('profile:personalInfo.phonePlaceholder')}
                  />
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg">
                    {profile.phone || t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.dateOfBirth')}</span>
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedProfile.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="input input-bordered"
                  />
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg">
                    {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <MapPin className="h-5 w-5 text-secondary" />
              {t('profile:personalInfo.address')}
            </h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.street')}</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.address.street}
                    onChange={(e) => handleInputChange('street', e.target.value, 'address')}
                    className="input input-bordered"
                    placeholder={t('profile:personalInfo.streetPlaceholder')}
                  />
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg">
                    {profile.address.street || t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t('profile:personalInfo.city')}</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.address.city}
                      onChange={(e) => handleInputChange('city', e.target.value, 'address')}
                      className="input input-bordered"
                      placeholder={t('profile:personalInfo.cityPlaceholder')}
                    />
                  ) : (
                    <div className="p-3 bg-base-100 rounded-lg">
                      {profile.address.city || t('profile:personalInfo.notProvided')}
                    </div>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">{t('profile:personalInfo.postalCode')}</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile.address.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value, 'address')}
                      className="input input-bordered"
                      placeholder={t('profile:personalInfo.postalCodePlaceholder')}
                    />
                  ) : (
                    <div className="p-3 bg-base-100 rounded-lg">
                      {profile.address.postalCode || t('profile:personalInfo.notProvided')}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.country')}</span>
                </label>
                {isEditing ? (
                  <select
                    value={editedProfile.address.country}
                    onChange={(e) => handleInputChange('country', e.target.value, 'address')}
                    className="select select-bordered"
                  >
                    <option value="">{t('profile:personalInfo.selectCountry')}</option>
                    <option value="CH">Switzerland</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="IT">Italy</option>
                    <option value="AT">Austria</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg">
                    {profile.address.country || t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <Phone className="h-5 w-5 text-accent" />
              {t('profile:personalInfo.emergencyContact')}
            </h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.contactName')}</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProfile.emergencyContact.name}
                    onChange={(e) => handleInputChange('name', e.target.value, 'emergencyContact')}
                    className="input input-bordered"
                    placeholder={t('profile:personalInfo.contactNamePlaceholder')}
                  />
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg">
                    {profile.emergencyContact.name || t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.contactPhone')}</span>
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedProfile.emergencyContact.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value, 'emergencyContact')}
                    className="input input-bordered"
                    placeholder={t('profile:personalInfo.contactPhonePlaceholder')}
                  />
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg">
                    {profile.emergencyContact.phone || t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.relationship')}</span>
                </label>
                {isEditing ? (
                  <select
                    value={editedProfile.emergencyContact.relationship}
                    onChange={(e) => handleInputChange('relationship', e.target.value, 'emergencyContact')}
                    className="select select-bordered"
                  >
                    <option value="">{t('profile:personalInfo.selectRelationship')}</option>
                    <option value="spouse">{t('profile:personalInfo.relationships.spouse')}</option>
                    <option value="parent">{t('profile:personalInfo.relationships.parent')}</option>
                    <option value="child">{t('profile:personalInfo.relationships.child')}</option>
                    <option value="sibling">{t('profile:personalInfo.relationships.sibling')}</option>
                    <option value="friend">{t('profile:personalInfo.relationships.friend')}</option>
                    <option value="other">{t('profile:personalInfo.relationships.other')}</option>
                  </select>
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg">
                    {profile.emergencyContact.relationship 
                      ? t(`profile:personalInfo.relationships.${profile.emergencyContact.relationship}`)
                      : t('profile:personalInfo.notProvided')
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <AlertCircle className="h-5 w-5 text-warning" />
              {t('profile:personalInfo.medicalInfo')}
            </h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.allergies')}</span>
                </label>
                {isEditing ? (
                  <textarea
                    value={editedProfile.medicalInfo.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value, 'medicalInfo')}
                    className="textarea textarea-bordered"
                    placeholder={t('profile:personalInfo.allergiesPlaceholder')}
                    rows={2}
                  />
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg min-h-16">
                    {profile.medicalInfo.allergies || t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.medications')}</span>
                </label>
                {isEditing ? (
                  <textarea
                    value={editedProfile.medicalInfo.medications}
                    onChange={(e) => handleInputChange('medications', e.target.value, 'medicalInfo')}
                    className="textarea textarea-bordered"
                    placeholder={t('profile:personalInfo.medicationsPlaceholder')}
                    rows={2}
                  />
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg min-h-16">
                    {profile.medicalInfo.medications || t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">{t('profile:personalInfo.emergencyNotes')}</span>
                </label>
                {isEditing ? (
                  <textarea
                    value={editedProfile.medicalInfo.emergencyNotes}
                    onChange={(e) => handleInputChange('emergencyNotes', e.target.value, 'medicalInfo')}
                    className="textarea textarea-bordered"
                    placeholder={t('profile:personalInfo.emergencyNotesPlaceholder')}
                    rows={3}
                  />
                ) : (
                  <div className="p-3 bg-base-100 rounded-lg min-h-20">
                    {profile.medicalInfo.emergencyNotes || t('profile:personalInfo.notProvided')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="alert alert-info">
        <AlertCircle className="h-5 w-5" />
        <div>
          <h4 className="font-medium">{t('profile:personalInfo.privacy.title')}</h4>
          <p className="text-sm">{t('profile:personalInfo.privacy.description')}</p>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoSection;