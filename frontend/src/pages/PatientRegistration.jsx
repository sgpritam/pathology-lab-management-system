import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
};

const TESTS_PER_PAGE = 5;
const PATIENTS_PER_PAGE = 5;

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}


function PatientRegistration() {
  const navigate = useNavigate();

  // =========================================================
  // INITIAL FORM
  // =========================================================

  const getInitialForm = () => ({
    patient_name: "",
    age: "",
    gender: "",
    mobile: "",
    address: "",
    registration_date: getTodayDate(),
  });

  const [form, setForm] = useState(getInitialForm());

  // =========================================================
  // TESTS
  // =========================================================

  const [tests, setTests] = useState([]);
  const [testSearch, setTestSearch] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  const [testPage, setTestPage] = useState(1);

  const [testsLoading, setTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState("");

  // =========================================================
  // PATIENTS
  // =========================================================

  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPage, setPatientPage] = useState(1);

  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState("");

  // =========================================================
  // EDIT
  // =========================================================

  const [editingPatientId, setEditingPatientId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // =========================================================
  // SUBMIT
  // =========================================================

  const [submitting, setSubmitting] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // LOAD TESTS
  // =========================================================

  const loadTests = async () => {
    try {
      setTestsLoading(true);
      setTestsError("");
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/tests`, { headers: { Authorization: `Bearer ${token}`, }, });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load tests"
        );
      }

      /*
       * Supports:
       * [
       *   {...},
       *   {...}
       * ]
       *
       * OR
       *
       * { tests: [...] }
       */
      const testList = Array.isArray(data)
        ? data
        : Array.isArray(data.tests)
        ? data.tests
        : [];

      setTests(testList);
    } catch (error) {
      console.error("Load tests error:", error);

      setTestsError(
        error.message || "Unable to load tests"
      );
    } finally {
      setTestsLoading(false);
    }
  };

  // =========================================================
  // LOAD PATIENTS
  // =========================================================

  const loadPatients = async () => {
    try {
        const response = await fetch(`${API_URL}/patients`, {
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Failed to load patients: ${response.status} ${errorText}`
            );
        }

        const data = await response.json();

        console.log("Patients:", data);

        setPatients(
            Array.isArray(data)
                ? data
                : data.patients || []
        );

    } catch (error) {
        console.error(
            "Load patients error:",
            error
        );

        setErrorMessage(
            error.message ||
            "Failed to load patients"
        );
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadTests();
    loadPatients();
  }, []);

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================================
  // TEST SEARCH
  // =========================================================

  const filteredTests = useMemo(() => {
    const search = testSearch
      .trim()
      .toLowerCase();

    if (!search) {
      return tests;
    }

    return tests.filter((test) => {
      return (
        String(test.test_code || "")
          .toLowerCase()
          .includes(search) ||
        String(test.test_name || "")
          .toLowerCase()
          .includes(search) ||
        String(test.sample_type || "")
          .toLowerCase()
          .includes(search) ||
        String(test.vial_name || "")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [tests, testSearch]);

  // =========================================================
  // TEST PAGINATION
  // =========================================================

  const totalTestPages = Math.max(
    1,
    Math.ceil(
      filteredTests.length /
        TESTS_PER_PAGE
    )
  );

  const paginatedTests = filteredTests.slice(
    (testPage - 1) * TESTS_PER_PAGE,
    testPage * TESTS_PER_PAGE
  );

  useEffect(() => {
    setTestPage(1);
  }, [testSearch]);

  useEffect(() => {
    if (testPage > totalTestPages) {
      setTestPage(totalTestPages);
    }
  }, [testPage, totalTestPages]);

  // =========================================================
  // TEST SELECT / UNSELECT
  // =========================================================

  const toggleTest = (test) => {
    const testId = Number(test.id);

    const alreadySelected =
      selectedTests.some(
        (selected) =>
          Number(selected.id) === testId
      );

    if (alreadySelected) {
      setSelectedTests((previous) =>
        previous.filter(
          (selected) =>
            Number(selected.id) !== testId
        )
      );
    } else {
      setSelectedTests((previous) => [
        ...previous,
        test,
      ]);
    }
  };

  // =========================================================
  // CHECK SELECTED
  // =========================================================

  const isTestSelected = (testId) => {
    return selectedTests.some(
      (test) =>
        Number(test.id) ===
        Number(testId)
    );
  };

  // =========================================================
  // TOTAL
  // =========================================================

  const totalAmount = useMemo(() => {
    return selectedTests.reduce(
      (total, test) =>
        total + Number(test.price || 0),
      0
    );
  }, [selectedTests]);

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setForm(getInitialForm());

    setSelectedTests([]);

    setEditingPatientId(null);

    setErrorMessage("");
    setSuccessMessage("");

    setTestSearch("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // SUBMIT PATIENT
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    const patientName =
      String(form.patient_name || "").trim();

    const registrationDate =
      String(form.registration_date || "").trim();

    if (!patientName) {
      setErrorMessage(
        "Patient name is required"
      );
      return;
    }

    if (!registrationDate) {
      setErrorMessage(
        "Registration date is required"
      );
      return;
    }

    if (selectedTests.length === 0) {
      setErrorMessage(
        "Please select at least one test"
      );
      return;
    }

    if (
      form.mobile &&
      !/^[0-9]{10}$/.test(form.mobile)
    ) {
      setErrorMessage(
        "Mobile number must contain exactly 10 digits"
      );
      return;
    }

    // -------------------------------------------------------
    // PAYLOAD
    // -------------------------------------------------------

    const payload = {
      patient_name: patientName,
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      mobile: form.mobile || null,
      address: form.address || null,
      registration_date: registrationDate,
      test_ids: selectedTests.map((test) => Number(test.id)),
    };

    console.log(
      "Patient Payload:",
      payload
    );

    // -------------------------------------------------------
    // API
    // -------------------------------------------------------

    try {
      setSubmitting(true);
      const isEdit = editingPatientId !== null;
      const url = isEdit ? `${API_URL}/patients/${editingPatientId}` : `${API_URL}/patients`;
      const method = isEdit ? "PUT" : "POST";
      const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data =
        await response.json();

      console.log(
        `${method} patient response:`,
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${
              isEdit
                ? "update"
                : "register"
            } patient`
        );
      }

      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      setSuccessMessage(
        isEdit ? "Patient updated successfully." : "Patient registered successfully."
      );

      // Reset
      setForm(getInitialForm());
      setSelectedTests([]);
      setEditingPatientId(null);
      setTestSearch("");

      // Refresh patient list
      await loadPatients();

      // Scroll
      setTimeout(() => {
        const element =
          document.getElementById(
            "registered-patients"
          );

        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
          });
        }
      }, 200);
    } catch (error) {
      console.error(
        "Patient submit error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // PATIENT SEARCH
  // =========================================================

  const filteredPatients = useMemo(() => {
    const search =
      patientSearch
        .trim()
        .toLowerCase();

    if (!search) {
      return patients;
    }

    return patients.filter(
      (patient) => {
        return (
          String(patient.id || "")
            .toLowerCase()
            .includes(search) ||
          String(
            patient.patient_name || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            patient.mobile || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            patient.gender || ""
          )
            .toLowerCase()
            .includes(search)
        );
      }
    );
  }, [patients, patientSearch]);

  // =========================================================
  // PATIENT PAGINATION
  // =========================================================

  const totalPatientPages =
    Math.max(
      1,
      Math.ceil(
        filteredPatients.length /
          PATIENTS_PER_PAGE
      )
    );

  const paginatedPatients =
    filteredPatients.slice(
      (patientPage - 1) *
        PATIENTS_PER_PAGE,
      patientPage *
        PATIENTS_PER_PAGE
    );

  useEffect(() => {
    setPatientPage(1);
  }, [patientSearch]);

  useEffect(() => {
    if (
      patientPage >
      totalPatientPages
    ) {
      setPatientPage(
        totalPatientPages
      );
    }
  }, [
    patientPage,
    totalPatientPages,
  ]);

  // =========================================================
  // VIEW PATIENT
  // =========================================================

    const handleViewPatient = (patientId) => {
        if (!patientId) {
            setErrorMessage("Patient ID is missing.");
            return;
        }
        navigate(`/patients/${patientId}`);
    };

  // =========================================================
  // EDIT PATIENT
  // =========================================================

  const handleEditPatient = async (patientId) => {
    try {
      setErrorMessage("");

      const response = await fetch(
        `http://localhost:5000/api/patients/${patientId}`
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      const data = await response.json();

      // Patient form fill
      setForm({
        patient_name: data.patient.patient_name || "",
        age: data.patient.age || "",
        gender: data.patient.gender || "",
        mobile: data.patient.mobile || "",
        address: data.patient.address || "",
        registration_date:data.patient.registration_date ? String(data.patient.registration_date).slice(0, 10) : getTodayDate()
      });

      // Selected tests fill
      setSelectedTests(data.tests || []);
      setEditingPatientId(patientId);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    } catch (error) {
      console.error("Edit patient error:", error);
      setErrorMessage("Failed to load patient details.");
    }
  };

  // =========================================================
  // DELETE PATIENT
  // =========================================================

  const handleDeletePatient = async (
    patientId
  ) => {
    const patient =
      patients.find(
        (item) =>
          Number(item.id) ===
          Number(patientId)
      );

    const confirmed =
      window.confirm(
        `Are you sure you want to delete patient "${
          patient?.patient_name || ""
        }"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_URL}/patients/${patientId}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete patient"
        );
      }

      setSuccessMessage(
        "Patient deleted successfully."
      );

      await loadPatients();
    } catch (error) {
      console.error(
        "Delete patient error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to delete patient"
      );
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    /*
     * MySQL DATE:
     * 2026-08-29
     *
     * Avoid timezone conversion.
     */
    const dateString =
      String(date).substring(0, 10);

    const parts =
      dateString.split("-");

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return dateString;
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="patient-registration-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">
        <div>
          <h1>
            Patient Registration
          </h1>

          <p>
            Register a patient and select
            required laboratory tests.
          </p>
        </div>
      </header>

      {/* =====================================================
          MESSAGES
      ===================================================== */}

      {successMessage && (
        <div
          className="success-message"
          style={{
            marginBottom: "15px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#e8f7ee",
            color: "#16703b",
            border:
              "1px solid #b8e5c8",
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          className="error-message"
          style={{
            marginBottom: "15px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#fff0f0",
            color: "#c62828",
            border:
              "1px solid #f0b5b5",
          }}
        >
          ⚠ {errorMessage}
        </div>
      )}

      {/* =====================================================
          PATIENT FORM
      ===================================================== */}

      <form onSubmit={handleSubmit}>

        <section className="card">

          <div className="card-header">
            <div>
              <h3>
                {editingPatientId
                  ? "Edit Patient"
                  : "Patient Details"}
              </h3>

              <p>
                Enter patient information
              </p>
            </div>

            {editingPatientId && (
              <span
                style={{
                  background: "#fff7ed",
                  color: "#c2410c",
                  padding:
                    "8px 12px",
                  borderRadius: "8px",
                  fontWeight: "600",
                }}
              >
                Editing Patient #
                {editingPatientId}
              </span>
            )}
          </div>

          {editLoading ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
              }}
            >
              Loading patient details...
            </div>
          ) : (
            <div className="form-grid">

              {/* PATIENT NAME */}

              <div className="form-group">
                <label>
                  Patient Name{" "}
                  <span
                    style={{
                      color: "red",
                    }}
                  >
                    *
                  </span>
                </label>

                <input
                  type="text"
                  name="patient_name"
                  value={
                    form.patient_name
                  }
                  onChange={handleChange}
                  placeholder="Enter patient name"
                  required
                />
              </div>

              {/* AGE */}

              <div className="form-group">
                <label>
                  Age
                </label>

                <input
                  type="number"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="Enter age"
                  min="0"
                  max="150"
                />
              </div>

              {/* GENDER */}

              <div className="form-group">
                <label>
                  Gender
                </label>

                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="">
                    Select Gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* MOBILE */}

              <div className="form-group">
                <label>
                  Mobile Number
                </label>

                <input
                  type="tel"
                  name="mobile"
                  value={form.mobile}
                  onChange={(event) => {
                    const value =
                      event.target.value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(0, 10);

                    setForm(
                      (previous) => ({
                        ...previous,
                        mobile: value,
                      })
                    );
                  }}
                  placeholder="10 digit mobile number"
                  maxLength="10"
                />
              </div>

              {/* REGISTRATION DATE */}

              <div className="form-group">
                <label>
                  Registration Date{" "}
                  <span
                    style={{
                      color: "red",
                    }}
                  >
                    *
                  </span>
                </label>

                <input
                  type="date"
                  name="registration_date"
                  value={
                    form.registration_date
                  }
                  max={getTodayDate()}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ADDRESS */}

              <div
                className="form-group"
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <label>
                  Address
                </label>

                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter patient address"
                  rows="3"
                />
              </div>

            </div>
          )}

        </section>

        {/* ===================================================
            SELECT TESTS
        =================================================== */}

        <section className="card">

          <div className="card-header">

            <div>
              <h3>
                Select Tests
              </h3>

              <p>
                Search and select laboratory
                tests
              </p>
            </div>

            <div
              style={{
                padding:
                  "8px 14px",
                borderRadius: "20px",
                background:
                  "#eef5ff",
                color: "#2563eb",
                fontWeight: "600",
              }}
            >
              {selectedTests.length}{" "}
              Selected
            </div>

          </div>

          {/* SEARCH */}

          <div
            className="search-box"
            style={{
              marginBottom: "15px",
            }}
          >
            <input
              type="text"
              value={testSearch}
              onChange={(event) =>
                setTestSearch(
                  event.target.value
                )
              }
              placeholder="🔍 Search by test code, name, sample type..."
            />
          </div>

          {/* LOADING */}

          {testsLoading && (
            <div
              style={{
                padding: "20px",
                textAlign:
                  "center",
              }}
            >
              Loading tests...
            </div>
          )}

          {/* ERROR */}

          {testsError && (
            <div
              style={{
                padding: "15px",
                color: "#c62828",
              }}
            >
              {testsError}

              <button
                type="button"
                onClick={loadTests}
                style={{
                  marginLeft: "10px",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* TEST TABLE */}

          {!testsLoading &&
            !testsError && (
              <>
                <div
                  style={{
                    overflowX:
                      "auto",
                  }}
                >
                  <table
                    className="data-table"
                    style={{
                      width: "100%",
                    }}
                  >
                    <thead>
                      <tr>
                        <th>
                          Select
                        </th>

                        <th>
                          Test Code
                        </th>

                        <th>
                          Test Name
                        </th>

                        <th>
                          Sample
                        </th>

                        <th>
                          Vial
                        </th>

                        <th>
                          Price
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {paginatedTests.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan="6"
                            style={{
                              textAlign:
                                "center",
                              padding:
                                "25px",
                            }}
                          >
                            No tests found
                          </td>
                        </tr>
                      )}

                      {paginatedTests.map(
                        (test) => (
                          <tr
                            key={test.id}
                            onClick={() =>
                              toggleTest(
                                test
                              )
                            }
                            style={{
                              cursor:
                                "pointer",
                              backgroundColor:
                                isTestSelected(
                                  test.id
                                )
                                  ? "#f0f7ff"
                                  : "transparent",
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={isTestSelected(
                                  test.id
                                )}
                                onChange={() =>
                                  toggleTest(
                                    test
                                  )
                                }
                                onClick={(
                                  event
                                ) =>
                                  event.stopPropagation()
                                }
                              />
                            </td>

                            <td>
                              <strong>
                                {
                                  test.test_code
                                }
                              </strong>
                            </td>

                            <td>
                              {
                                test.test_name
                              }
                            </td>

                            <td>
                              {test.sample_type ||
                                "-"}
                            </td>

                            <td>
                              {test.vial_name ||
                                "-"}

                              {test.vial_color && (
                                <span
                                  style={{
                                    marginLeft:
                                      "8px",
                                    fontSize:
                                      "11px",
                                  }}
                                >
                                  (
                                  {
                                    test.vial_color
                                  }
                                  )
                                </span>
                              )}
                            </td>

                            <td>
                              <strong>
                                ₹
                                {Number(
                                  test.price ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </strong>
                            </td>
                          </tr>
                        )
                      )}

                    </tbody>
                  </table>
                </div>

                {/* TEST PAGINATION */}

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    marginTop:
                      "15px",
                  }}
                >
                  <span>
                    Showing{" "}
                    {filteredTests.length ===
                    0
                      ? 0
                      : (testPage -
                          1) *
                          TESTS_PER_PAGE +
                        1}
                    {" - "}
                    {Math.min(
                      testPage *
                        TESTS_PER_PAGE,
                      filteredTests.length
                    )}
                    {" of "}
                    {
                      filteredTests.length
                    }
                  </span>

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "6px",
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        testPage ===
                        1
                      }
                      onClick={() =>
                        setTestPage(
                          (page) =>
                            Math.max(
                              1,
                              page - 1
                            )
                        )
                      }
                    >
                      Previous
                    </button>

                    <span
                      style={{
                        padding:
                          "7px 12px",
                      }}
                    >
                      Page{" "}
                      {testPage} of{" "}
                      {
                        totalTestPages
                      }
                    </span>

                    <button
                      type="button"
                      disabled={
                        testPage ===
                        totalTestPages
                      }
                      onClick={() =>
                        setTestPage(
                          (page) =>
                            Math.min(
                              totalTestPages,
                              page + 1
                            )
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}

        </section>

        {/* ===================================================
            SELECTED TESTS
        =================================================== */}

        <section className="card">

          <div className="card-header">

            <div>
              <h3>
                Selected Tests
              </h3>

              <p>
                Tests selected for this
                patient
              </p>
            </div>

          </div>

          {selectedTests.length ===
          0 ? (
            <p
              style={{
                color: "#777",
              }}
            >
              No tests selected.
            </p>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                className="data-table"
                style={{
                  width: "100%",
                }}
              >
                <thead>
                  <tr>
                    <th>
                      Test Code
                    </th>

                    <th>
                      Test Name
                    </th>

                    <th>
                      Price
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {selectedTests.map(
                    (test) => (
                      <tr
                        key={test.id}
                      >
                        <td>
                          {
                            test.test_code
                          }
                        </td>

                        <td>
                          {
                            test.test_name
                          }
                        </td>

                        <td>
                          ₹
                          {Number(
                            test.price ||
                              0
                          ).toFixed(
                            2
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              toggleTest(
                                test
                              )
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TOTAL */}

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "flex-end",
              alignItems:
                "center",
              gap: "20px",
              marginTop:
                "20px",
              fontSize: "18px",
            }}
          >
            <strong>
              Total Amount:
            </strong>

            <strong
              style={{
                fontSize:
                  "24px",
                color:
                  "#166534",
              }}
            >
              ₹
              {totalAmount.toFixed(
                2
              )}
            </strong>
          </div>

        </section>

        {/* ===================================================
            ACTION BUTTONS
        =================================================== */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "flex-end",
            gap: "10px",
            marginBottom:
              "30px",
          }}
        >
          <button
            type="button"
            onClick={resetForm}
          >
            {editingPatientId
              ? "Cancel Edit"
              : "Clear"}
          </button>

          <button
            type="submit"
            className="primary-btn"
            disabled={
              submitting ||
              editLoading
            }
          >
            {submitting
              ? "Saving..."
              : editingPatientId
              ? "✏️ Update Patient"
              : "👤 Register Patient"}
          </button>
        </div>

      </form>

      {/* =====================================================
          REGISTERED PATIENTS
      ===================================================== */}

      <section
        className="card"
        id="registered-patients"
      >

        <div className="card-header">

          <div>
            <h3>
              Registered Patients
            </h3>

            <p>
              View, edit or delete
              registered patients
            </p>
          </div>

          <button
            type="button"
            onClick={loadPatients}
          >
            ↻ Refresh
          </button>

        </div>

        {/* SEARCH */}

        <div
          style={{
            marginBottom:
              "15px",
          }}
        >
          <input
            type="text"
            value={patientSearch}
            onChange={(event) =>
              setPatientSearch(
                event.target.value
              )
            }
            placeholder="🔍 Search by patient name, mobile or ID..."
            style={{
              width:
                "100%",
              boxSizing:
                "border-box",
            }}
          />
        </div>

        {/* ERROR */}

        {patientsError && (
          <div
            style={{
              color:
                "#c62828",
              marginBottom:
                "15px",
            }}
          >
            {patientsError}
          </div>
        )}

        {/* TABLE */}

        {patientsLoading ? (
          <div
            style={{
              textAlign:
                "center",
              padding:
                "30px",
            }}
          >
            Loading patients...
          </div>
        ) : (
          <>
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                className="data-table"
                style={{
                  width:
                    "100%",
                }}
              >
                <thead>
                  <tr>
                    <th>
                      ID
                    </th>

                    <th>
                      Patient Name
                    </th>

                    <th>
                      Age
                    </th>

                    <th>
                      Gender
                    </th>

                    <th>
                      Mobile
                    </th>

                    <th>
                      Registration Date
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {paginatedPatients.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          textAlign:
                            "center",
                          padding:
                            "30px",
                        }}
                      >
                        No patients
                        found.
                      </td>
                    </tr>
                  )}

                  {paginatedPatients.map(
                    (patient) => (
                      <tr
                        key={
                          patient.id
                        }
                      >
                        <td>
                          #
                          {
                            patient.id
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              patient.patient_name
                            }
                          </strong>
                        </td>

                        <td>
                          {patient.age ||
                            "-"}
                        </td>

                        <td>
                          {
                            patient.gender ||
                            "-"
                          }
                        </td>

                        <td>
                          {
                            patient.mobile ||
                            "-"
                          }
                        </td>

                        <td>
                          {formatDate(
                            patient.registration_date
                          )}
                        </td>

                        <td>
                          <div
                            style={{
                              display:
                                "flex",
                              gap:
                                "6px",
                            }}
                          >

                            {/* VIEW */}

                            <button type="button" title="View patient" onClick={() =>
                                navigate(`/patients/${patient.id}`)
                              }
                            >
                              👁
                            </button>

                            {/* EDIT */}

                            <button
                              type="button"
                              title="Edit patient"
                              onClick={() =>
                                handleEditPatient(
                                  patient.id
                                )
                              }
                            >
                              ✏️ Edit
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              title="Delete patient"
                              onClick={() =>
                                handleDeletePatient(
                                  patient.id
                                )
                              }
                            >
                              🗑️
                            </button>

                          </div>
                        </td>
                      </tr>
                    )
                  )}

                </tbody>
              </table>
            </div>

            {/* PATIENT PAGINATION */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginTop:
                  "15px",
              }}
            >
              <span>
                Showing{" "}
                {filteredPatients.length ===
                0
                  ? 0
                  : (patientPage -
                      1) *
                      PATIENTS_PER_PAGE +
                    1}
                {" - "}
                {Math.min(
                  patientPage *
                    PATIENTS_PER_PAGE,
                  filteredPatients.length
                )}
                {" of "}
                {
                  filteredPatients.length
                }
              </span>

              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "6px",
                }}
              >
                <button
                  type="button"
                  disabled={
                    patientPage ===
                    1
                  }
                  onClick={() =>
                    setPatientPage(
                      (page) =>
                        Math.max(
                          1,
                          page - 1
                        )
                    )
                  }
                >
                  Previous
                </button>

                <span
                  style={{
                    padding:
                      "7px 12px",
                  }}
                >
                  Page{" "}
                  {patientPage} of{" "}
                  {
                    totalPatientPages
                  }
                </span>

                <button
                  type="button"
                  disabled={
                    patientPage ===
                    totalPatientPages
                  }
                  onClick={() =>
                    setPatientPage(
                      (page) =>
                        Math.min(
                          totalPatientPages,
                          page + 1
                        )
                    )
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default PatientRegistration;