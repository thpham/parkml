# ParkML - Parkinson's Disease Monitoring Platform

A secure, HIPAA-compliant digital platform designed to capture and analyze
recurring Parkinson's disease symptoms to support medical care and advance
research through AI/ML-powered insights.

## 📋 Project Overview

ParkML is a comprehensive monitoring platform that enables systematic tracking
of Parkinson's disease symptom progression through structured daily, weekly, and
monthly observations. The platform serves dual purposes:

### Primary Goals

- **Clinical Support**: Provide healthcare providers with detailed, longitudinal
  patient data to improve diagnosis, treatment planning, and disease monitoring
- **Research Advancement**: Generate anonymized datasets for AI/ML research to
  enhance understanding of Parkinson's disease patterns, progression, and
  treatment effectiveness

### Key Features

- 🔒 **Security-First Design**: End-to-end encryption and data anonymization for
  patient privacy
- 📱 **Multi-Platform Access**: Web and mobile-responsive interface for patients
  and caregivers
- 🌐 **Multilingual Support**: Starting with French, expandable to multiple
  languages
- 📊 **Comprehensive Tracking**: Motor symptoms, non-motor symptoms, medication
  adherence, and quality of life metrics
- 🤖 **AI-Ready Data**: Structured data collection optimized for machine
  learning analysis
- 👥 **Caregiver Integration**: Dedicated interface for family members and
  professional caregivers

## 🏥 Clinical Applications

### For Healthcare Providers

- **Objective Monitoring**: Replace subjective patient recollections with
  systematic data collection
- **Pattern Recognition**: Identify symptom patterns, medication effectiveness,
  and environmental triggers
- **Treatment Optimization**: Data-driven insights for medication timing and
  dosage adjustments
- **Progression Tracking**: Long-term disease progression visualization and
  analysis

### For Patients and Caregivers

- **Daily Symptom Logging**: Structured forms for comprehensive symptom tracking
- **Medication Management**: Adherence tracking and side effect monitoring
- **Quality of Life Assessment**: Functional capacity and daily living activity
  tracking
- **Emergency Protocols**: Automated alerts for concerning symptom changes

## 🔬 Research and AI Integration

The platform is designed to support advanced research initiatives:

- **Anonymized Data Pipeline**: Secure data processing that removes personal
  identifiers while preserving clinical relevance
- **ML Model Training**: Structured datasets for training predictive models on
  disease progression
- **Pattern Discovery**: Advanced analytics to identify previously unknown
  symptom correlations
- **Treatment Response Analysis**: Population-level insights into medication
  effectiveness

## 🛠️ Technical Architecture

### Technology Stack

- **Frontend**: React with TypeScript, Vite build system
- **Backend**: Node.js with TypeScript, Express framework
- **Database**: PostgreSQL with encryption at rest
- **Deployment**: Docker containers with Dokku orchestration
- **Security**: HIPAA-compliant infrastructure with end-to-end encryption

### Project Structure

```
parkml/
├── apps/
│   ├── frontend/          # React web application
│   └── backend/           # Node.js API server
├── packages/              # Shared libraries and utilities
├── Dockerfile             # Container configuration
└── Procfile              # Deployment configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (≥18.0.0)
- npm or yarn
- PostgreSQL (for local development)
- Docker (optional, for containerized development)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/thpham/parkml.git
   cd parkml
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Copy example environment file for backend
   cp apps/backend/.env.example apps/backend/.env
   # Edit .env with your configuration
   ```

4. **Database setup**

   ```bash
   # Create database
   createdb parkml_dev

   # Run schema (optional for development)
   psql -d parkml_dev -f apps/backend/src/database/schema.sql
   ```

5. **Start development servers**

   ```bash
   npm run dev
   ```

   This starts both:

   - Backend server on <http://localhost:5000>
   - Frontend dev server on <http://localhost:3000>

   Open <http://localhost:3000> in your browser to access the application.

### Development Commands

```bash
# Start both backend and frontend in development mode
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Type checking
npm run typecheck

# Start production server
npm start

# Clean build files and reset project
npm run clean
npm run reset
```

For more detailed development information, see
[DEVELOPMENT.md](./DEVELOPMENT.md).

## 📝 Data Collection Forms

The platform includes comprehensive symptom tracking forms covering:

### Motor Symptoms

- **Tremors**: Location, severity, triggers, duration
- **Rigidity**: Muscle stiffness patterns and impact
- **Bradykinesia**: Movement speed and daily activity effects
- **Balance/Posture**: Gait analysis and fall risk assessment

### Non-Motor Symptoms

- **Cognitive Function**: Memory, attention, decision-making
- **Mood/Behavior**: Depression, anxiety, apathy screening
- **Sleep Patterns**: Quality, duration, disturbances
- **Autonomic Function**: Blood pressure, bladder/bowel function

### Daily Living Assessment

- **Medication Adherence**: Timing, side effects, effectiveness
- **Functional Capacity**: Independence levels and assistance needs
- **Environmental Factors**: Weather, stress, routine changes
- **Safety Incidents**: Falls, choking, medication errors

## 🔐 Security and Privacy

### Data Protection

- **Encryption**: AES-256 encryption for data at rest and in transit
- **Anonymization**: Automated removal of personally identifiable information
- **Access Control**: Role-based permissions and audit logging
- **Compliance**: HIPAA, GDPR, and medical data regulation adherence

### Privacy Features

- **Pseudonymization**: Patient identifiers replaced with secure tokens
- **Data Minimization**: Only essential data collected and stored
- **Consent Management**: Granular consent controls for data usage
- **Right to Deletion**: Complete data removal capabilities

## 🤝 Contributing

We welcome contributions from healthcare professionals, researchers, and
developers.

### Development Guidelines

- Follow TypeScript best practices
- Maintain 80%+ test coverage
- Use conventional commit messages
- Ensure HIPAA compliance in all code

### Getting Involved

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use 2-space indentation
- Follow ESLint configuration
- Write comprehensive tests
- Document public APIs

## 📊 Roadmap

### Phase 1: Core Platform (Current)

- 🔄 Basic symptom tracking forms
- 🔄 Patient/caregiver interfaces
- 🔄 Data encryption and security
- 🔄 Multilingual support

### Phase 2: Advanced Analytics

- 📅 AI-powered pattern recognition
- 📅 Predictive modeling capabilities
- 📅 Real-time symptom alerts
- 📅 Treatment recommendation engine

### Phase 3: Research Integration

- 📅 Anonymized data sharing platform
- 📅 Research collaboration tools
- 📅 Clinical trial integration
- 📅 Population health insights

## 📖 Documentation

- [API Documentation](./docs/api.md)
- [User Guide](./docs/user-guide.md)
- [Security Guidelines](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)

## 🌟 Support

For questions, issues, or contributions:

- 📧 Email: <support@parkml.org>
- 🐛 Issues: [GitHub Issues](https://github.com/thpham/parkml/issues)
- 📖 Documentation: [Wiki](https://github.com/thpham/parkml/wiki)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🙏 Acknowledgments

- Parkinson's disease researchers and healthcare professionals
- Patient advocacy groups and caregivers
- Open-source community contributors
- Medical institutions supporting digital health initiatives

---

**Note**: This platform is designed to supplement, not replace, professional
medical care. Always consult healthcare providers for medical decisions.
