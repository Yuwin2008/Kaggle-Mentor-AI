<div align="center">

# 🚀 Kaggle Mentor AI

### Your AI Companion for Kaggle Competitions

An AI-powered multi-agent platform that helps beginners and experienced data scientists navigate Kaggle competitions—from understanding datasets to generating notebooks and preparing submissions.

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge\&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge\&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge\&logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38BDF8?style=for-the-badge\&logo=tailwind-css)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge)
![AI Agents](https://img.shields.io/badge/AI-Multi--Agent-purple?style=for-the-badge)
![Kaggle](https://img.shields.io/badge/Kaggle-Capstone%20Project-20BEFF?style=for-the-badge\&logo=kaggle)
![GitHub stars](https://img.shields.io/github/stars/Yuwin2008/Kaggle-Mentor-AI?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/Yuwin2008/Kaggle-Mentor-AI?style=for-the-badge)

---

## 🏆 Kaggle Vibe Coding Agents Capstone Project

*Empowering Kaggle enthusiasts with AI-driven guidance from dataset exploration to competition submission.*

Kaggle Mentor AI was developed as part of the **Kaggle Vibe Coding Agents Capstone Project 2026**.

This project was created to explore the capabilities of modern AI agent systems in solving real-world machine learning workflow challenges. The goal was to design an intelligent assistant capable of guiding users throughout the entire Kaggle competition lifecycle—from dataset exploration to submission generation.

The project aligns closely with the competition's focus on:

* Intelligent AI agents
* Multi-agent collaboration
* Developer productivity
* AI-assisted workflows
* Educational accessibility
* Practical deployment of agent systems

I would like to thank the Kaggle team and the Google Developer ecosystem for organizing initiatives that encourage innovation in AI agents and human-AI collaboration.


</div>

---

# 🎯 Problem Statement

Kaggle competitions involve multiple complex stages including dataset understanding, exploratory data analysis, feature engineering, model selection, notebook creation, model evaluation, and submission generation.

Beginners often struggle to determine the next step, while experienced participants spend considerable time performing repetitive tasks.

Kaggle Mentor AI addresses this challenge through a collaborative multi-agent architecture where specialized AI agents work together to provide intelligent, contextual assistance at every stage of the competition lifecycle.

---

# 💡 Solution

Kaggle Mentor AI introduces a modular multi-agent system where each AI agent specializes in a specific task.

Instead of relying on a single general-purpose chatbot, multiple specialized agents collaborate to:

* Analyze datasets
* Perform exploratory data analysis
* Recommend ML strategies
* Generate starter notebooks
* Guide submission preparation

---

# 📖 Overview

Kaggle Mentor AI is an intelligent multi-agent AI platform designed to simplify the entire Kaggle competition workflow.

Whether you're participating in your first Kaggle competition or aiming to climb the leaderboard, Kaggle Mentor AI provides structured, AI-powered assistance throughout your journey.

---

# 🤖 Google Agent Development Kit (Google ADK)

Kaggle Mentor AI follows a **multi-agent orchestration architecture** inspired by principles from the **Google Agent Development Kit (Google ADK)** ecosystem.

The system decomposes complex machine learning workflows into specialized AI agents, each responsible for a clearly defined task:

| Agent            | Responsibility                                  |
| ---------------- | ----------------------------------------------- |
| Dataset Agent    | Dataset understanding and feature analysis      |
| EDA Agent        | Exploratory data analysis and visualization     |
| Strategy Agent   | Model recommendations and ML strategy           |
| Notebook Agent   | Starter notebook generation                     |
| Submission Agent | Submission preparation and competition guidance |

This design follows the core Google ADK philosophy of:

* Task specialization
* Agent collaboration
* Modular orchestration
* Tool-augmented reasoning
* Scalable AI systems

Rather than relying on a single monolithic AI assistant, Kaggle Mentor AI uses specialized agents that communicate through a prompt-routing layer to provide more accurate, explainable, and context-aware recommendations.

### Google ADK Pattern Used

✅ Multi-Agent Architecture
✅ Agent Orchestration
✅ Tool-Augmented Agents
✅ Prompt Routing
✅ Specialized Agent Responsibilities
✅ Modular Agent Design

This architecture improves maintainability, scalability, and reasoning quality while enabling future expansion into persistent memory, autonomous workflows, and multi-LLM support.

---

# 🎥 Demo

## YouTube Demo

https://www.youtube.com/watch?v=QY6ccoUa9B8

## Live Demo

https://kaggle-mentor-ai-409406860748.asia-southeast1.run.app

---

# ✨ Features

## 📊 Dataset Analysis Agent

* Automatic dataset understanding
* Target variable detection
* Missing value analysis
* Feature overview
* Data summary generation

## 📈 Exploratory Data Analysis Agent

* Distribution plots
* Correlation heatmaps
* Missing value reports
* Feature statistics
* Dataset summaries

## 🤖 Strategy Agent

Provides recommendations for:

* Data Cleaning
* Feature Engineering
* Model Selection
* Cross Validation
* Hyperparameter Tuning
* Performance Optimization

## 📝 Notebook Generation Agent

Automatically generates starter notebooks containing:

* Data Loading
* Data Cleaning
* Feature Engineering
* Model Training
* Evaluation
* Prediction
* Submission Creation

## 🏆 Competition Assistant

Helps users:

* Understand competition objectives
* Interpret evaluation metrics
* Recommend workflows
* Improve leaderboard performance

---

# 🧠 Multi-Agent Architecture

```text
                    User
                      │
                      ▼
        React + TypeScript Frontend
                      │
             Prompt Routing Layer
                      │
      ┌──────────┬──────────┬───────────┐
      ▼          ▼          ▼           ▼
 Dataset     EDA Agent  Strategy   Notebook
  Agent                  Agent      Agent
      │
      ▼
 Submission Agent
      │
      ▼
 Gemini API
```

---

# 🧠 Why Multi-Agent?

| Traditional Chatbot | Kaggle Mentor AI                |
| ------------------- | ------------------------------- |
| Single Prompt       | Multiple Specialized Agents     |
| Generic Responses   | Domain Expertise                |
| Limited Context     | End-to-End Competition Guidance |
| Difficult to Scale  | Modular Architecture            |

---

# 🖥️ Tech Stack

| Technology               | Purpose             |
| ------------------------ | ------------------- |
| React                    | Frontend Framework  |
| TypeScript               | Type Safety         |
| Vite                     | Build Tool          |
| Tailwind CSS             | Styling             |
| Gemini API               | AI Intelligence     |
| Multi-Agent Architecture | Agent Collaboration |

---

# 🚀 Installation

## Prerequisites

* Node.js v18+
* npm
* Git

Verify installation:

```bash
node -v
npm -v
git --version
```

## Clone Repository

```bash
git clone https://github.com/Yuwin2008/Kaggle-Mentor-AI.git
cd Kaggle-Mentor-AI
```

## Install Dependencies

```bash
npm install
```

## Configure Environment Variables

Create `.env`

```env
VITE_GEMINI_API_KEY=your_api_key
```

## Run Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

---

# 📜 Available Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| npm install     | Install dependencies     |
| npm run dev     | Start development server |
| npm run build   | Create production build  |
| npm run preview | Preview production build |
| npm run lint    | Run ESLint               |

---

# ⚙ Technical Highlights

* Multi-agent architecture
* Prompt routing system
* Responsive UI
* Type-safe codebase
* Environment variable support
* Production build support
* Scalable frontend architecture

---

# 📸 Screenshots

Add screenshots for:

* Home Page
* Dataset Analysis
* Auto EDA
* Strategy Recommendations
* Notebook Generation
* Submission Assistant

---

# 🔄 Workflow

```text
Competition
      │
      ▼
Dataset Analysis
      │
      ▼
Exploratory Data Analysis
      │
      ▼
Strategy Recommendation
      │
      ▼
Notebook Generation
      │
      ▼
Model Training
      │
      ▼
Submission File
```

---

# 🌟 Why Kaggle Mentor AI?

* Beginner Friendly
* AI-Powered Guidance
* Multi-Agent Collaboration
* End-to-End Workflow
* Faster Learning
* Intelligent Recommendations
* Modern Responsive Interface

---

# 🔮 Future Roadmap

* Authentication
* Persistent Memory
* AutoML
* Team Collaboration
* Cloud Notebook Execution
* Leaderboard Analytics
* Explainable AI
* Dataset Version Tracking
* Multi-LLM Support
* Agent Memory

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

# 📬 Contact

## 👨‍💻 GodofThunder2407 (R. L. Yuwin)

### GitHub

https://github.com/Yuwin2008

### Discord

godofthunder_2407

### YouTube

https://www.youtube.com/@GodofThunder2407

---

<div align="center">

## ⭐ If you found this project useful, please consider giving it a Star!

Made  by **GodofThunder2407 (R. L. Yuwin)**

</div>
