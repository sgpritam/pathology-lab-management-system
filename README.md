# 🧪 Pathology Lab Management System

A modern web-based **Pathology Lab Management System** designed to simplify and manage day-to-day laboratory operations digitally.

The system provides a centralized platform for managing patients, laboratory tests, lab orders, samples, results, and medical reports.

---

## 🚀 Features

### 🔐 Authentication

* Secure user login
* JWT-based authentication
* Protected API routes
* Role-based authorization
* Admin support

### 👤 Patient Management

* Register new patients
* Patient search
* Patient list
* View patient details
* Edit patient information
* Delete patient records
* Select multiple laboratory tests
* Automatic test amount calculation
* Registration date and time management

### 🧪 Test Management

* View laboratory tests
* Test code
* Test name
* Sample type
* Vial name
* Vial color
* Price
* Reference range
* Unit
* Search and filtering

### 📋 Lab Order Management

* Create lab orders
* View lab orders
* Edit lab orders
* Delete lab orders
* Patient and test association
* Order status management
* Search and filtering

### 🧫 Sample Management

* Sample collection management
* Sample tracking
* Sample status management
* Patient and order association

### 🧬 Results Management

* Enter test results
* Manage laboratory results
* Test-wise result information
* Reference range and unit support

### 📄 Reports

* Patient report management
* Test-wise report details
* Patient information
* Received date
* Reported date
* Referred by information
* Reference range
* Units
* Professional report layout

### 📊 Dashboard

* Centralized dashboard
* Quick access to laboratory modules
* Laboratory workflow overview

---

## 🛠️ Technology Stack

### Frontend

* React
* Vite
* JavaScript
* HTML5
* CSS3

### Backend

* Node.js
* Express.js
* REST APIs
* JWT Authentication
* Middleware-based Authorization

### Database

* MySQL
* MySQL Workbench

### Development Tools

* Visual Studio Code
* Git
* GitHub
* Postman
* Google Chrome
* Microsoft Edge

---

## 📁 Project Structure

```text
pathology-lab/
│
├── backend/
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   │
│   ├── routes/
│   │   └── authRoutes.js
│   │
│   ├── createAdmin.js
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   │
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LabOrders.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── PatientDetails.jsx
│   │   │   ├── PatientRegistration.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── SampleManagement.jsx
│   │   │   └── Tests.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

Before running the project, make sure the following are installed:

* Node.js
* npm
* MySQL Server
* MySQL Workbench
* Git

Check Node.js:

```bash
node -v
```

Check npm:

```bash
npm -v
```

---

## 📥 Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/pathology-lab-management-system.git
```

Go to the project directory:

```bash
cd pathology-lab
```

---

## 🔧 Backend Setup

Go to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `backend` folder.

Example:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pathology_lab

JWT_SECRET=your_secret_key
```

> ⚠️ Never upload your actual `.env` file, database password, or secret keys to GitHub.

Start the backend:

```bash
node server.js
```

Backend API:

```text
http://localhost:5000
```

---

## 🎨 Frontend Setup

Open a new terminal.

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 🗄️ Database Setup

Create the database in MySQL:

```sql
CREATE DATABASE pathology_lab;
```

Configure the database credentials in:

```text
backend/.env
```

The application uses MySQL for storing:

* Users
* Patients
* Tests
* Lab Orders
* Order Tests
* Samples
* Results
* Reports

---

## 🔐 Authentication Flow

The application uses JWT-based authentication.

```text
User Login
    ↓
Credential Validation
    ↓
JWT Token Generated
    ↓
Token Stored by Frontend
    ↓
Protected API Request
    ↓
Authentication Middleware
    ↓
Authorized Response
```

Role-based middleware is used to control access to protected operations.

---

## 🌐 Application Modules

| Module     | Description                   |
| ---------- | ----------------------------- |
| Dashboard  | Laboratory overview           |
| Tests      | Manage laboratory tests       |
| Patients   | Register and manage patients  |
| Lab Orders | Manage laboratory orders      |
| Samples    | Manage and track samples      |
| Results    | Enter and manage test results |
| Reports    | Generate and view reports     |

---

## 🔌 API

Backend API base URL:

```text
http://localhost:5000/api
```

Main API modules include:

```text
/api/auth
/api/tests
/api/patients
/api/lab-orders
/api/samples
/api/results
/api/reports
```

---

## 🔒 Security

The project follows basic security practices:

* JWT authentication
* Protected API endpoints
* Role-based authorization
* Environment variables for sensitive configuration
* `.env` excluded from Git
* Database credentials excluded from source control

---

## 🧪 API Testing

Backend APIs can be tested using:

* Postman
* Browser
* Frontend application

Example:

```text
GET http://localhost:5000/api/tests
```

---

## 🔄 Application Workflow

```text
Login
  ↓
Dashboard
  ↓
Register Patient
  ↓
Select Tests
  ↓
Create Lab Order
  ↓
Collect Sample
  ↓
Process Test
  ↓
Enter Result
  ↓
Generate Report
  ↓
Deliver Report
```

---

## 📈 Future Improvements

The following features can be added in future versions:

* PDF report generation
* Report printing
* Patient report download
* Automatic database backup
* Backup and restore
* Billing and payment management
* Doctor/referral management
* SMS notifications
* WhatsApp notifications
* Email reports
* Online appointment management
* Cloud deployment
* Multi-lab support
* Advanced dashboard analytics
* Audit logs
* Offline mode

---

## 🚧 Project Status

**Status: In Development 🚧**

The core laboratory management modules are being developed and integrated.

Current development includes:

* Authentication
* Patient Management
* Test Management
* Lab Orders
* Sample Management
* Results
* Reports
* Dashboard

---

## 💻 Local Development

Run backend:

```bash
cd backend
npm install
node server.js
```

Run frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

---

## 📌 Environment Variables

The following environment variables are required for the backend:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pathology_lab
JWT_SECRET=your_secret_key
```

Make sure `.env` remains excluded from GitHub.

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

To contribute:

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Commit your changes
5. Push the branch
6. Create a Pull Request

---

## 👨‍💻 Author

**Pritam Kumar**

Frontend Developer

---

## 📄 License

This project is currently under development.

License terms can be added before public commercial or open-source distribution.

---

⭐ If you find this project useful, consider giving it a star on GitHub.
