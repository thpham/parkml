-- SQLite Schema for ParkML
-- This schema is compatible with the PostgreSQL schema but adapted for SQLite

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'caregiver', 'healthcare_provider')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  diagnosis_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Patient caregivers junction table
CREATE TABLE IF NOT EXISTS patient_caregivers (
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  caregiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (patient_id, caregiver_id)
);

-- Patient healthcare providers junction table
CREATE TABLE IF NOT EXISTS patient_healthcare_providers (
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  healthcare_provider_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (patient_id, healthcare_provider_id)
);

-- Symptom entries table
CREATE TABLE IF NOT EXISTS symptom_entries (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  completed_by TEXT NOT NULL REFERENCES users(id),
  motor_symptoms TEXT NOT NULL, -- JSON stored as TEXT in SQLite
  non_motor_symptoms TEXT NOT NULL,
  autonomic_symptoms TEXT NOT NULL,
  daily_activities TEXT NOT NULL,
  environmental_factors TEXT NOT NULL,
  safety_incidents TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Weekly summaries table
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  best_day TEXT,
  worst_day TEXT,
  overall_progression TEXT CHECK (overall_progression IN ('better', 'same', 'worse')),
  new_symptoms TEXT,
  functional_changes TEXT NOT NULL, -- JSON stored as TEXT in SQLite
  medication_effectiveness TEXT NOT NULL,
  caregiver_concerns TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_patient_id ON symptom_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_entry_date ON symptom_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_patient_id ON weekly_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_start ON weekly_summaries(week_start_date);

-- Create triggers for updated_at (SQLite version)
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
  AFTER UPDATE ON users
  FOR EACH ROW 
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_patients_updated_at 
  AFTER UPDATE ON patients
  FOR EACH ROW 
  BEGIN
    UPDATE patients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_symptom_entries_updated_at 
  AFTER UPDATE ON symptom_entries
  FOR EACH ROW 
  BEGIN
    UPDATE symptom_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_weekly_summaries_updated_at 
  AFTER UPDATE ON weekly_summaries
  FOR EACH ROW 
  BEGIN
    UPDATE weekly_summaries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;