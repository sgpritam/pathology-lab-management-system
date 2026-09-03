import { useEffect, useMemo, useState } from "react";

import {
    getTests,
    addTest,
    updateTest,
    deleteTest
} from "../services/api";


const emptyForm = {
    test_code: "",
    test_name: "",
    sample_type: "",
    vial_name: "",
    price: "",
    reference_range: "",
    unit: "",
    vial_color: ""
};


function Tests() {

    const [tests, setTests] = useState([]);

    const [search, setSearch] = useState("");

    const [sampleFilter, setSampleFilter] =
        useState("All");

    const [sortConfig, setSortConfig] =
        useState({
            key: "test_name",
            direction: "asc"
        });

    const [currentPage, setCurrentPage] =
        useState(1);

    const [pageSize] = useState(10);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [showModal, setShowModal] =
        useState(false);

    const [editingTest, setEditingTest] =
        useState(null);

    const [formData, setFormData] =
        useState(emptyForm);

    const [saving, setSaving] =
        useState(false);

    const [deleteLoading, setDeleteLoading] =
        useState(null);


    // ======================================
    // LOAD TESTS
    // ======================================

    const loadTests = async () => {

        try {

            setLoading(true);
            setError("");

            const data = await getTests();

            setTests(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (err) {

            console.error(err);

            setError(
                err.message ||
                "Unable to load tests."
            );

        } finally {

            setLoading(false);

        }

    };


    useEffect(() => {

        loadTests();

    }, []);


    // ======================================
    // SAMPLE LIST
    // ======================================

    const samples = useMemo(() => {

        return [
            ...new Set(
                tests
                    .map(
                        test =>
                            test.sample_type
                    )
                    .filter(Boolean)
            )
        ];

    }, [tests]);


    // ======================================
    // SEARCH + FILTER
    // ======================================

    const filteredTests = useMemo(() => {

        const searchValue =
            search
                .trim()
                .toLowerCase();


        return tests.filter(test => {

            const matchesSearch =
                !searchValue ||
                String(
                    test.test_code || ""
                )
                    .toLowerCase()
                    .includes(searchValue) ||

                String(
                    test.test_name || ""
                )
                    .toLowerCase()
                    .includes(searchValue);


            const matchesSample =
                sampleFilter === "All" ||
                test.sample_type ===
                    sampleFilter;


            return (
                matchesSearch &&
                matchesSample
            );

        });

    }, [
        tests,
        search,
        sampleFilter
    ]);


    // ======================================
    // SORT
    // ======================================

    const sortedTests = useMemo(() => {

        const sorted = [
            ...filteredTests
        ];


        sorted.sort((a, b) => {

            let valueA =
                a[sortConfig.key];

            let valueB =
                b[sortConfig.key];


            if (
                sortConfig.key === "price"
            ) {

                valueA =
                    Number(valueA || 0);

                valueB =
                    Number(valueB || 0);

            } else {

                valueA =
                    String(
                        valueA ?? ""
                    ).toLowerCase();

                valueB =
                    String(
                        valueB ?? ""
                    ).toLowerCase();

            }


            if (valueA < valueB) {

                return sortConfig.direction ===
                    "asc"
                    ? -1
                    : 1;

            }


            if (valueA > valueB) {

                return sortConfig.direction ===
                    "asc"
                    ? 1
                    : -1;

            }


            return 0;

        });


        return sorted;

    }, [
        filteredTests,
        sortConfig
    ]);


    // ======================================
    // PAGINATION
    // ======================================

    const totalPages =
        Math.ceil(
            sortedTests.length /
            pageSize
        );


    const paginatedTests =
        sortedTests.slice(
            (currentPage - 1) *
                pageSize,

            currentPage *
                pageSize
        );


    useEffect(() => {

        setCurrentPage(1);

    }, [
        search,
        sampleFilter
    ]);


    // ======================================
    // SORT HANDLER
    // ======================================

    const handleSort = key => {

        setSortConfig(previous => {

            if (
                previous.key === key
            ) {

                return {
                    key,
                    direction:
                        previous.direction ===
                        "asc"
                            ? "desc"
                            : "asc"
                };

            }


            return {
                key,
                direction: "asc"
            };

        });

    };


    const getSortIcon = key => {

        if (
            sortConfig.key !== key
        ) {
            return "↕";
        }

        return sortConfig.direction ===
            "asc"
            ? "↑"
            : "↓";

    };


    // ======================================
    // OPEN ADD
    // ======================================

    const handleAdd = () => {

        setEditingTest(null);

        setFormData(emptyForm);

        setShowModal(true);

    };


    // ======================================
    // OPEN EDIT
    // ======================================

    const handleEdit = test => {

        setEditingTest(test);

        setFormData({

            test_code:
                test.test_code || "",

            test_name:
                test.test_name || "",

            sample_type:
                test.sample_type || "",

            vial_name:
                test.vial_name || "",

            price:
                test.price ?? "",

            reference_range:
                test.reference_range || "",

            unit:
                test.unit || "",

            vial_color:
                test.vial_color || ""

        });

        setShowModal(true);

    };


    // ======================================
    // FORM CHANGE
    // ======================================

    const handleChange = event => {

        const {
            name,
            value
        } = event.target;


        setFormData(previous => ({
            ...previous,
            [name]: value
        }));

    };


    // ======================================
    // SAVE
    // ======================================

    const handleSubmit = async event => {

        event.preventDefault();


        if (
            !formData.test_code.trim() ||
            !formData.test_name.trim()
        ) {

            alert(
                "Test Code and Test Name are required."
            );

            return;

        }


        try {

            setSaving(true);


            if (editingTest) {

                await updateTest(
                    editingTest.id,
                    formData
                );

            } else {

                await addTest(formData);

            }


            setShowModal(false);

            setFormData(emptyForm);

            setEditingTest(null);


            await loadTests();

        } catch (err) {

            alert(
                err.message ||
                "Unable to save test."
            );

        } finally {

            setSaving(false);

        }

    };


    // ======================================
    // DELETE
    // ======================================

    const handleDelete = async test => {

        const confirmed =
            window.confirm(
                `Are you sure you want to delete "${test.test_name}"?`
            );


        if (!confirmed) {
            return;
        }


        try {

            setDeleteLoading(test.id);


            await deleteTest(test.id);


            await loadTests();


            if (
                paginatedTests.length === 1 &&
                currentPage > 1
            ) {

                setCurrentPage(
                    currentPage - 1
                );

            }

        } catch (err) {

            alert(
                err.message ||
                "Unable to delete test."
            );

        } finally {

            setDeleteLoading(null);

        }

    };


    // ======================================
    // PAGE BUTTONS
    // ======================================

    const pageNumbers =
        Array.from(
            {
                length: totalPages
            },
            (_, index) => index + 1
        );


    return (

        <div className="tests-page">

            {/* HEADER */}

            <header className="page-header">

                <div>

                    <h1>Tests</h1>

                    <p>
                        Manage all pathology
                        tests available in your
                        laboratory.
                    </p>

                </div>


                <div className="page-actions">

                    <button
                        className="secondary-btn"
                        onClick={loadTests}
                        disabled={loading}
                    >
                        ↻ Refresh
                    </button>


                    <button
                        className="primary-btn"
                        onClick={handleAdd}
                    >
                        + Add New Test
                    </button>

                </div>

            </header>


            {/* STATISTICS */}

            <section className="test-stats">

                <div className="mini-card">

                    <span>
                        Total Tests
                    </span>

                    <strong>
                        {tests.length}
                    </strong>

                </div>


                <div className="mini-card">

                    <span>
                        Sample Types
                    </span>

                    <strong>
                        {samples.length}
                    </strong>

                </div>


                <div className="mini-card">

                    <span>
                        Search Results
                    </span>

                    <strong>
                        {filteredTests.length}
                    </strong>

                </div>

            </section>


            {/* FILTER */}

            <section className="filter-card">

                <div className="search-box">

                    <span>🔍</span>

                    <input
                        type="text"
                        placeholder="Search by test code or test name..."
                        value={search}
                        onChange={event =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />

                    {search && (

                        <button
                            className="clear-search"
                            onClick={() =>
                                setSearch("")
                            }
                        >
                            ×
                        </button>

                    )}

                </div>


                <select
                    value={sampleFilter}
                    onChange={event =>
                        setSampleFilter(
                            event.target.value
                        )
                    }
                >

                    <option value="All">
                        All Sample Types
                    </option>

                    {samples.map(sample => (

                        <option
                            key={sample}
                            value={sample}
                        >
                            {sample}
                        </option>

                    ))}

                </select>

            </section>


            {/* TABLE */}

            <section className="card tests-table-card">

                <div className="card-header">

                    <div>

                        <h3>
                            Available Tests
                        </h3>

                        <p>
                            Showing{" "}
                            {sortedTests.length === 0
                                ? 0
                                : (
                                    (currentPage - 1) *
                                        pageSize +
                                    1
                                )}
                            {" - "}
                            {Math.min(
                                currentPage *
                                    pageSize,
                                sortedTests.length
                            )}
                            {" of "}
                            {sortedTests.length}
                        </p>

                    </div>

                </div>


                {loading && (

                    <div className="state-message">

                        <div className="loader"></div>

                        <p>
                            Loading tests...
                        </p>

                    </div>

                )}


                {!loading && error && (

                    <div className="state-message">

                        <div className="error-icon">
                            !
                        </div>

                        <p>
                            {error}
                        </p>

                        <button
                            className="secondary-btn"
                            onClick={loadTests}
                        >
                            Try Again
                        </button>

                    </div>

                )}


                {!loading &&
                    !error &&
                    sortedTests.length === 0 && (

                        <div className="state-message">

                            <div className="empty-icon">
                                🧪
                            </div>

                            <h3>
                                No tests found
                            </h3>

                            <p>
                                Try changing your
                                search or filter.
                            </p>

                        </div>

                    )}


                {!loading &&
                    !error &&
                    sortedTests.length > 0 && (

                        <>

                            <div className="table-wrapper">

                                <table className="tests-table">

                                    <thead>

                                        <tr>

                                            <th
                                                onClick={() =>
                                                    handleSort(
                                                        "test_code"
                                                    )
                                                }
                                            >
                                                Test Code{" "}
                                                <span>
                                                    {getSortIcon(
                                                        "test_code"
                                                    )}
                                                </span>
                                            </th>


                                            <th
                                                onClick={() =>
                                                    handleSort(
                                                        "test_name"
                                                    )
                                                }
                                            >
                                                Test Name{" "}
                                                <span>
                                                    {getSortIcon(
                                                        "test_name"
                                                    )}
                                                </span>
                                            </th>


                                            <th
                                                onClick={() =>
                                                    handleSort(
                                                        "sample_type"
                                                    )
                                                }
                                            >
                                                Sample{" "}
                                                <span>
                                                    {getSortIcon(
                                                        "sample_type"
                                                    )}
                                                </span>
                                            </th>


                                            <th>
                                                Vial Name
                                            </th>


                                            <th>
                                                Vial Color
                                            </th>


                                            <th
                                                onClick={() =>
                                                    handleSort(
                                                        "price"
                                                    )
                                                }
                                            >
                                                Price{" "}
                                                <span>
                                                    {getSortIcon(
                                                        "price"
                                                    )}
                                                </span>
                                            </th>


                                            <th>
                                                Reference Range
                                            </th>


                                            <th>
                                                Unit
                                            </th>


                                            <th>
                                                Actions
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {paginatedTests.map(
                                            test => (

                                                <tr
                                                    key={
                                                        test.id
                                                    }
                                                >

                                                    <td>

                                                        <span className="test-code">
                                                            {
                                                                test.test_code
                                                            }
                                                        </span>

                                                    </td>


                                                    <td>

                                                        <strong>
                                                            {
                                                                test.test_name
                                                            }
                                                        </strong>

                                                    </td>


                                                    <td>

                                                        <span className="sample-badge">
                                                            {
                                                                test.sample_type ||
                                                                "-"
                                                            }
                                                        </span>

                                                    </td>


                                                    <td>
                                                        {
                                                            test.vial_name ||
                                                            "-"
                                                        }
                                                    </td>


                                                    <td>

                                                        <div className="vial-color">

                                                            <span
                                                                className="vial-dot"
                                                                style={{
                                                                    backgroundColor:
                                                                        getVialColor(
                                                                            test.vial_color
                                                                        )
                                                                }}
                                                            ></span>

                                                            {
                                                                test.vial_color ||
                                                                "-"
                                                            }

                                                        </div>

                                                    </td>


                                                    <td>

                                                        <strong className="price">

                                                            ₹
                                                            {Number(
                                                                test.price ||
                                                                0
                                                            ).toLocaleString(
                                                                "en-IN"
                                                            )}

                                                        </strong>

                                                    </td>


                                                    <td>
                                                        {
                                                            test.reference_range ||
                                                            "-"
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            test.unit ||
                                                            "-"
                                                        }
                                                    </td>


                                                    <td>

                                                        <div className="row-actions">

                                                            <button
                                                                className="edit-btn"
                                                                title="Edit Test"
                                                                onClick={() =>
                                                                    handleEdit(
                                                                        test
                                                                    )
                                                                }
                                                            >
                                                                ✏️
                                                            </button>


                                                            <button
                                                                className="delete-btn"
                                                                title="Delete Test"
                                                                disabled={
                                                                    deleteLoading ===
                                                                    test.id
                                                                }
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        test
                                                                    )
                                                                }
                                                            >
                                                                {deleteLoading ===
                                                                test.id
                                                                    ? "..."
                                                                    : "🗑️"}
                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            </div>


                            {/* PAGINATION */}

                            <div className="pagination">

                                <span className="pagination-info">

                                    Page{" "}
                                    {currentPage}
                                    {" of "}
                                    {totalPages}

                                </span>


                                <div className="pagination-buttons">

                                    <button
                                        disabled={
                                            currentPage ===
                                            1
                                        }
                                        onClick={() =>
                                            setCurrentPage(
                                                currentPage -
                                                    1
                                            )
                                        }
                                    >
                                        ←
                                    </button>


                                    {pageNumbers.map(
                                        page => (

                                            <button
                                                key={page}
                                                className={
                                                    currentPage ===
                                                    page
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setCurrentPage(
                                                        page
                                                    )
                                                }
                                            >
                                                {page}
                                            </button>

                                        )
                                    )}


                                    <button
                                        disabled={
                                            currentPage ===
                                            totalPages
                                        }
                                        onClick={() =>
                                            setCurrentPage(
                                                currentPage +
                                                    1
                                            )
                                        }
                                    >
                                        →
                                    </button>

                                </div>

                            </div>

                        </>

                    )}

            </section>


            {/* ADD / EDIT MODAL */}

            {showModal && (

                <div
                    className="modal-overlay"
                    onMouseDown={event => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {

                            setShowModal(false);

                        }

                    }}
                >

                    <div className="modal">

                        <div className="modal-header">

                            <div>

                                <h2>
                                    {editingTest
                                        ? "Edit Test"
                                        : "Add New Test"}
                                </h2>

                                <p>
                                    Enter test information
                                    below.
                                </p>

                            </div>


                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowModal(
                                        false
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                        >

                            <div className="form-grid">

                                <div className="form-group">

                                    <label>
                                        Test Code *
                                    </label>

                                    <input
                                        name="test_code"
                                        value={
                                            formData.test_code
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. CBC-HB"
                                        required
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Test Name *
                                    </label>

                                    <input
                                        name="test_name"
                                        value={
                                            formData.test_name
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Hemoglobin"
                                        required
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Sample Type
                                    </label>

                                    <input
                                        name="sample_type"
                                        value={
                                            formData.sample_type
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. EDTA"
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Vial Name
                                    </label>

                                    <input
                                        name="vial_name"
                                        value={
                                            formData.vial_name
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. EDTA Tube"
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Vial Color
                                    </label>

                                    <input
                                        name="vial_color"
                                        value={
                                            formData.vial_color
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Purple"
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Price (₹)
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="price"
                                        value={
                                            formData.price
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="100"
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Reference Range
                                    </label>

                                    <input
                                        name="reference_range"
                                        value={
                                            formData.reference_range
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. 13-17"
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Unit
                                    </label>

                                    <input
                                        name="unit"
                                        value={
                                            formData.unit
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. g/dL"
                                    />

                                </div>

                            </div>


                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() =>
                                        setShowModal(
                                            false
                                        )
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="primary-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingTest
                                            ? "Update Test"
                                            : "Add Test"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>

    );

}


function getVialColor(color) {

    if (!color) {
        return "#d1d5db";
    }


    const value =
        color.toLowerCase();


    if (value.includes("purple")) {
        return "#8b5cf6";
    }


    if (value.includes("yellow")) {
        return "#facc15";
    }


    if (value.includes("red")) {
        return "#ef4444";
    }


    if (value.includes("blue")) {
        return "#3b82f6";
    }


    if (value.includes("green")) {
        return "#22c55e";
    }


    return "#9ca3af";
}


export default Tests;