import { useEffect, useMemo, useState } from "react";
import "./LabOrders.css";

const API_URL = "http://localhost:5000/api";
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
  };
};

const ORDERS_PER_PAGE = 5;
const TESTS_PER_PAGE = 5;

function LabOrders() {
    // =====================================================
    // ORDERS
    // =====================================================

    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // =====================================================
    // VIEW
    // =====================================================

    const [viewOrder, setViewOrder] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    // =====================================================
    // EDIT ORDER
    // =====================================================

    const [editOrder, setEditOrder] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);

    const [patients, setPatients] = useState([]);
    const [tests, setTests] = useState([]);

    const [editPatientId, setEditPatientId] = useState("");
    const [selectedTests, setSelectedTests] = useState([]);

    const [testSearch, setTestSearch] = useState("");
    const [testPage, setTestPage] = useState(1);

    // =====================================================
    // REPORT / RESULTS
    // =====================================================

    const [reportOrder, setReportOrder] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [savingReport, setSavingReport] = useState(false);

    const [reportData, setReportData] = useState(null);
    const [resultRows, setResultRows] = useState([]);

    const [pathologistName, setPathologistName] = useState("");
    const [reportRemarks, setReportRemarks] = useState("");

    // =====================================================
    // LOAD ORDERS
    // =====================================================

    const loadOrders = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(`${API_URL}/lab-orders`, {
                headers: getAuthHeaders(),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        `Failed to load lab orders (${response.status})`
                );
            }

            if (!Array.isArray(data)) {
                throw new Error("Invalid lab orders response");
            }

            setOrders(data);

            setCurrentPage((page) => {
                const total = Math.max(
                    1,
                    Math.ceil(data.length / ORDERS_PER_PAGE)
                );

                return Math.min(page, total);
            });
        } catch (err) {
            console.error("Load lab orders error:", err);
            setError(err.message || "Failed to load lab orders");
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // LOAD PATIENTS
    // =====================================================

    const loadPatients = async () => {
        try {
            const response = await fetch(`${API_URL}/patients`, {
                headers: getAuthHeaders(),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load patients"
                );
            }

            setPatients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Load patients error:", err);
        }
    };

    // =====================================================
    // LOAD TESTS
    // =====================================================

    const loadTests = async () => {
        try {
            const response = await fetch(`${API_URL}/tests`, {
                headers: getAuthHeaders(),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load tests"
                );
            }

            setTests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Load tests error:", err);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {
        loadOrders();
        loadPatients();
        loadTests();
    }, []);

    // =====================================================
    // SEARCH
    // =====================================================

    const filteredOrders = useMemo(() => {
        const searchText = search.toLowerCase().trim();

        if (!searchText) {
            return orders;
        }

        return orders.filter((order) => {
            return (
                String(order.order_no || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(order.patient_name || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(order.patient_id || "")
                    .toLowerCase()
                    .includes(searchText)
            );
        });
    }, [orders, search]);

    // =====================================================
    // ORDER PAGINATION
    // =====================================================

    const totalPages = Math.max(
        1,
        Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)
    );

    const startIndex =
        (currentPage - 1) * ORDERS_PER_PAGE;

    const paginatedOrders = filteredOrders.slice(
        startIndex,
        startIndex + ORDERS_PER_PAGE
    );

    // =====================================================
    // SEARCH CHANGE
    // =====================================================

    const handleSearch = (event) => {
        setSearch(event.target.value);
        setCurrentPage(1);
    };

    // =====================================================
    // GET ORDER DETAILS
    // =====================================================

    const getOrderDetails = async (orderId) => {
        const response = await fetch(
            `${API_URL}/lab-orders/${orderId}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load lab order"
            );
        }

        return data;
    };

    // =====================================================
    // VIEW ORDER
    // =====================================================

    const handleViewOrder = async (orderId) => {
        try {
            setViewLoading(true);
            setError("");
            setViewOrder(null);

            const data = await getOrderDetails(orderId);

            setViewOrder(data);
        } catch (err) {
            console.error("View lab order error:", err);

            setError(
                err.message || "Failed to load lab order"
            );
        } finally {
            setViewLoading(false);
        }
    };

    // =====================================================
    // CLOSE VIEW
    // =====================================================

    const closeView = () => {
        setViewOrder(null);
    };

    // =====================================================
    // OPEN EDIT
    // =====================================================

    const handleEditOrder = async (orderId) => {
        try {
            setEditLoading(true);
            setError("");
            setEditOrder(null);

            const data = await getOrderDetails(orderId);

            setEditOrder(data);

            setEditPatientId(
                String(data.order?.patient_id || "")
            );

            setSelectedTests(
                Array.isArray(data.tests)
                    ? data.tests
                          .map((test) => Number(test.test_id))
                          .filter(Boolean)
                    : []
            );

            setTestSearch("");
            setTestPage(1);
        } catch (err) {
            console.error("Edit order error:", err);

            setError(
                err.message || "Failed to load order"
            );
        } finally {
            setEditLoading(false);
        }
    };

    // =====================================================
    // CLOSE EDIT
    // =====================================================

    const closeEdit = () => {
        if (savingEdit) {
            return;
        }

        setEditOrder(null);
        setEditPatientId("");
        setSelectedTests([]);
        setTestSearch("");
        setTestPage(1);
    };

    // =====================================================
    // TOGGLE TEST
    // =====================================================

    const toggleTest = (testId) => {
        const id = Number(testId);

        setSelectedTests((previous) => {
            if (previous.includes(id)) {
                return previous.filter(
                    (item) => item !== id
                );
            }

            return [...previous, id];
        });
    };

    // =====================================================
    // TEST SELECTED
    // =====================================================

    const isTestSelected = (testId) => {
        return selectedTests.includes(Number(testId));
    };

    // =====================================================
    // FILTER TESTS
    // =====================================================

    const filteredTests = useMemo(() => {
        const text = testSearch.toLowerCase().trim();

        if (!text) {
            return tests;
        }

        return tests.filter((test) => {
            return (
                String(test.test_code || "")
                    .toLowerCase()
                    .includes(text) ||
                String(test.test_name || "")
                    .toLowerCase()
                    .includes(text)
            );
        });
    }, [tests, testSearch]);

    // =====================================================
    // TEST PAGINATION
    // =====================================================

    const totalTestPages = Math.max(
        1,
        Math.ceil(
            filteredTests.length / TESTS_PER_PAGE
        )
    );

    const testStartIndex =
        (testPage - 1) * TESTS_PER_PAGE;

    const paginatedTests = filteredTests.slice(
        testStartIndex,
        testStartIndex + TESTS_PER_PAGE
    );

    // =====================================================
    // TEST SEARCH
    // =====================================================

    const handleTestSearch = (event) => {
        setTestSearch(event.target.value);
        setTestPage(1);
    };

    // =====================================================
    // EDIT TOTAL
    // =====================================================

    const editTotalAmount = useMemo(() => {
        return tests
            .filter((test) =>
                selectedTests.includes(Number(test.id))
            )
            .reduce(
                (total, test) =>
                    total + Number(test.price || 0),
                0
            );
    }, [tests, selectedTests]);

    // =====================================================
    // SAVE EDIT
    // =====================================================

    const handleSaveEdit = async () => {
        if (!editOrder?.order?.id) {
            return;
        }

        if (!editPatientId) {
            setError("Please select a patient");
            return;
        }

        if (selectedTests.length === 0) {
            setError("Please select at least one test");
            return;
        }

        try {
            setSavingEdit(true);
            setError("");

            const orderId = editOrder.order.id;

            const payload = {
                patient_id: editPatientId,
                test_ids: selectedTests.map((test) => test.id),
            };

            console.log("PUT payload:", payload);

            const response = await fetch(
                `${API_URL}/lab-orders/${orderId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to update lab order"
                );
            }

            alert("Lab order updated successfully");

            setEditOrder(null);
            loadOrders();

        } catch (error) {
            console.error("Save edit error:", error);
            setError(error.message || "Failed to save changes");
        } finally {
            setSavingEdit(false);
        }
    };

    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (date) => {
        if (!date) {
            return "-";
        }

        const value = String(date);

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] =
                value.split("-");

            return `${day}/${month}/${year}`;
        }

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return parsed.toLocaleDateString("en-IN");
    };

    // =====================================================
    // FORMAT TIME
    // =====================================================

    const formatTime = (time) => {
        if (!time) {
            return "-";
        }

        return String(time).substring(0, 5);
    };

    // =====================================================
    // FORMAT MONEY
    // =====================================================

    const formatMoney = (amount) => {
        return Number(amount || 0).toFixed(2);
    };

    // =====================================================
    // ESCAPE HTML
    // =====================================================

    const escapeHtml = (value) => {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // =====================================================
    // GENERATE REPORT
    // =====================================================

    const handleGenerateReport = async (orderId) => {
        try {
            setError("");

            const data = await getOrderDetails(orderId);

            const order = data.order || {};
            const orderTests = Array.isArray(data.tests)
                ? data.tests
                : [];

            const testRows = orderTests
                .map(
                    (test, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(
                                test.test_code || "-"
                            )}</td>
                            <td>${escapeHtml(
                                test.test_name || "-"
                            )}</td>
                            <td>${escapeHtml(
                                test.unit || "-"
                            )}</td>
                            <td>${escapeHtml(
                                test.reference_range || "-"
                            )}</td>
                            <td></td>
                        </tr>
                    `
                )
                .join("");

            const reportWindow = window.open(
                "",
                "_blank",
                "width=1000,height=800"
            );

            if (!reportWindow) {
                alert(
                    "Please allow pop-ups to generate the report."
                );
                return;
            }

            reportWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>
                        Lab Report - ${escapeHtml(
                            order.order_no || ""
                        )}
                    </title>

                    <style>
                        * {
                            box-sizing: border-box;
                        }

                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            margin: 0;
                            padding: 30px;
                            color: #222;
                        }

                        .report {
                            max-width: 900px;
                            margin: auto;
                        }

                        .header {
                            text-align: center;
                            border-bottom: 2px solid #222;
                            padding-bottom: 15px;
                            margin-bottom: 20px;
                        }

                        .header h1 {
                            margin: 0 0 5px;
                            font-size: 28px;
                        }

                        .header p {
                            margin: 3px 0;
                            color: #555;
                        }

                        .patient-section {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 10px;
                            margin-bottom: 25px;
                        }

                        .info {
                            border: 1px solid #ddd;
                            padding: 10px;
                        }

                        .info label {
                            display: block;
                            font-size: 11px;
                            color: #666;
                            margin-bottom: 4px;
                        }

                        .info strong {
                            font-size: 14px;
                        }

                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 15px;
                        }

                        th,
                        td {
                            border: 1px solid #ccc;
                            padding: 9px;
                            font-size: 13px;
                            text-align: left;
                        }

                        th {
                            background: #f4f4f4;
                        }

                        .result-column {
                            width: 150px;
                        }

                        .footer {
                            margin-top: 60px;
                            display: flex;
                            justify-content: space-between;
                        }

                        .signature {
                            width: 200px;
                            text-align: center;
                            padding-top: 35px;
                            border-top: 1px solid #222;
                        }

                        .print-btn {
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            padding: 10px 20px;
                            border: none;
                            background: #111827;
                            color: white;
                            border-radius: 6px;
                            cursor: pointer;
                        }

                        @media print {
                            body {
                                padding: 10px;
                            }

                            .print-btn {
                                display: none;
                            }
                        }
                    </style>
                </head>

                <body>

                    <button
                        class="print-btn"
                        onclick="window.print()"
                    >
                        Print Report
                    </button>

                    <div class="report">

                        <div class="header">
                            <h1>PATHOLOGY LAB</h1>

                            <p>
                                Laboratory Investigation Report
                            </p>

                            <p>
                                Order No:
                                <strong>
                                    ${escapeHtml(
                                        order.order_no || "-"
                                    )}
                                </strong>
                            </p>
                        </div>

                        <div class="patient-section">

                            <div class="info">
                                <label>Patient Name</label>

                                <strong>
                                    ${escapeHtml(
                                        order.patient_name || "-"
                                    )}
                                </strong>
                            </div>

                            <div class="info">
                                <label>Patient ID</label>

                                <strong>
                                    #${escapeHtml(
                                        order.patient_id || "-"
                                    )}
                                </strong>
                            </div>

                            <div class="info">
                                <label>Age</label>

                                <strong>
                                    ${escapeHtml(
                                        order.age ?? "-"
                                    )}
                                </strong>
                            </div>

                            <div class="info">
                                <label>Gender</label>

                                <strong>
                                    ${escapeHtml(
                                        order.gender || "-"
                                    )}
                                </strong>
                            </div>

                            <div class="info">
                                <label>Mobile</label>

                                <strong>
                                    ${escapeHtml(
                                        order.mobile || "-"
                                    )}
                                </strong>
                            </div>

                            <div class="info">
                                <label>Report Date</label>

                                <strong>
                                    ${formatDate(
                                        order.order_date
                                    )}
                                </strong>
                            </div>

                        </div>

                        <h3>
                            Investigation Results
                        </h3>

                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Test Code</th>
                                    <th>Test Name</th>
                                    <th>Unit</th>
                                    <th>
                                        Reference Range
                                    </th>
                                    <th class="result-column">
                                        Result
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                ${
                                    testRows ||
                                    `
                                    <tr>
                                        <td colspan="6">
                                            No tests found
                                        </td>
                                    </tr>
                                    `
                                }
                            </tbody>
                        </table>

                        <div class="footer">

                            <div class="signature">
                                Lab Technician
                            </div>

                            <div class="signature">
                                Authorized Signatory
                            </div>

                        </div>

                    </div>

                </body>
                </html>
            `);

            reportWindow.document.close();

            setTimeout(() => {
                reportWindow.focus();
            }, 300);
        } catch (err) {
            console.error(
                "Generate report error:",
                err
            );

            setError(
                err.message ||
                    "Failed to generate report"
            );
        }
    };

    // =====================================================
    // OPEN REPORT RESULT MODAL
    // =====================================================

    const handleOpenReport = async (orderId) => {
        try {
            setReportLoading(true);
            setError("");

            const response = await fetch(
                `${API_URL}/reports/order/${orderId}`,
                {
                    headers: getAuthHeaders(),
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to load report"
                );
            }

            setReportData(data);

            const order = data.order || {};
            const existingResults =
                Array.isArray(data.results)
                    ? data.results
                    : [];

            const orderTests =
                Array.isArray(data.tests)
                    ? data.tests
                    : [];

            const rows = orderTests.map((test) => {
                const existing =
                    existingResults.find(
                        (item) =>
                            Number(item.test_id) ===
                            Number(test.test_id || test.id)
                    );

                return {
                    test_id: Number(
                        test.test_id || test.id
                    ),

                    test_code:
                        test.test_code || "-",

                    test_name:
                        test.test_name || "-",

                    unit:
                        existing?.unit ??
                        test.unit ??
                        "",

                    reference_range:
                        existing?.reference_range ??
                        test.reference_range ??
                        "",

                    result_value:
                        existing?.result_value ?? "",

                    remarks:
                        existing?.remarks ?? "",

                    status: "NORMAL",
                };
            });

            setResultRows(
                rows.map((row) => ({
                    ...row,
                    status: getResultStatus(
                        row.result_value,
                        row.reference_range
                    ),
                }))
            );

            setPathologistName(
                data.report?.pathologist_name || ""
            );

            setReportRemarks(
                data.report?.remarks || ""
            );

            setReportOrder(order);
        } catch (err) {
            console.error(
                "Open report error:",
                err
            );

            setError(
                err.message ||
                    "Failed to load report"
            );
        } finally {
            setReportLoading(false);
        }
    };

    // =====================================================
    // RESULT STATUS
    // =====================================================

    const getResultStatus = (
        value,
        referenceRange
    ) => {
        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return "PENDING";
        }

        const resultNumber = parseFloat(value);

        if (Number.isNaN(resultNumber)) {
            return "NORMAL";
        }

        const range = String(
            referenceRange || ""
        ).trim();

        /*
         * Supported examples:
         *
         * 13.0 - 17.0
         * 4.5-5.5
         * 10 - 20
         * < 10
         * > 50
         */

        const rangeMatch = range.match(
            /(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/
        );

        if (rangeMatch) {
            const low = Number(rangeMatch[1]);
            const high = Number(rangeMatch[2]);

            if (resultNumber < low) {
                return "LOW";
            }

            if (resultNumber > high) {
                return "HIGH";
            }

            return "NORMAL";
        }

        const lessMatch = range.match(
            /<\s*(-?\d+(?:\.\d+)?)/
        );

        if (lessMatch) {
            const max = Number(lessMatch[1]);

            return resultNumber < max
                ? "NORMAL"
                : "HIGH";
        }

        const greaterMatch = range.match(
            />\s*(-?\d+(?:\.\d+)?)/
        );

        if (greaterMatch) {
            const min = Number(greaterMatch[1]);

            return resultNumber > min
                ? "NORMAL"
                : "LOW";
        }

        return "NORMAL";
    };

    // =====================================================
    // CHANGE RESULT
    // =====================================================

    const handleResultChange = (
        index,
        value
    ) => {
        setResultRows((previous) =>
            previous.map((row, rowIndex) => {
                if (rowIndex !== index) {
                    return row;
                }

                return {
                    ...row,
                    result_value: value,
                    status: getResultStatus(
                        value,
                        row.reference_range
                    ),
                };
            })
        );
    };

    // =====================================================
    // CHANGE RESULT REMARK
    // =====================================================

    const handleResultRemarkChange = (
        index,
        value
    ) => {
        setResultRows((previous) =>
            previous.map((row, rowIndex) => {
                if (rowIndex !== index) {
                    return row;
                }

                return {
                    ...row,
                    remarks: value,
                };
            })
        );
    };

    // =====================================================
    // SAVE REPORT
    // =====================================================

    const handleSaveReport = async (
        status = "Draft"
    ) => {
        if (!reportOrder?.id) {
            return;
        }

        const incomplete = resultRows.some(
            (row) =>
                String(
                    row.result_value || ""
                ).trim() === ""
        );

        if (
            status === "Completed" &&
            incomplete
        ) {
            setError(
                "Please enter result for all tests before completing the report."
            );
            return;
        }

        try {
            setSavingReport(true);
            setError("");
            const response = await fetch(`${API_URL}/reports`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        order_id: Number(reportOrder.id),
                        patient_id: Number(reportOrder.patient_id),
                        status,
                        pathologist_name: pathologistName,
                        remarks: reportRemarks,
                        results: resultRows.map((row) => ({
                            test_id: Number(row.test_id),
                            result_value: row.result_value,
                            unit: row.unit,
                            reference_range: row.reference_range,
                            remarks: row.remarks,
                        })),
                    }),
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to save report"
                );
            }

            setReportData(data);

            await loadOrders();

            alert(
                status === "Completed"
                    ? "Report completed successfully."
                    : "Report saved as draft."
            );

            setReportOrder(null);
            setReportData(null);
            setResultRows([]);
            setPathologistName("");
            setReportRemarks("");
        } catch (err) {
            console.error(
                "Save report error:",
                err
            );

            setError(
                err.message ||
                    "Failed to save report"
            );
        } finally {
            setSavingReport(false);
        }
    };

    // =====================================================
    // CLOSE REPORT
    // =====================================================

    const closeReport = () => {
        if (savingReport) {
            return;
        }

        setReportOrder(null);
        setReportData(null);
        setResultRows([]);
        setPathologistName("");
        setReportRemarks("");
    };

    // =====================================================
    // PRINT SAVED REPORT
    // =====================================================

    const handlePrintReport = () => {
        if (!reportOrder) {
            return;
        }

        const rows = resultRows
            .map((row, index) => {
                const status =
                    getResultStatus(
                        row.result_value,
                        row.reference_range
                    );

                let statusClass = "";

                if (status === "HIGH") {
                    statusClass = "high";
                }

                if (status === "LOW") {
                    statusClass = "low";
                }

                if (status === "NORMAL") {
                    statusClass = "normal";
                }

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(
                            row.test_code
                        )}</td>
                        <td>${escapeHtml(
                            row.test_name
                        )}</td>
                        <td>${escapeHtml(
                            row.result_value || "-"
                        )}</td>
                        <td>${escapeHtml(
                            row.unit || "-"
                        )}</td>
                        <td>${escapeHtml(
                            row.reference_range || "-"
                        )}</td>
                        <td class="${statusClass}">
                            ${status}
                        </td>
                    </tr>
                `;
            })
            .join("");

        const printWindow = window.open(
            "",
            "_blank",
            "width=1100,height=800"
        );

        if (!printWindow) {
            alert(
                "Please allow pop-ups to print the report."
            );
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>

            <html>

            <head>

                <title>
                    Pathology Report -
                    ${escapeHtml(
                        reportOrder.patient_name
                    )}
                </title>

                <style>

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        font-family:
                            Arial,
                            Helvetica,
                            sans-serif;

                        padding: 30px;

                        color: #222;
                    }

                    .report {
                        max-width: 1000px;
                        margin: auto;
                    }

                    .header {
                        text-align: center;

                        border-bottom:
                            2px solid #111;

                        padding-bottom: 15px;

                        margin-bottom: 20px;
                    }

                    .header h1 {
                        margin: 0;
                        font-size: 28px;
                    }

                    .header p {
                        margin: 5px 0;
                    }

                    .patient {
                        display: grid;

                        grid-template-columns:
                            repeat(2, 1fr);

                        gap: 10px;

                        margin-bottom: 25px;
                    }

                    .info {
                        border:
                            1px solid #ddd;

                        padding: 10px;
                    }

                    .info label {
                        display: block;

                        color: #666;

                        font-size: 11px;

                        margin-bottom: 4px;
                    }

                    table {
                        width: 100%;

                        border-collapse:
                            collapse;
                    }

                    th,
                    td {
                        border:
                            1px solid #ccc;

                        padding: 9px;

                        font-size: 12px;
                    }

                    th {
                        background: #f4f4f4;
                    }

                    .high,
                    .low {
                        color: #dc2626;
                        font-weight: bold;
                    }

                    .normal {
                        color: #15803d;
                        font-weight: bold;
                    }

                    .footer {
                        margin-top: 70px;

                        display: flex;

                        justify-content:
                            space-between;
                    }

                    .signature {
                        width: 220px;

                        text-align: center;

                        border-top:
                            1px solid #222;

                        padding-top: 10px;
                    }

                    .print-btn {
                        position: fixed;

                        right: 20px;

                        top: 20px;

                        padding: 10px 18px;

                        background: #111827;

                        color: white;

                        border: none;

                        border-radius: 6px;

                        cursor: pointer;
                    }

                    @media print {
                        .print-btn {
                            display: none;
                        }

                        body {
                            padding: 10px;
                        }
                    }

                </style>

            </head>

            <body>

                <button
                    class="print-btn"
                    onclick="window.print()"
                >
                    Print
                </button>

                <div class="report">

                    <div class="header">

                        <h1>
                            PATHOLOGY LAB
                        </h1>

                        <p>
                            Laboratory Investigation Report
                        </p>

                        <p>
                            Report No:
                            <strong>
                                ${escapeHtml(
                                    reportData
                                        ?.report
                                        ?.report_no ||
                                    "-"
                                )}
                            </strong>
                        </p>

                    </div>

                    <div class="patient">

                        <div class="info">
                            <label>
                                Patient Name
                            </label>

                            <strong>
                                ${escapeHtml(
                                    reportOrder.patient_name
                                )}
                            </strong>
                        </div>

                        <div class="info">
                            <label>
                                Patient ID
                            </label>

                            <strong>
                                #${escapeHtml(
                                    reportOrder.patient_id
                                )}
                            </strong>
                        </div>

                        <div class="info">
                            <label>
                                Age
                            </label>

                            <strong>
                                ${escapeHtml(
                                    reportOrder.age ??
                                    "-"
                                )}
                            </strong>
                        </div>

                        <div class="info">
                            <label>
                                Gender
                            </label>

                            <strong>
                                ${escapeHtml(
                                    reportOrder.gender ||
                                    "-"
                                )}
                            </strong>
                        </div>

                        <div class="info">
                            <label>
                                Order No
                            </label>

                            <strong>
                                ${escapeHtml(
                                    reportOrder.order_no
                                )}
                            </strong>
                        </div>

                        <div class="info">
                            <label>
                                Report Date
                            </label>

                            <strong>
                                ${formatDate(
                                    reportOrder.order_date
                                )}
                            </strong>
                        </div>

                    </div>

                    <h3>
                        Investigation Results
                    </h3>

                    <table>

                        <thead>

                            <tr>
                                <th>#</th>
                                <th>Test Code</th>
                                <th>Test Name</th>
                                <th>Result</th>
                                <th>Unit</th>
                                <th>Reference Range</th>
                                <th>Status</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${rows}

                        </tbody>

                    </table>

                    ${
                        reportRemarks
                            ? `
                                <div style="margin-top:20px">
                                    <strong>
                                        Remarks:
                                    </strong>

                                    <div>
                                        ${escapeHtml(
                                            reportRemarks
                                        )}
                                    </div>
                                </div>
                            `
                            : ""
                    }

                    <div class="footer">

                        <div class="signature">
                            Lab Technician
                        </div>

                        <div class="signature">
                            ${
                                escapeHtml(
                                    pathologistName ||
                                    "Authorized Signatory"
                                )
                            }
                        </div>

                    </div>

                </div>

            </body>

            </html>
        `);

        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
        }, 300);
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="lab-orders-page">

            {/* HEADER */}

            <div className="page-header">

                <div>
                    <h2>Lab Orders</h2>

                    <p>
                        Manage laboratory orders and patient reports
                    </p>
                </div>

                <button
                    className="refresh-btn"
                    onClick={loadOrders}
                    disabled={loading}
                >
                    {loading
                        ? "Loading..."
                        : "Refresh"}
                </button>

            </div>

            {/* ERROR */}

            {error && (
                <div className="error-message">

                    <span>
                        {error}
                    </span>

                    <button
                        onClick={() =>
                            setError("")
                        }
                        type="button"
                    >
                        ×
                    </button>

                </div>
            )}

            {/* SEARCH */}

            <div className="search-section">

                <div className="search-box">

                    <span className="search-icon">
                        🔎
                    </span>

                    <input
                        type="text"
                        value={search}
                        onChange={handleSearch}
                        placeholder="Search Order No, Patient Name or Patient ID..."
                    />

                    {search && (
                        <button
                            type="button"
                            className="clear-search"
                            onClick={() => {
                                setSearch("");
                                setCurrentPage(1);
                            }}
                        >
                            ×
                        </button>
                    )}

                </div>

                <span className="order-count">

                    {filteredOrders.length} order
                    {filteredOrders.length !== 1
                        ? "s"
                        : ""}

                </span>

            </div>

            {/* TABLE */}

            <div className="table-container">

                <table>

                    <thead>

                        <tr>
                            <th>#</th>
                            <th>Order No</th>
                            <th>Patient</th>
                            <th>Patient ID</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Tests</th>
                            <th>Total</th>
                            <th>Action</th>
                        </tr>

                    </thead>

                    <tbody>

                        {loading ? (
                            <tr>

                                <td
                                    colSpan="9"
                                    className="empty-row"
                                >

                                    <div className="loading-box">

                                        <div className="spinner"></div>

                                        Loading lab orders...

                                    </div>

                                </td>

                            </tr>
                        ) : paginatedOrders.length ===
                          0 ? (
                            <tr>

                                <td
                                    colSpan="9"
                                    className="empty-row"
                                >

                                    <div className="empty-box">

                                        <div className="empty-icon">
                                            📋
                                        </div>

                                        <strong>
                                            No lab orders found
                                        </strong>

                                        <span>
                                            Try changing your search
                                        </span>

                                    </div>

                                </td>

                            </tr>
                        ) : (
                            paginatedOrders.map(
                                (order, index) => (
                                    <tr key={order.id}>

                                        <td className="serial-number">
                                            {startIndex +
                                                index +
                                                1}
                                        </td>

                                        <td>
                                            <strong className="order-number">
                                                {
                                                    order.order_no
                                                }
                                            </strong>
                                        </td>

                                        <td>

                                            <div className="patient-cell">

                                                <strong>
                                                    {
                                                        order.patient_name ||
                                                        "-"
                                                    }
                                                </strong>

                                            </div>

                                        </td>

                                        <td>

                                            <span className="patient-id">
                                                #
                                                {
                                                    order.patient_id
                                                }
                                            </span>

                                        </td>

                                        <td>
                                            {formatDate(
                                                order.order_date
                                            )}
                                        </td>

                                        <td>
                                            {formatTime(
                                                order.order_time
                                            )}
                                        </td>

                                        <td>

                                            <span className="test-count">

                                                {order.test_count ??
                                                    order.tests_count ??
                                                    "-"}

                                            </span>

                                        </td>

                                        <td>

                                            <strong className="amount">
                                                ₹
                                                {formatMoney(
                                                    order.total_amount
                                                )}
                                            </strong>

                                        </td>

                                        <td>

                                            <div className="action-buttons">

                                                <button
                                                    type="button"
                                                    className="view-btn"
                                                    onClick={() =>
                                                        handleViewOrder(
                                                            order.id
                                                        )
                                                    }
                                                >
                                                    View
                                                </button>

                                                <button
                                                    type="button"
                                                    className="edit-btn"
                                                    onClick={() =>
                                                        handleEditOrder(
                                                            order.id
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="report-btn"
                                                    onClick={() =>
                                                        handleOpenReport(
                                                            order.id
                                                        )
                                                    }
                                                >
                                                    Report
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

            {/* PAGINATION */}

            {filteredOrders.length > 0 && (
                <div className="pagination">

                    <button
                        type="button"
                        disabled={
                            currentPage === 1
                        }
                        onClick={() =>
                            setCurrentPage(
                                (page) =>
                                    Math.max(
                                        1,
                                        page - 1
                                    )
                            )
                        }
                    >
                        ← Previous
                    </button>

                    <span>

                        Page{" "}
                        <strong>
                            {currentPage}
                        </strong>{" "}
                        of{" "}
                        <strong>
                            {totalPages}
                        </strong>

                    </span>

                    <button
                        type="button"
                        disabled={
                            currentPage ===
                            totalPages
                        }
                        onClick={() =>
                            setCurrentPage(
                                (page) =>
                                    Math.min(
                                        totalPages,
                                        page + 1
                                    )
                            )
                        }
                    >
                        Next →
                    </button>

                </div>
            )}

            {/* =================================================
                REPORT RESULT MODAL
            ================================================= */}

            {(reportOrder || reportLoading) && (
                <div
                    className="modal-overlay"
                    onClick={closeReport}
                >

                    <div
                        className="modal report-result-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {reportLoading ? (
                            <div className="modal-loading">

                                <div className="spinner"></div>

                                Loading report...

                            </div>
                        ) : (
                            <>

                                {/* HEADER */}

                                <div className="modal-header">

                                    <div>

                                        <span className="modal-label">
                                            PATIENT REPORT
                                        </span>

                                        <h3>
                                            {
                                                reportOrder?.order_no
                                            }
                                        </h3>

                                    </div>

                                    <button
                                        type="button"
                                        onClick={closeReport}
                                        className="close-btn"
                                        disabled={
                                            savingReport
                                        }
                                    >
                                        ×
                                    </button>

                                </div>

                                {/* PATIENT */}

                                <div className="report-patient-card">

                                    <div>
                                        <span>
                                            Patient
                                        </span>

                                        <strong>
                                            {
                                                reportOrder?.patient_name
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Patient ID
                                        </span>

                                        <strong>
                                            #
                                            {
                                                reportOrder?.patient_id
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Age
                                        </span>

                                        <strong>
                                            {
                                                reportOrder?.age ??
                                                "-"
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Gender
                                        </span>

                                        <strong>
                                            {
                                                reportOrder?.gender ||
                                                "-"
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Order Date
                                        </span>

                                        <strong>
                                            {formatDate(
                                                reportOrder?.order_date
                                            )}
                                        </strong>
                                    </div>

                                </div>

                                {/* REPORT INFO */}

                                <div className="report-meta">

                                    <div className="form-group">

                                        <label>
                                            Pathologist Name
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                pathologistName
                                            }
                                            onChange={(event) =>
                                                setPathologistName(
                                                    event.target
                                                        .value
                                                )
                                            }
                                            placeholder="Enter pathologist name"
                                            disabled={
                                                savingReport
                                            }
                                        />

                                    </div>

                                    <div className="form-group">

                                        <label>
                                            Report Status
                                        </label>

                                        <span
                                            className={`report-status ${
                                                reportData
                                                    ?.report
                                                    ?.status ===
                                                "Completed"
                                                    ? "completed"
                                                    : "draft"
                                            }`}
                                        >
                                            {reportData
                                                ?.report
                                                ?.status ||
                                                "Draft"}
                                        </span>

                                    </div>

                                </div>

                                {/* RESULT TABLE */}

                                <div className="result-section">

                                    <div className="section-title">

                                        <h4>
                                            Investigation Results
                                        </h4>

                                        <span>
                                            {resultRows.length}{" "}
                                            Tests
                                        </span>

                                    </div>

                                    <div className="result-table-wrapper">

                                        <table className="result-table">

                                            <thead>

                                                <tr>
                                                    <th>#</th>
                                                    <th>Test</th>
                                                    <th>Result</th>
                                                    <th>Unit</th>
                                                    <th>
                                                        Reference Range
                                                    </th>
                                                    <th>
                                                        Status
                                                    </th>
                                                    <th>
                                                        Remarks
                                                    </th>
                                                </tr>

                                            </thead>

                                            <tbody>

                                                {resultRows.map(
                                                    (
                                                        row,
                                                        index
                                                    ) => {
                                                        const status =
                                                            getResultStatus(
                                                                row.result_value,
                                                                row.reference_range
                                                            );

                                                        return (
                                                            <tr
                                                                key={`${row.test_id}-${index}`}
                                                                className={`result-row ${status.toLowerCase()}`}
                                                            >

                                                                <td>
                                                                    {
                                                                        index +
                                                                        1
                                                                    }
                                                                </td>

                                                                <td>

                                                                    <div className="report-test">

                                                                        <strong>
                                                                            {
                                                                                row.test_code
                                                                            }
                                                                        </strong>

                                                                        <span>
                                                                            {
                                                                                row.test_name
                                                                            }
                                                                        </span>

                                                                    </div>

                                                                </td>

                                                                <td>

                                                                    <input
                                                                        type="text"
                                                                        className={`result-input ${status.toLowerCase()}`}
                                                                        value={
                                                                            row.result_value
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            handleResultChange(
                                                                                index,
                                                                                event
                                                                                    .target
                                                                                    .value
                                                                            )
                                                                        }
                                                                        placeholder="Enter result"
                                                                        disabled={
                                                                            savingReport ||
                                                                            reportData
                                                                                ?.report
                                                                                ?.status ===
                                                                                "Completed"
                                                                        }
                                                                    />

                                                                </td>

                                                                <td>

                                                                    <span className="unit-text">
                                                                        {
                                                                            row.unit ||
                                                                            "-"
                                                                        }
                                                                    </span>

                                                                </td>

                                                                <td>

                                                                    <span className="reference-text">
                                                                        {
                                                                            row.reference_range ||
                                                                            "-"
                                                                        }
                                                                    </span>

                                                                </td>

                                                                <td>

                                                                    <span
                                                                        className={`result-status ${status.toLowerCase()}`}
                                                                    >
                                                                        {status ===
                                                                        "LOW"
                                                                            ? "↓ LOW"
                                                                            : status ===
                                                                              "HIGH"
                                                                            ? "↑ HIGH"
                                                                            : status ===
                                                                              "PENDING"
                                                                            ? "PENDING"
                                                                            : "✓ NORMAL"}
                                                                    </span>

                                                                </td>

                                                                <td>

                                                                    <input
                                                                        type="text"
                                                                        className="remark-input"
                                                                        value={
                                                                            row.remarks
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            handleResultRemarkChange(
                                                                                index,
                                                                                event
                                                                                    .target
                                                                                    .value
                                                                            )
                                                                        }
                                                                        placeholder="Remark"
                                                                        disabled={
                                                                            savingReport ||
                                                                            reportData
                                                                                ?.report
                                                                                ?.status ===
                                                                                "Completed"
                                                                        }
                                                                    />

                                                                </td>

                                                            </tr>
                                                        );
                                                    }
                                                )}

                                            </tbody>

                                        </table>

                                    </div>

                                </div>

                                {/* GENERAL REMARK */}

                                <div className="form-group report-remarks">

                                    <label>
                                        Report Remarks
                                    </label>

                                    <textarea
                                        value={
                                            reportRemarks
                                        }
                                        onChange={(event) =>
                                            setReportRemarks(
                                                event.target
                                                    .value
                                            )
                                        }
                                        rows="3"
                                        placeholder="Enter general report remarks..."
                                        disabled={
                                            savingReport ||
                                            reportData
                                                ?.report
                                                ?.status ===
                                                "Completed"
                                        }
                                    />

                                </div>

                                {/* LEGEND */}

                                <div className="result-legend">

                                    <span className="legend-title">
                                        Result Status:
                                    </span>

                                    <span className="legend-normal">
                                        ✓ Normal
                                    </span>

                                    <span className="legend-low">
                                        ↓ Low
                                    </span>

                                    <span className="legend-high">
                                        ↑ High
                                    </span>

                                    <span className="legend-pending">
                                        Pending
                                    </span>

                                </div>

                                {/* FOOTER */}

                                <div className="modal-footer">

                                    <div>

                                        <strong>
                                            Report No:{" "}
                                        </strong>

                                        {reportData
                                            ?.report
                                            ?.report_no ||
                                            "Will be generated automatically"}

                                    </div>

                                    <div className="footer-actions">

                                        {reportData
                                            ?.report
                                            ?.status !==
                                            "Completed" && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="secondary-btn"
                                                    onClick={() =>
                                                        handleSaveReport(
                                                            "Draft"
                                                        )
                                                    }
                                                    disabled={
                                                        savingReport
                                                    }
                                                >
                                                    {savingReport
                                                        ? "Saving..."
                                                        : "Save Draft"}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="save-btn"
                                                    onClick={() =>
                                                        handleSaveReport(
                                                            "Completed"
                                                        )
                                                    }
                                                    disabled={
                                                        savingReport
                                                    }
                                                >
                                                    {savingReport
                                                        ? "Saving..."
                                                        : "Complete Report"}
                                                </button>
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            className="print-report-btn"
                                            onClick={
                                                handlePrintReport
                                            }
                                        >
                                            🖨 Print
                                        </button>

                                        <button
                                            type="button"
                                            className="cancel-btn"
                                            onClick={
                                                closeReport
                                            }
                                            disabled={
                                                savingReport
                                            }
                                        >
                                            Close
                                        </button>

                                    </div>

                                </div>

                            </>
                        )}

                    </div>

                </div>
            )}

            {/* =================================================
                VIEW MODAL
            ================================================= */}

            {(viewOrder || viewLoading) && (
                <div
                    className="modal-overlay"
                    onClick={closeView}
                >

                    <div
                        className="modal view-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {viewLoading ? (
                            <div className="modal-loading">

                                <div className="spinner"></div>

                                Loading order details...

                            </div>
                        ) : (
                            <>

                                <div className="modal-header">

                                    <div>

                                        <span className="modal-label">
                                            LAB ORDER
                                        </span>

                                        <h3>
                                            {
                                                viewOrder?.order
                                                    ?.order_no
                                            }
                                        </h3>

                                    </div>

                                    <button
                                        type="button"
                                        onClick={closeView}
                                        className="close-btn"
                                    >
                                        ×
                                    </button>

                                </div>

                                <div className="details-section">

                                    <div className="section-title">

                                        <h4>
                                            Patient Details
                                        </h4>

                                    </div>

                                    <div className="details-grid">

                                        <div className="detail-card">
                                            <label>
                                                Patient Name
                                            </label>

                                            <strong>
                                                {
                                                    viewOrder?.order
                                                        ?.patient_name ||
                                                    "-"
                                                }
                                            </strong>
                                        </div>

                                        <div className="detail-card">
                                            <label>
                                                Patient ID
                                            </label>

                                            <strong>
                                                #
                                                {
                                                    viewOrder?.order
                                                        ?.patient_id ||
                                                    "-"
                                                }
                                            </strong>
                                        </div>

                                        <div className="detail-card">
                                            <label>
                                                Age
                                            </label>

                                            <strong>
                                                {
                                                    viewOrder?.order
                                                        ?.age ??
                                                    "-"
                                                }
                                            </strong>
                                        </div>

                                        <div className="detail-card">
                                            <label>
                                                Gender
                                            </label>

                                            <strong>
                                                {
                                                    viewOrder?.order
                                                        ?.gender ||
                                                    "-"
                                                }
                                            </strong>
                                        </div>

                                        <div className="detail-card">
                                            <label>
                                                Mobile
                                            </label>

                                            <strong>
                                                {
                                                    viewOrder?.order
                                                        ?.mobile ||
                                                    "-"
                                                }
                                            </strong>
                                        </div>

                                        <div className="detail-card detail-card-wide">
                                            <label>
                                                Address
                                            </label>

                                            <strong>
                                                {
                                                    viewOrder?.order
                                                        ?.address ||
                                                    "-"
                                                }
                                            </strong>
                                        </div>

                                    </div>

                                </div>

                                <div className="details-section">

                                    <div className="section-title">

                                        <h4>
                                            Ordered Tests
                                        </h4>

                                    </div>

                                    <div className="tests-table">

                                        <table>

                                            <thead>

                                                <tr>
                                                    <th>#</th>
                                                    <th>
                                                        Test Code
                                                    </th>
                                                    <th>
                                                        Test Name
                                                    </th>
                                                    <th>
                                                        Unit
                                                    </th>
                                                    <th>
                                                        Reference Range
                                                    </th>
                                                    <th>
                                                        Price
                                                    </th>
                                                </tr>

                                            </thead>

                                            <tbody>

                                                {Array.isArray(
                                                    viewOrder?.tests
                                                ) &&
                                                viewOrder.tests.length >
                                                    0 ? (
                                                    viewOrder.tests.map(
                                                        (
                                                            test,
                                                            index
                                                        ) => (
                                                            <tr
                                                                key={
                                                                    test.id ||
                                                                    test.test_id ||
                                                                    index
                                                                }
                                                            >

                                                                <td>
                                                                    {index +
                                                                        1}
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
                                                                    {
                                                                        test.unit ||
                                                                        "-"
                                                                    }
                                                                </td>

                                                                <td>
                                                                    {
                                                                        test.reference_range ||
                                                                        "-"
                                                                    }
                                                                </td>

                                                                <td>
                                                                    ₹
                                                                    {formatMoney(
                                                                        test.price
                                                                    )}
                                                                </td>

                                                            </tr>
                                                        )
                                                    )
                                                ) : (
                                                    <tr>

                                                        <td
                                                            colSpan="6"
                                                            className="empty-tests"
                                                        >
                                                            No tests found
                                                        </td>

                                                    </tr>
                                                )}

                                            </tbody>

                                        </table>

                                    </div>

                                </div>

                                <div className="modal-footer">

                                    <div className="grand-total">

                                        <span>
                                            Total Amount
                                        </span>

                                        <strong>
                                            ₹
                                            {formatMoney(
                                                viewOrder?.order
                                                    ?.total_amount
                                            )}
                                        </strong>

                                    </div>

                                    <div className="footer-actions">

                                        <button
                                            type="button"
                                            className="report-btn large"
                                            onClick={() => {
                                                closeView();

                                                handleOpenReport(
                                                    viewOrder?.order
                                                        ?.id
                                                );
                                            }}
                                        >
                                            Enter Report Result
                                        </button>

                                        <button
                                            type="button"
                                            className="secondary-btn"
                                            onClick={
                                                closeView
                                            }
                                        >
                                            Close
                                        </button>

                                    </div>

                                </div>

                            </>
                        )}

                    </div>

                </div>
            )}

            {/* =================================================
                EDIT MODAL
            ================================================= */}

            {(editOrder || editLoading) && (
                <div
                    className="modal-overlay"
                    onClick={closeEdit}
                >

                    <div
                        className="modal edit-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {editLoading ? (
                            <div className="modal-loading">

                                <div className="spinner"></div>

                                Loading order...

                            </div>
                        ) : (
                            <>

                                <div className="modal-header">

                                    <div>

                                        <span className="modal-label">
                                            EDIT LAB ORDER
                                        </span>

                                        <h3>
                                            {
                                                editOrder?.order
                                                    ?.order_no
                                            }
                                        </h3>

                                    </div>

                                    <button
                                        type="button"
                                        onClick={closeEdit}
                                        className="close-btn"
                                        disabled={
                                            savingEdit
                                        }
                                    >
                                        ×
                                    </button>

                                </div>

                                <div className="details-section">

                                    <div className="section-title">

                                        <h4>
                                            Patient
                                        </h4>

                                    </div>

                                    <select
                                        className="form-select"
                                        value={
                                            editPatientId
                                        }
                                        onChange={(event) =>
                                            setEditPatientId(
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            savingEdit
                                        }
                                    >

                                        <option value="">
                                            Select Patient
                                        </option>

                                        {patients.map(
                                            (patient) => (
                                                <option
                                                    key={
                                                        patient.id
                                                    }
                                                    value={
                                                        patient.id
                                                    }
                                                >
                                                    #
                                                    {
                                                        patient.id
                                                    }
                                                    {" - "}
                                                    {
                                                        patient.patient_name
                                                    }
                                                </option>
                                            )
                                        )}

                                    </select>

                                </div>

                                <div className="details-section">

                                    <div className="section-title">

                                        <h4>
                                            Select Tests
                                        </h4>

                                        <span>
                                            {
                                                selectedTests.length
                                            }{" "}
                                            selected
                                        </span>

                                    </div>

                                    <div className="test-search">

                                        <span>
                                            🔎
                                        </span>

                                        <input
                                            type="text"
                                            value={
                                                testSearch
                                            }
                                            onChange={
                                                handleTestSearch
                                            }
                                            placeholder="Search Test Code or Test Name..."
                                            disabled={
                                                savingEdit
                                            }
                                        />

                                        {testSearch && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTestSearch(
                                                        ""
                                                    );

                                                    setTestPage(
                                                        1
                                                    );
                                                }}
                                            >
                                                ×
                                            </button>
                                        )}

                                    </div>

                                    <div className="edit-tests-list">

                                        {paginatedTests.length ===
                                        0 ? (
                                            <div className="no-tests">
                                                No tests found
                                            </div>
                                        ) : (
                                            paginatedTests.map(
                                                (test) => (
                                                    <label
                                                        key={
                                                            test.id
                                                        }
                                                        className={`test-select-row ${
                                                            isTestSelected(
                                                                test.id
                                                            )
                                                                ? "selected"
                                                                : ""
                                                        }`}
                                                    >

                                                        <input
                                                            type="checkbox"
                                                            checked={isTestSelected(
                                                                test.id
                                                            )}
                                                            onChange={() =>
                                                                toggleTest(
                                                                    test.id
                                                                )
                                                            }
                                                            disabled={
                                                                savingEdit
                                                            }
                                                        />

                                                        <div className="test-select-info">

                                                            <strong>
                                                                {
                                                                    test.test_code
                                                                }
                                                            </strong>

                                                            <span>
                                                                {
                                                                    test.test_name
                                                                }
                                                            </span>

                                                        </div>

                                                        <strong className="test-price">

                                                            ₹
                                                            {formatMoney(
                                                                test.price
                                                            )}

                                                        </strong>

                                                    </label>
                                                )
                                            )
                                        )}

                                    </div>

                                    {filteredTests.length >
                                        0 && (
                                        <div className="pagination test-pagination">

                                            <button
                                                type="button"
                                                disabled={
                                                    testPage ===
                                                        1 ||
                                                    savingEdit
                                                }
                                                onClick={() =>
                                                    setTestPage(
                                                        (
                                                            page
                                                        ) =>
                                                            Math.max(
                                                                1,
                                                                page - 1
                                                            )
                                                    )
                                                }
                                            >
                                                ← Previous
                                            </button>

                                            <span>

                                                Page{" "}
                                                <strong>
                                                    {
                                                        testPage
                                                    }
                                                </strong>{" "}
                                                of{" "}
                                                <strong>
                                                    {
                                                        totalTestPages
                                                    }
                                                </strong>

                                            </span>

                                            <button
                                                type="button"
                                                disabled={
                                                    testPage ===
                                                        totalTestPages ||
                                                    savingEdit
                                                }
                                                onClick={() =>
                                                    setTestPage(
                                                        (
                                                            page
                                                        ) =>
                                                            Math.min(
                                                                totalTestPages,
                                                                page + 1
                                                            )
                                                    )
                                                }
                                            >
                                                Next →
                                            </button>

                                        </div>
                                    )}

                                </div>

                                <div className="details-section">

                                    <div className="section-title">

                                        <h4>
                                            Selected Tests
                                        </h4>

                                    </div>

                                    {selectedTests.length ===
                                    0 ? (
                                        <div className="no-selected-tests">
                                            No tests selected
                                        </div>
                                    ) : (
                                        <div className="selected-tests-list">

                                            {tests
                                                .filter(
                                                    (test) =>
                                                        selectedTests.includes(
                                                            Number(
                                                                test.id
                                                            )
                                                        )
                                                )
                                                .map(
                                                    (test) => (
                                                        <div
                                                            key={
                                                                test.id
                                                            }
                                                            className="selected-test-item"
                                                        >

                                                            <div>

                                                                <strong>
                                                                    {
                                                                        test.test_code
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    {
                                                                        test.test_name
                                                                    }
                                                                </span>

                                                            </div>

                                                            <strong>
                                                                ₹
                                                                {formatMoney(
                                                                    test.price
                                                                )}
                                                            </strong>

                                                        </div>
                                                    )
                                                )}

                                        </div>
                                    )}

                                </div>

                                <div className="edit-total">

                                    <span>
                                        New Total Amount
                                    </span>

                                    <strong>
                                        ₹
                                        {editTotalAmount.toFixed(
                                            2
                                        )}
                                    </strong>

                                </div>

                                <div className="modal-footer">

                                    <button
                                        type="button"
                                        className="cancel-btn"
                                        onClick={
                                            closeEdit
                                        }
                                        disabled={
                                            savingEdit
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        className="save-btn"
                                        onClick={
                                            handleSaveEdit
                                        }
                                        disabled={
                                            savingEdit ||
                                            !editPatientId ||
                                            selectedTests.length ===
                                                0
                                        }
                                    >
                                        {savingEdit
                                            ? "Saving..."
                                            : "Save Changes"}
                                    </button>

                                </div>

                            </>
                        )}

                    </div>

                </div>
            )}

        </div>
    );
}

export default LabOrders;