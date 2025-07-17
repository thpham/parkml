export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// User Management
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'caregiver' | 'healthcare_provider';
  createdAt: Date;
  updatedAt: Date;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  dateOfBirth: Date;
  diagnosisDate: Date;
  caregiverIds: string[];
  healthcareProviderIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Symptom Tracking Types
export interface SymptomEntry {
  id: string;
  patientId: string;
  entryDate: Date;
  completedBy: string; // User ID of person who completed the form
  motorSymptoms: MotorSymptoms;
  nonMotorSymptoms: NonMotorSymptoms;
  autonomicSymptoms: AutonomicSymptoms;
  dailyActivities: DailyActivities;
  environmentalFactors: EnvironmentalFactors;
  safetyIncidents: SafetyIncident[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MotorSymptoms {
  tremors: TremorAssessment[];
  rigidity: RigidityAssessment[];
  bradykinesia: BradykinesiaAssessment;
  balance: BalanceAssessment;
  other: OtherMotorSymptoms;
}

export interface TremorAssessment {
  timeObserved: string;
  location: ('right_hand' | 'left_hand' | 'right_leg' | 'left_leg' | 'head' | 'jaw' | 'other')[];
  otherLocation?: string;
  type: 'at_rest' | 'during_movement' | 'maintaining_position';
  severity: 1 | 2 | 3 | 4 | 5;
  duration: string;
  triggers: string;
  notes: string;
}

export interface RigidityAssessment {
  timeObserved: string;
  location: ('neck' | 'arms' | 'legs' | 'back' | 'whole_body')[];
  type: 'constant_stiffness' | 'jerky_resistance' | 'varies_with_movement';
  severity: 1 | 2 | 3 | 4 | 5;
  impactOnActivities: string;
  notes: string;
}

export interface BradykinesiaAssessment {
  timeObserved: string;
  affectedActivities: {
    walking: string;
    gettingUpFromChair: string;
    turningInBed: string;
    buttoningClothes: string;
    writing: string;
    eating: string;
  };
  severity: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface BalanceAssessment {
  timeObserved: string;
  posture: 'normal' | 'hunched' | 'leaning_sideways' | 'other';
  otherPosture?: string;
  balanceProblems: 'none' | 'slight_swaying' | 'needs_support' | 'falls';
  fallsToday: number;
  walkingPattern: 'normal' | 'shuffling' | 'small_steps' | 'freezing_episodes';
  notes: string;
}

export interface OtherMotorSymptoms {
  facialExpression: 'normal' | 'reduced' | 'mask_like';
  voiceVolume: 'normal' | 'quiet' | 'very_quiet';
  swallowing: 'normal' | 'slow' | 'coughing_during_meals' | 'choking';
  handwriting: 'normal' | 'small' | 'illegible';
  notes: string;
}

export interface NonMotorSymptoms {
  cognitive: CognitiveAssessment;
  mood: MoodAssessment;
  sleep: SleepAssessment;
}

export interface CognitiveAssessment {
  timeObserved: string;
  alertness: 'alert' | 'drowsy' | 'confused' | 'disoriented';
  memory: {
    recentEvents: 'good' | 'fair' | 'poor';
    namesAndFaces: 'good' | 'fair' | 'poor';
  };
  decisionMaking: 'normal' | 'slow' | 'difficult' | 'needs_help';
  concentration: 'good' | 'fair' | 'poor';
  confusionEpisodes: string;
  confusionDuration: string;
  notes: string;
}

export interface MoodAssessment {
  timeObserved: string;
  mood: 'happy' | 'sad' | 'anxious' | 'irritable' | 'apathetic' | 'other';
  otherMood?: string;
  motivation: 'high' | 'normal' | 'low' | 'very_low';
  socialInteraction: 'normal' | 'withdrawn' | 'inappropriate';
  hallucinations: 'none' | 'visual' | 'auditory' | 'other';
  hallucinationDetails?: string;
  notes: string;
}

export interface SleepAssessment {
  bedtime: string;
  wakeTime: string;
  totalSleepHours: number;
  sleepQuality: 'restful' | 'restless' | 'frequent_awakenings';
  dreamEnactment: boolean;
  dreamEnactmentDetails?: string;
  daytimeNaps: 'none' | 'brief' | 'extended';
  napDuration?: string;
  notes: string;
}

export interface AutonomicSymptoms {
  bloodPressure: BloodPressureReading[];
  bladderBowel: BladderBowelFunction;
  other: OtherAutonomicSymptoms;
}

export interface BloodPressureReading {
  time: string;
  position: 'lying' | 'sitting' | 'standing';
  systolic: number;
  diastolic: number;
  symptomsOnPositionChange: ('dizziness' | 'lightheadedness' | 'none')[];
  notes: string;
}

export interface BladderBowelFunction {
  urination: 'normal' | 'frequent' | 'urgent' | 'incontinence';
  bowelMovements: 'normal' | 'constipation' | 'frequent' | 'incontinence';
  notes: string;
}

export interface OtherAutonomicSymptoms {
  sweating: 'normal' | 'excessive' | 'reduced';
  temperatureRegulation: 'normal' | 'often_cold' | 'often_hot';
  notes: string;
}

export interface DailyActivities {
  activityLevel: ActivityLevel;
  appetite: AppetiteAssessment;
  medicationCompliance: MedicationCompliance;
}

export interface ActivityLevel {
  totalRestTime: number;
  restActivities: ('tv' | 'reading' | 'sleeping' | 'other')[];
  otherRestActivity?: string;
  activePeriods: string;
  energyLevel: 1 | 2 | 3 | 4 | 5;
}

export interface AppetiteAssessment {
  appetite: 'good' | 'fair' | 'poor';
  meals: {
    breakfast: 'complete' | 'partial' | 'none';
    lunch: 'complete' | 'partial' | 'none';
    dinner: 'complete' | 'partial' | 'none';
  };
  fluidIntake: number;
  weight?: number;
  notes: string;
}

export interface MedicationCompliance {
  morning: 'taken_as_prescribed' | 'forgotten' | 'delayed';
  afternoon: 'taken_as_prescribed' | 'forgotten' | 'delayed';
  evening: 'taken_as_prescribed' | 'forgotten' | 'delayed';
  sideEffects: string;
}

export interface EnvironmentalFactors {
  weather: ('sunny' | 'cloudy' | 'rainy' | 'hot' | 'cold')[];
  temperature: number;
  humidity: 'high' | 'normal' | 'low';
  environmentalChanges: string;
  stressfulEvents: string;
  visitors: string;
  routineChanges: string;
}

export interface SafetyIncident {
  type: 'fall' | 'near_fall' | 'choking' | 'medication_error' | 'other';
  time: string;
  location: string;
  circumstances: string;
  injury: 'none' | 'minor' | 'significant';
  injuryDescription?: string;
  notes: string;
}

// Weekly Summary Types
export interface WeeklySummary {
  id: string;
  patientId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  bestDay: string;
  worstDay: string;
  overallProgression: 'better' | 'same' | 'worse';
  newSymptoms: string;
  functionalChanges: FunctionalChanges;
  medicationEffectiveness: MedicationEffectiveness;
  caregiverConcerns: CaregiverConcerns;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FunctionalChanges {
  moreDifficult: string;
  improved: string;
  independenceLevel: 'independent' | 'occasional_help' | 'significant_help';
}

export interface MedicationEffectiveness {
  mostEffectiveTimes: string;
  breakthroughSymptoms: string;
  sideEffects: string;
}

export interface CaregiverConcerns {
  urgentSymptoms: string;
  safetyConcerns: string;
  medicationConcerns: string;
  therapyNeeds: string;
  equipmentNeeds: string;
}

export const API_ENDPOINTS = {
  USERS: '/api/users',
  AUTH: '/api/auth',
  HEALTH: '/api/health',
  PATIENTS: '/api/patients',
  SYMPTOM_ENTRIES: '/api/symptom-entries',
  WEEKLY_SUMMARIES: '/api/weekly-summaries',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;