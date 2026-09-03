import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./App.css";

import Login from "./pages/Login";

import Tests from "./pages/Tests";
import PatientRegistration from "./pages/PatientRegistration";
import PatientDetails from "./pages/PatientDetails";
import LabOrders from "./pages/LabOrders";
// import SampleManagement from "./pages/SampleManagement";


// =========================================================
// APP
// =========================================================

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }
  });

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <AppLayout
        user={user}
        onLogout={handleLogout}
      />
    </BrowserRouter>
  );
}


// =========================================================
// APP LAYOUT
// =========================================================

function AppLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: "dashboard",
      path: "/",
      icon: "▦",
      label: "Dashboard",
    },
    {
      id: "tests",
      path: "/tests",
      icon: "🧪",
      label: "Tests",
    },
    {
      id: "patients",
      path: "/patients",
      icon: "👤",
      label: "Patients",
    },
    {
      id: "orders",
      path: "/orders",
      icon: "📋",
      label: "Lab Orders",
    },
    // {
    //   id: "samples",
    //   path: "/samples",
    //   icon: "🩸",
    //   label: "Samples",
    // },
    // {
    //   id: "results",
    //   path: "/results",
    //   icon: "📊",
    //   label: "Results",
    // },
    // {
    //   id: "reports",
    //   path: "/reports",
    //   icon: "📄",
    //   label: "Reports",
    // },
  ];


  // =======================================================
  // ACTIVE MENU
  // =======================================================

  const isMenuActive = (item) => {
    if (item.path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === item.path ||
      location.pathname.startsWith(`${item.path}/`)
    );
  };


  // =======================================================
  // NAVIGATION
  // =======================================================

  const handleNavigation = (path) => {
    navigate(path);
  };


  return (
    <div className="app">

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside className="sidebar">

        {/* LOGO */}

        <div className="logo">

          <div className="logo-icon">
            +
          </div>

          <div>
            <h2>PathoLab</h2>
            <span>Lab Management</span>
          </div>

        </div>


        {/* MENU */}

        <nav className="menu">

          {menuItems.map((item) => (

            <div
              key={item.id}
              className={`menu-item ${
                isMenuActive(item)
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleNavigation(item.path)
              }
            >

              <span>
                {item.icon}
              </span>

              {item.label}

            </div>

          ))}

        </nav>


        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">
          <div className="menu-item">
            <span>⚙️</span>Settings
          </div>
          <div className="user-box">
            <div className="avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <strong>
                {user?.name || "Admin"}
              </strong>
              <small>
                {user?.role || "LAB_ADMIN"}
              </small>
            </div>
          </div>
          <button type="button" className="logout-button" onClick={onLogout}>🚪 Logout </button>
        </div>
      </aside>
      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main className="main-content">

        <Routes>

          {/* ================================================
              DASHBOARD
          ================================================ */}

          <Route
            path="/"
            element={
              <Dashboard
                onTestsClick={() =>
                  navigate("/tests")
                }
                onPatientsClick={() =>
                  navigate("/patients")
                }
              />
            }
          />


          {/* ================================================
              TESTS
          ================================================ */}

          <Route
            path="/tests"
            element={<Tests />}
          />


          {/* ================================================
              PATIENT REGISTRATION / LIST
          ================================================ */}

          <Route
            path="/patients"
            element={
              <PatientRegistration />
            }
          />


          {/* ================================================
              PATIENT DETAILS
          ================================================ */}

          <Route
            path="/patients/:id"
            element={<PatientDetails />}
          />

          <Route
            path="/patients/:id/edit"
            element={<PatientRegistration />}
          />


          {/* ================================================
              LAB ORDERS
          ================================================ */}

          <Route
            path="/orders"
            element={<LabOrders />}
          />

          {/* ================================================
              SAMPLES
          ================================================ */}

          {/* <Route
            path="/samples"
            element={<SampleManagement />}
          /> */}

          {/* ================================================
              RESULTS
          ================================================ */}

          <Route
            path="/results"
            element={
              <PagePlaceholder
                title="Results"
              />
            }
          />


          {/* ================================================
              REPORTS
          ================================================ */}

          <Route
            path="/reports"
            element={
              <PagePlaceholder
                title="Reports"
              />
            }
          />


          {/* ================================================
              UNKNOWN URL
          ================================================ */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </main>

    </div>
  );
}


// =========================================================
// DASHBOARD
// =========================================================

function Dashboard({
  onTestsClick,
  onPatientsClick,
}) {

  return (
    <>

      {/* HEADER */}

      <header className="header">

        <div>

          <h1>
            Dashboard
          </h1>

          <p>
            Welcome back! Here's what's
            happening in your lab today.
          </p>

        </div>


        <div className="header-right">

          <div className="notification">
            🔔
          </div>

          <div className="date">
            📅 August 30, 2026
          </div>

        </div>

      </header>


      {/* STATS */}

      <section className="stats-grid">

        {/* PATIENTS */}

        <div
          className="stat-card clickable"
          onClick={onPatientsClick}
        >

          <div className="stat-icon blue">
            👥
          </div>

          <div>

            <span>
              Total Patients
            </span>

            <h2>
              1,248
            </h2>

            <small className="positive">
              View Patients →
            </small>

          </div>

        </div>


        {/* TESTS */}

        <div
          className="stat-card clickable"
          onClick={onTestsClick}
        >

          <div className="stat-icon purple">
            🧪
          </div>

          <div>

            <span>
              Total Tests
            </span>

            <h2>
              86
            </h2>

            <small className="positive">
              View Tests →
            </small>

          </div>

        </div>


        {/* ORDERS */}

        <div className="stat-card">

          <div className="stat-icon orange">
            📋
          </div>

          <div>

            <span>
              Today's Orders
            </span>

            <h2>
              42
            </h2>

            <small className="positive">
              ↑ 8.2% from yesterday
            </small>

          </div>

        </div>


        {/* REVENUE */}

        <div className="stat-card">

          <div className="stat-icon green">
            💰
          </div>

          <div>

            <span>
              Today's Revenue
            </span>

            <h2>
              ₹18,450
            </h2>

            <small className="positive">
              ↑ 6.4% from yesterday
            </small>

          </div>

        </div>

      </section>


      {/* QUICK ACCESS */}

      <section className="card">

        <div className="card-header">

          <div>

            <h3>
              Quick Access
            </h3>

            <p>
              Manage your pathology lab
            </p>

          </div>

        </div>


        <div className="quick-actions">

          <button
            type="button"
            className="primary-btn"
            onClick={onPatientsClick}
          >
            👤 Register Patient
          </button>


          <button
            type="button"
            className="primary-btn"
            onClick={onTestsClick}
          >
            🧪 Open Tests
          </button>

        </div>

      </section>

    </>
  );
}


// =========================================================
// PLACEHOLDER
// =========================================================

function PagePlaceholder({ title }) {

  return (

    <section className="card">

      <h2>
        {title}
      </h2>

      <p>
        This module will be available soon.
      </p>

    </section>

  );
}


export default App;
