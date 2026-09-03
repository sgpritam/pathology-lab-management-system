import { useEffect, useState } from "react";
import { useNavigate, useParams, Link} from "react-router-dom";

const API_URL = "http://localhost:5000/api";

function PatientDetails() {

  const navigate = useNavigate();

  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [tests, setTests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // ==========================================
  // LOAD PATIENT DETAILS
  // ==========================================

  useEffect(() => {

    console.log("Patient ID from URL:", id);

    if (!id) {

      setError("Patient ID is missing.");
      setLoading(false);

      return;

    }


    const loadPatientDetails = async () => {

      try {

        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/patients/${id}`
        );


        const data = await response.json();


        console.log(
          "GET patient details response:",
          data
        );


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Failed to load patient details"
          );

        }


        /*
          Expected response:

          {
            patient: {...},
            tests: [...],
            total_amount: 600
          }
        */


        setPatient(
          data.patient || null
        );


        setTests(
          Array.isArray(data.tests)
            ? data.tests
            : []
        );


      } catch (error) {

        console.error(
          "Patient details error:",
          error
        );

        setError(
          error.message ||
          "Unable to load patient details"
        );

      } finally {

        setLoading(false);

      }

    };


    loadPatientDetails();

  }, [id]);


  // ==========================================
  // DATE FORMAT
  // ==========================================

  const formatDate = (value) => {

    if (!value) {
      return "-";
    }


    const date = new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;

    }


    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );

  };


  // ==========================================
  // TIME FORMAT
  // ==========================================

  const formatTime = (value) => {

    if (!value) {
      return "-";
    }


    return String(value)
      .substring(0, 8);

  };


  // ==========================================
  // TOTAL AMOUNT
  // ==========================================

  const totalAmount = tests.reduce(
    (total, test) => {

      return (
        total +
        Number(test.price || 0)
      );

    },
    0
  );


  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {

    return (

      <section className="card">

        <div
          style={{
            textAlign: "center",
            padding: "50px",
          }}
        >

          Loading patient details...

        </div>

      </section>

    );

  }


  // ==========================================
  // ERROR
  // ==========================================

  if (error) {

    return (

      <section className="card">

        <div
          style={{
            color: "#c62828",
            padding: "20px",
            marginBottom: "15px",
          }}
        >

          ⚠ {error}

        </div>


        <button
          type="button"
          onClick={() =>
            navigate("/patients")
          }
        >

          ← Back to Patients

        </button>

      </section>

    );

  }


  // ==========================================
  // PATIENT NOT FOUND
  // ==========================================

  if (!patient) {

    return (

      <section className="card">

        <h2>
          Patient not found
        </h2>


        <button
          type="button"
          onClick={() =>
            navigate("/patients")
          }
        >

          ← Back to Patients

        </button>

      </section>

    );

  }


  // ==========================================
  // RENDER
  // ==========================================

  return (

    <div className="patient-details-page">


      {/* ======================================
          HEADER
      ====================================== */}

      <header className="header">

        <div>

          <button
            type="button"
            onClick={() =>
              navigate("/patients")
            }
            style={{
              marginBottom: "15px",
            }}
          >

            ← Back to Patients

          </button>


          <h1>
            Patient Details
          </h1>


          <p>
            Complete patient registration
            information and laboratory tests.
          </p>

        </div>


        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >

          <button
            type="button"
            onClick={() =>
              navigate("/patients")
            }
          >

            ← Back

          </button>


          <button
            type="button"
            className="primary-btn"
            onClick={() =>
              navigate(
                `/patients/${patient.id}/edit`
              )
            }
          >

            ✏️ Edit Patient

          </button>

        </div>

      </header>


      {/* ======================================
          PATIENT INFORMATION
      ====================================== */}

      <section className="card">

        <div className="card-header">

          <div>

            <h3>
              Patient Information
            </h3>


            <p>
              Registration details
            </p>

          </div>


          <div
            style={{
              padding: "8px 14px",
              borderRadius: "20px",
              background: "#eef5ff",
              color: "#2563eb",
              fontWeight: "600",
            }}
          >

            Patient #{patient.id}

          </div>

        </div>


        <div className="form-grid">


          {/* NAME */}

          <div className="form-group">

            <label>
              Patient Name
            </label>


            <div className="detail-value">

              {patient.patient_name || "-"}

            </div>

          </div>


          {/* AGE */}

          <div className="form-group">

            <label>
              Age
            </label>


            <div className="detail-value">

              {patient.age ?? "-"}

            </div>

          </div>


          {/* GENDER */}

          <div className="form-group">

            <label>
              Gender
            </label>


            <div className="detail-value">

              {patient.gender || "-"}

            </div>

          </div>


          {/* MOBILE */}

          <div className="form-group">

            <label>
              Mobile Number
            </label>


            <div className="detail-value">

              {patient.mobile || "-"}

            </div>

          </div>


          {/* REGISTRATION DATE */}

          <div className="form-group">

            <label>
              Registration Date
            </label>


            <div className="detail-value">

              {formatDate(
                patient.registration_date
              )}

            </div>

          </div>


          {/* REGISTRATION TIME */}

          <div className="form-group">

            <label>
              Registration Time
            </label>


            <div className="detail-value">

              {formatTime(
                patient.registration_time
              )}

            </div>

          </div>


          {/* ADDRESS */}

          <div
            className="form-group"
            style={{
              gridColumn: "1 / -1",
            }}
          >

            <label>
              Address
            </label>


            <div className="detail-value">

              {patient.address || "-"}

            </div>

          </div>


          {/* CREATED AT */}

          <div className="form-group">

            <label>
              Created At
            </label>


            <div className="detail-value">

              {formatDate(
                patient.created_at
              )}

            </div>

          </div>

        </div>

      </section>


      {/* ======================================
          REGISTERED TESTS
      ====================================== */}

      <section className="card">

        <div className="card-header">

          <div>

            <h3>
              Registered Tests
            </h3>


            <p>
              Laboratory tests registered
              for this patient
            </p>

          </div>


          <div
            style={{
              padding: "8px 14px",
              borderRadius: "20px",
              background: "#eef5ff",
              color: "#2563eb",
              fontWeight: "600",
            }}
          >

            {tests.length} Test
            {tests.length !== 1
              ? "s"
              : ""}

          </div>

        </div>


        {tests.length === 0 ? (

          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#777",
            }}
          >

            No tests registered
            for this patient.

          </div>

        ) : (

          <div
            style={{
              overflowX: "auto",
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
                    #
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

                {tests.map(
                  (test, index) => (

                    <tr
                      key={
                        test.id ||
                        test.test_id ||
                        index
                      }
                    >

                      <td>
                        {index + 1}
                      </td>


                      <td>

                        <strong>
                          {test.test_code || "-"}
                        </strong>

                      </td>


                      <td>
                        {test.test_name || "-"}
                      </td>


                      <td>
                        {test.sample_type || "-"}
                      </td>


                      <td>
                        {test.vial_name || "-"}
                      </td>


                      <td>

                        ₹
                        {Number(
                          test.price || 0
                        ).toFixed(2)}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}


        {/* ====================================
            TOTAL
        ==================================== */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "20px",
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
          }}
        >

          <strong>
            Total Amount:
          </strong>


          <strong
            style={{
              fontSize: "26px",
              color: "#166534",
            }}
          >

            ₹
            {totalAmount.toFixed(2)}

          </strong>

        </div>

      </section>


      {/* ======================================
          BOTTOM ACTIONS
      ====================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginBottom: "30px",
        }}
      >

        <button
          type="button"
          onClick={() =>
            navigate("/patients")
          }
        >

          ← Back to Patients

        </button>


        <button
          type="button"
          className="primary-btn"
          onClick={() =>
            navigate(
              `/patients/${patient.id}/edit`
            )
          }
        >

          ✏️ Edit Patient

        </button>

      </div>

    </div>

  );

}

export default PatientDetails;