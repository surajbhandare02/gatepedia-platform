# Gatepedia

Gatepedia is an advanced, AI-powered progressive web application designed to help students prepare for the GATE (Graduate Aptitude Test in Engineering) examination. 

Gatepedia tracks your syllabus, measures your progress, generates study schedules, evaluates your performance with PYQs (Previous Year Questions), and acts as your personal AI tutor to explain complex topics.

## 🚀 Features

* **Intelligent Dashboard**: View your overall readiness, upcoming revisions, and streaks.
* **AI Syllabus Planner**: Automatically generates a structured study plan based on your target date and available time.
* **Revision System**: Spaced repetition tracking integrated directly with your notes and PYQs.
* **Productivity Hub**: Built-in Pomodoro timer with deep-work session logging.
* **Analytics**: Real-time charts demonstrating weak topics and overall syllabus coverage.
* **AI Assistant**: Context-aware AI tutor to instantly answer engineering doubts and explain concepts.
* **Flashcards**: Active recall testing to memorize formulas.

## 🛠️ Tech Stack

* **Frontend**: React (Create React App), Vanilla CSS (Custom Design System)
* **Backend**: Node.js, Express.js
* **Database**: PostgreSQL (hosted on Supabase)
* **ORM**: Prisma
* **Authentication**: Secure HttpOnly cookies + JWT (Access & Refresh tokens)
* **Deployment**: Vercel (Frontend), Render (Backend)

## 📁 Repository Structure

```text
Gatepedia/
├── client/           # React frontend application
├── server/           # Express backend API
├── docs/             # Additional documentation
├── screenshots/      # UI showcases
```

## ⚙️ Installation Guide

### Prerequisites
* Node.js v18+
* PostgreSQL database

### 1. Clone the repository
```bash
git clone https://github.com/surajbhandare02/gatepedia.git
cd gatepedia
```

### 2. Backend Setup
```bash
cd server
npm install

# Copy environment variables and fill them in
cp .env.example .env

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Start the development server
npm run dev
```

### 3. Frontend Setup
```bash
cd ../client
npm install

# Start the frontend
npm start
```

## 🚀 Deployment

**Backend (Render)**:
Connect the repository to Render and deploy as a Web Service using `server/` as the root directory.

**Frontend (Vercel)**:
Connect the repository to Vercel and set `REACT_APP_API_URL` to your production backend URL.

## 🗺️ Roadmap
- Integration with external question banks.
- Real-time multiplayer study rooms.
- Advanced AI-generated mock tests.
