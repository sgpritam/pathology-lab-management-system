import { useEffect, useState } from "react";
import "./SampleManagement.css";

const API_URL = "http://localhost:5000/api";

const SAMPLES_PER_PAGE = 5;

function SampleManagement() {

    // =====================================================
    // SAMPLES
    // =====================================================

    const [samples, setSamples] = useState([]);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [currentPage, setCurrentPage] = useState(1);


    // =====================================================
    // VIEW
    // =====================================================

    const [viewSample, setViewSample] = useState(null);

    const [viewLoading, setViewLoading] = useState(false);


    // =====================================================
    // COLLECT
    // =====================================================

    const [collectSample, setCollectSample] = useState(null);

    const [collectLoading, setCollectLoading] = useState(false);

    const [collectionDate, setCollectionDate] = useState("");

    const [collectionTime, setCollectionTime] = useState("");


    // =====================================================
    // REJECT
    // =====================================================

    const [rejectSample, setRejectSample] = useState(null);

    const [rejectionReason, setRejectionReason] = useState("");

    const [rejectLoading, setRejectLoading] = useState(false);


    // =====================================================
    // LOAD SAMPLES
    // =====================================================

    const loadSamples = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await fetch(
                `${API_URL}/samples`
            );

            const data = await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to load samples"
                );

            }

            if (!Array.isArray(data)) {

                throw new Error(
                    "Invalid samples response"
                );

            }

            setSamples(data);

        } catch (error) {

            console.error(
                "Load samples error:",
                error
            );

            setError(
                error.message ||
                "Failed to load samples"
            );

        } finally {

            setLoading(false);

        }

    };


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {

        loadSamples();

    }, []);


    // =====================================================
    // SEARCH
    // =====================================================

    const filteredSamples = samples.filter(
        (sample) => {

            const text =
                search
                    .toLowerCase()
                    .trim();

            if (!text) {
                return true;
            }

            return (

                String(
                    sample.sample_no || ""
                )
                    .toLowerCase()
                    .includes(text)

                ||

                String(
                    sample.order_no || ""
                )
                    .toLowerCase()
                    .includes(text)

                ||

                String(
                    sample.order_id || ""
                )
                    .toLowerCase()
                    .includes(text)

                ||

                String(
                    sample.patient_name || ""
                )
                    .toLowerCase()
                    .includes(text)

                ||

                String(
                    sample.patient_id || ""
                )
                    .toLowerCase()
                    .includes(text)

                ||

                String(
                    sample.test_code || ""
                )
                    .toLowerCase()
                    .includes(text)

                ||

                String(
                    sample.test_name || ""
                )
                    .toLowerCase()
                    .includes(text)

                ||

                String(
                    sample.sample_type || ""
                )
                    .toLowerCase()
                    .includes(text)

            );

        }
    );


    // =====================================================
    // PAGINATION
    // =====================================================

    const totalPages =
        Math.ceil(
            filteredSamples.length /
            SAMPLES_PER_PAGE
        ) || 1;


    const startIndex =
        (currentPage - 1) *
        SAMPLES_PER_PAGE;


    const paginatedSamples =
        filteredSamples.slice(
            startIndex,
            startIndex + SAMPLES_PER_PAGE
        );


    // =====================================================
    // SEARCH CHANGE
    // =====================================================

    const handleSearch = (event) => {

        setSearch(
            event.target.value
        );

        setCurrentPage(1);

    };


    // =====================================================
    // FORMAT DATE TIME
    // =====================================================

    const formatDateTime = (value) => {

        if (!value) {
            return "-";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString(
            "en-IN",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );

    };


    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (value) => {

        if (!value) {
            return "-";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString(
            "en-IN"
        );

    };


    // =====================================================
    // OPEN VIEW
    // =====================================================

    const handleViewSample = async (sampleId) => {

        try {

            setViewLoading(true);

            setError("");

            const response = await fetch(
                `${API_URL}/samples/${sampleId}`
            );

            const data = await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to load sample"
                );

            }

            setViewSample(data);

        } catch (error) {

            console.error(
                "View sample error:",
                error
            );

            setError(
                error.message ||
                "Failed to load sample"
            );

        } finally {

            setViewLoading(false);

        }

    };


    // =====================================================
    // CLOSE VIEW
    // =====================================================

    const closeView = () => {

        setViewSample(null);

    };


    // =====================================================
    // OPEN COLLECT
    // =====================================================

    const handleOpenCollect = (sample) => {

        setCollectSample(sample);

        const now = new Date();

        const year =
            now.getFullYear();

        const month =
            String(
                now.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                now.getDate()
            ).padStart(2, "0");

        const hours =
            String(
                now.getHours()
            ).padStart(2, "0");

        const minutes =
            String(
                now.getMinutes()
            ).padStart(2, "0");


        setCollectionDate(
            `${year}-${month}-${day}`
        );

        setCollectionTime(
            `${hours}:${minutes}`
        );

        setError("");

    };


    // =====================================================
    // CLOSE COLLECT
    // =====================================================

    const closeCollect = () => {

        setCollectSample(null);

        setCollectionDate("");

        setCollectionTime("");

    };


    // =====================================================
    // COLLECT SAMPLE
    // =====================================================

    const handleCollectSample = async () => {

        if (!collectSample?.id) {
            return;
        }


        if (!collectionDate) {

            setError(
                "Please select collection date"
            );

            return;

        }


        if (!collectionTime) {

            setError(
                "Please select collection time"
            );

            return;

        }


        try {

            setCollectLoading(true);

            setError("");


            const response = await fetch(
                `${API_URL}/samples/${collectSample.id}/collect`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        collection_date:
                            collectionDate,

                        collection_time:
                            collectionTime

                    })

                }
            );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to collect sample"
                );

            }


            closeCollect();


            await loadSamples();


            alert(
                "Sample collected successfully"
            );


        } catch (error) {

            console.error(
                "Collect sample error:",
                error
            );

            setError(
                error.message ||
                "Failed to collect sample"
            );

        } finally {

            setCollectLoading(false);

        }

    };


    // =====================================================
    // OPEN REJECT
    // =====================================================

    const handleOpenReject = (sample) => {

        setRejectSample(sample);

        setRejectionReason("");

        setError("");

    };


    // =====================================================
    // CLOSE REJECT
    // =====================================================

    const closeReject = () => {

        setRejectSample(null);

        setRejectionReason("");

    };


    // =====================================================
    // REJECT SAMPLE
    // =====================================================

    const handleRejectSample = async () => {

        if (!rejectSample?.id) {
            return;
        }


        if (!rejectionReason.trim()) {

            setError(
                "Please enter rejection reason"
            );

            return;

        }


        try {

            setRejectLoading(true);

            setError("");


            const response = await fetch(
                `${API_URL}/samples/${rejectSample.id}/reject`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        rejection_reason:
                            rejectionReason.trim()

                    })

                }
            );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to reject sample"
                );

            }


            closeReject();


            await loadSamples();


            alert(
                "Sample rejected successfully"
            );


        } catch (error) {

            console.error(
                "Reject sample error:",
                error
            );

            setError(
                error.message ||
                "Failed to reject sample"
            );

        } finally {

            setRejectLoading(false);

        }

    };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="sample-management-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="page-header">

                <div>

                    <h2>
                        Sample Management
                    </h2>

                    <p>
                        Manage laboratory samples
                    </p>

                </div>


                <button
                    className="refresh-btn"
                    onClick={loadSamples}
                    disabled={loading}
                >
                    {loading
                        ? "Loading..."
                        : "Refresh"}
                </button>

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

                <div className="error-message">

                    {error}

                </div>

            )}


            {/* =================================================
                SEARCH
            ================================================= */}

            <div className="search-section">

                <input
                    type="text"
                    value={search}
                    onChange={handleSearch}
                    placeholder="Search Sample No, Order No, Patient, Test..."
                />


                <span>

                    {filteredSamples.length}

                    {" "}

                    sample
                    {filteredSamples.length !== 1
                        ? "s"
                        : ""}

                </span>

            </div>


            {/* =================================================
                TABLE
            ================================================= */}

            <div className="table-container">

                <table>

                    <thead>

                        <tr>

                            <th>
                                #
                            </th>

                            <th>
                                Sample No
                            </th>

                            <th>
                                Order No
                            </th>

                            <th>
                                Patient
                            </th>

                            <th>
                                Patient ID
                            </th>

                            <th>
                                Test
                            </th>

                            <th>
                                Sample Type
                            </th>

                            <th>
                                Vial
                            </th>

                            <th>
                                Collection
                            </th>

                            <th>
                                Action
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        {loading ? (

                            <tr>

                                <td
                                    colSpan="10"
                                    className="empty-row"
                                >
                                    Loading samples...
                                </td>

                            </tr>

                        ) : paginatedSamples.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="10"
                                    className="empty-row"
                                >
                                    No samples found
                                </td>

                            </tr>

                        ) : (

                            paginatedSamples.map(
                                (sample, index) => (

                                    <tr
                                        key={sample.id}
                                    >

                                        <td>

                                            {startIndex +
                                                index +
                                                1}

                                        </td>


                                        <td>

                                            <strong>
                                                {
                                                    sample.sample_no
                                                }
                                            </strong>

                                        </td>


                                        <td>

                                            {sample.order_no ||
                                                `#${sample.order_id}`}

                                        </td>


                                        <td>

                                            {
                                                sample.patient_name ||
                                                "-"
                                            }

                                        </td>


                                        <td>

                                            #
                                            {
                                                sample.patient_id
                                            }

                                        </td>


                                        <td>

                                            <strong>
                                                {
                                                    sample.test_code ||
                                                    "-"
                                                }
                                            </strong>

                                            <br />

                                            <span>
                                                {
                                                    sample.test_name ||
                                                    "-"
                                                }
                                            </span>

                                        </td>


                                        <td>

                                            {
                                                sample.sample_type ||
                                                "-"
                                            }

                                        </td>


                                        <td>

                                            <div>

                                                <strong>
                                                    {
                                                        sample.vial_name ||
                                                        "-"
                                                    }
                                                </strong>

                                                {sample.vial_color && (

                                                    <small>
                                                        {
                                                            sample.vial_color
                                                        }
                                                    </small>

                                                )}

                                            </div>

                                        </td>


                                        <td>

                                            {
                                                formatDateTime(
                                                    sample.collected_at
                                                )
                                            }

                                        </td>


                                        <td>

                                            <div className="action-buttons">

                                                <button
                                                    className="view-btn"
                                                    onClick={() =>
                                                        handleViewSample(
                                                            sample.id
                                                        )
                                                    }
                                                >
                                                    View
                                                </button>


                                                {!sample.collected_at && (

                                                    <button
                                                        className="collect-btn"
                                                        onClick={() =>
                                                            handleOpenCollect(
                                                                sample
                                                            )
                                                        }
                                                    >
                                                        Collect
                                                    </button>

                                                )}


                                                <button
                                                    className="reject-btn"
                                                    onClick={() =>
                                                        handleOpenReject(
                                                            sample
                                                        )
                                                    }
                                                >
                                                    Reject
                                                </button>

                                            </div>

                                        </td>

                                    </tr>

                                )

                            )

                        )}

                    </tbody>

                </table>

            </div>


            {/* =================================================
                PAGINATION
            ================================================= */}

            {filteredSamples.length > 0 && (

                <div className="pagination">

                    <button
                        disabled={
                            currentPage === 1
                        }
                        onClick={() =>
                            setCurrentPage(
                                (page) =>
                                    page - 1
                            )
                        }
                    >
                        Previous
                    </button>


                    <span>

                        Page {currentPage} of{" "}
                        {totalPages}

                    </span>


                    <button
                        disabled={
                            currentPage ===
                            totalPages
                        }
                        onClick={() =>
                            setCurrentPage(
                                (page) =>
                                    page + 1
                            )
                        }
                    >
                        Next
                    </button>

                </div>

            )}


            {/* =================================================
                VIEW MODAL
            ================================================= */}

            {viewSample && (

                <div
                    className="modal-overlay"
                    onClick={closeView}
                >

                    <div
                        className="modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {viewLoading ? (

                            <div className="modal-loading">
                                Loading...
                            </div>

                        ) : (

                            <>

                                {/* HEADER */}

                                <div className="modal-header">

                                    <div>

                                        <h3>
                                            Sample Details
                                        </h3>

                                        <p>
                                            {
                                                viewSample.sample_no
                                            }
                                        </p>

                                    </div>


                                    <button
                                        className="close-btn"
                                        onClick={closeView}
                                    >
                                        ×
                                    </button>

                                </div>


                                {/* PATIENT */}

                                <div className="details-section">

                                    <h4>
                                        Patient Details
                                    </h4>


                                    <div className="details-grid">

                                        <div>

                                            <label>
                                                Patient Name
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.patient_name ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Patient ID
                                            </label>

                                            <strong>
                                                #
                                                {
                                                    viewSample.patient_id
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Age
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.age ??
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Gender
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.gender ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Mobile
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.mobile ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Address
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.address ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                </div>


                                {/* ORDER */}

                                <div className="details-section">

                                    <h4>
                                        Order Details
                                    </h4>


                                    <div className="details-grid">

                                        <div>

                                            <label>
                                                Order No
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.order_no ||
                                                    `#${viewSample.order_id}`
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Sample No
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.sample_no
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Test Code
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.test_code ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Test Name
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.test_name ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Sample Type
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.sample_type ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Vial Name
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.vial_name ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Vial Color
                                            </label>

                                            <strong>
                                                {
                                                    viewSample.vial_color ||
                                                    "-"
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                </div>


                                {/* COLLECTION */}

                                <div className="details-section">

                                    <h4>
                                        Collection Details
                                    </h4>


                                    <div className="details-grid">

                                        <div>

                                            <label>
                                                Collected At
                                            </label>

                                            <strong>
                                                {
                                                    formatDateTime(
                                                        viewSample.collected_at
                                                    )
                                                }
                                            </strong>

                                        </div>


                                        <div>

                                            <label>
                                                Received At
                                            </label>

                                            <strong>
                                                {
                                                    formatDateTime(
                                                        viewSample.received_at
                                                    )
                                                }
                                            </strong>

                                        </div>

                                    </div>

                                </div>


                                {/* REJECTION */}

                                {viewSample.rejection_reason && (

                                    <div className="details-section">

                                        <h4>
                                            Rejection Reason
                                        </h4>

                                        <p>
                                            {
                                                viewSample.rejection_reason
                                            }
                                        </p>

                                    </div>

                                )}


                                {/* FOOTER */}

                                <div className="modal-footer">

                                    <button
                                        className="cancel-btn"
                                        onClick={closeView}
                                    >
                                        Close
                                    </button>


                                    {!viewSample.collected_at && (

                                        <button
                                            className="collect-btn"
                                            onClick={() => {

                                                closeView();

                                                handleOpenCollect(
                                                    viewSample
                                                );

                                            }}
                                        >
                                            Collect Sample
                                        </button>

                                    )}


                                    <button
                                        className="reject-btn"
                                        onClick={() => {

                                            closeView();

                                            handleOpenReject(
                                                viewSample
                                            );

                                        }}
                                    >
                                        Reject Sample
                                    </button>

                                </div>

                            </>

                        )}

                    </div>

                </div>

            )}


            {/* =================================================
                COLLECT MODAL
            ================================================= */}

            {collectSample && (

                <div
                    className="modal-overlay"
                    onClick={closeCollect}
                >

                    <div
                        className="modal small-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="modal-header">

                            <div>

                                <h3>
                                    Collect Sample
                                </h3>

                                <p>
                                    {
                                        collectSample.sample_no
                                    }
                                </p>

                            </div>


                            <button
                                className="close-btn"
                                onClick={closeCollect}
                            >
                                ×
                            </button>

                        </div>


                        <div className="details-section">

                            <div className="details-grid">

                                <div>

                                    <label>
                                        Patient
                                    </label>

                                    <strong>
                                        {
                                            collectSample.patient_name ||
                                            "-"
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <label>
                                        Test
                                    </label>

                                    <strong>
                                        {
                                            collectSample.test_name ||
                                            "-"
                                        }
                                    </strong>

                                </div>

                            </div>

                        </div>


                        <div className="form-group">

                            <label>
                                Collection Date
                            </label>

                            <input
                                type="date"
                                value={collectionDate}
                                onChange={(event) =>
                                    setCollectionDate(
                                        event.target.value
                                    )
                                }
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                Collection Time
                            </label>

                            <input
                                type="time"
                                value={collectionTime}
                                onChange={(event) =>
                                    setCollectionTime(
                                        event.target.value
                                    )
                                }
                            />

                        </div>


                        <div className="modal-footer">

                            <button
                                className="cancel-btn"
                                onClick={closeCollect}
                                disabled={
                                    collectLoading
                                }
                            >
                                Cancel
                            </button>


                            <button
                                className="collect-btn"
                                onClick={
                                    handleCollectSample
                                }
                                disabled={
                                    collectLoading
                                }
                            >
                                {collectLoading
                                    ? "Collecting..."
                                    : "Collect Sample"}
                            </button>

                        </div>

                    </div>

                </div>

            )}


            {/* =================================================
                REJECT MODAL
            ================================================= */}

            {rejectSample && (

                <div
                    className="modal-overlay"
                    onClick={closeReject}
                >

                    <div
                        className="modal small-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="modal-header">

                            <div>

                                <h3>
                                    Reject Sample
                                </h3>

                                <p>
                                    {
                                        rejectSample.sample_no
                                    }
                                </p>

                            </div>


                            <button
                                className="close-btn"
                                onClick={closeReject}
                            >
                                ×
                            </button>

                        </div>


                        <div className="details-section">

                            <div className="details-grid">

                                <div>

                                    <label>
                                        Patient
                                    </label>

                                    <strong>
                                        {
                                            rejectSample.patient_name ||
                                            "-"
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <label>
                                        Test
                                    </label>

                                    <strong>
                                        {
                                            rejectSample.test_name ||
                                            "-"
                                        }
                                    </strong>

                                </div>

                            </div>

                        </div>


                        <div className="form-group">

                            <label>
                                Rejection Reason
                            </label>

                            <textarea
                                value={
                                    rejectionReason
                                }
                                onChange={(event) =>
                                    setRejectionReason(
                                        event.target.value
                                    )
                                }
                                placeholder="Enter rejection reason..."
                                rows="4"
                            />

                        </div>


                        <div className="modal-footer">

                            <button
                                className="cancel-btn"
                                onClick={closeReject}
                                disabled={
                                    rejectLoading
                                }
                            >
                                Cancel
                            </button>


                            <button
                                className="reject-btn"
                                onClick={
                                    handleRejectSample
                                }
                                disabled={
                                    rejectLoading ||
                                    !rejectionReason.trim()
                                }
                            >
                                {rejectLoading
                                    ? "Rejecting..."
                                    : "Reject Sample"}
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}

export default SampleManagement;
