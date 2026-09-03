import { useEffect, useMemo, useState } from "react";
import "./Reports.css";

const API_URL = "http://localhost:5000/api";

const REPORTS_PER_PAGE = 5;

function Reports() {
    // =====================================================
    // REPORTS / ORDERS
    // =====================================================

    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // =====================================================
    // REPORT EDITOR
    // =====================================================

    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // =====================================================
    // LAB SETTINGS
    // =====================================================

    const [labName, setLabName] = useState(
        localStorage.getItem("lab_name") ||
            "PATHOLOGY LAB"
    );

    const [labAddress, setLabAddress] = useState(
        localStorage.getItem("lab_address") ||
            "Laboratory Investigation Centre"
    );

    const [labMobile, setLabMobile] = useState(
        localStorage.getItem("lab_mobile") ||
            ""
    );

    const [referredBy, setReferredBy] = useState("");

    const [pathologistName, setPathologistName] =
        useState("");

    const [remarks, setRemarks] = useState("");

    // =====================================================
    // LOAD ORDERS
    // =====================================================

    const loadOrders = async () => {
        try {
            setLoading(true);
            setError("");

            const ordersResponse = await fetch(
                `${API_URL}/lab-orders`
            );

            const ordersData = await ordersResponse.json();

            if (!ordersResponse.ok) {
                throw new Error(
                    ordersData.message ||
                        "Failed to load lab orders"
                );
            }

            const labOrders = Array.isArray(ordersData)
                ? ordersData
                : [];

            // Existing reports contain report_no such as RPT-2026-000003.
            // Merge them with the lab orders so Report No can be searched.
            let reports = [];

            try {
                const reportsResponse = await fetch(
                    `${API_URL}/reports`
                );

                const reportsData = await reportsResponse.json();

                if (reportsResponse.ok) {
                    reports = Array.isArray(reportsData)
                        ? reportsData
                        : [];
                }
            } catch (reportError) {
                console.warn(
                    "Could not load reports:",
                    reportError
                );
            }

            const reportMap = new Map();

            reports.forEach((item) => {
                if (item?.order_id != null) {
                    reportMap.set(Number(item.order_id), item);
                }
            });

            const mergedOrders = labOrders.map((order) => {
                const existingReport =
                    reportMap.get(Number(order.id));

                return {
                    ...order,
                    report_id:
                        existingReport?.id ||
                        order.report_id ||
                        null,
                    report_no:
                        existingReport?.report_no ||
                        order.report_no ||
                        "",
                    report_status:
                        existingReport?.status ||
                        order.report_status ||
                        "",
                };
            });

            setOrders(mergedOrders);
        } catch (err) {
            console.error(err);

            setError(
                err.message ||
                    "Failed to load lab orders"
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {
        loadOrders();
    }, []);

    // =====================================================
    // FILTER
    // =====================================================

    const filteredOrders = useMemo(() => {
        const text =
            search.toLowerCase().trim();

        if (!text) {
            return orders;
        }

        return orders.filter((order) => {
            return (
                String(
                    order.report_no || ""
                )
                    .toLowerCase()
                    .includes(text) ||

                String(
                    order.order_no || ""
                )
                    .toLowerCase()
                    .includes(text) ||

                String(
                    order.patient_name || ""
                )
                    .toLowerCase()
                    .includes(text) ||

                String(
                    order.patient_id || ""
                )
                    .toLowerCase()
                    .includes(text)
            );
        });
    }, [orders, search]);

    // =====================================================
    // PAGINATION
    // =====================================================

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredOrders.length /
                REPORTS_PER_PAGE
        )
    );

    const startIndex =
        (currentPage - 1) *
        REPORTS_PER_PAGE;

    const paginatedOrders =
        filteredOrders.slice(
            startIndex,
            startIndex + REPORTS_PER_PAGE
        );

    // =====================================================
    // DATE
    // =====================================================

    const formatDate = (date) => {
        if (!date) {
            return "-";
        }

        const value = String(date);

        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                value
            )
        ) {
            const [
                year,
                month,
                day,
            ] = value.split("-");

            return `${day}/${month}/${year}`;
        }

        const parsed =
            new Date(date);

        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {
            return value;
        }

        return parsed.toLocaleDateString(
            "en-IN"
        );
    };

    // =====================================================
    // OPEN REPORT
    // =====================================================

    const openReport = async (orderId) => {
        try {
            setReportLoading(true);
            setError("");

            const response = await fetch(
                `${API_URL}/reports/order/${orderId}`
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to load report"
                );
            }

            setReport(data);

            setReferredBy(
                data.order?.referred_by ||
                    ""
            );

            setPathologistName(
                data.report
                    ?.pathologist_name ||
                    ""
            );

            setRemarks(
                data.report?.remarks ||
                    ""
            );
        } catch (err) {
            console.error(
                "Open report error:",
                err
            );

            setError(
                err.message ||
                    "Failed to open report"
            );
        } finally {
            setReportLoading(false);
        }
    };

    // =====================================================
    // UPDATE RESULT
    // =====================================================

    const updateResult = (
        testId,
        value
    ) => {
        setReport((previous) => {
            if (!previous) {
                return previous;
            }

            return {
                ...previous,

                tests:
                    previous.tests.map(
                        (test) => {
                            if (
                                Number(
                                    test.test_id
                                ) !==
                                Number(
                                    testId
                                )
                            ) {
                                return test;
                            }

                            return {
                                ...test,
                                result_value:
                                    value,
                            };
                        }
                    ),
            };
        });
    };

    // =====================================================
    // SAVE REPORT
    // =====================================================

    const saveReport = async () => {
        if (!report?.order?.id) {
            return;
        }

        try {
            setSaving(true);
            setError("");

            const payload = {
                order_id:
                    Number(
                        report.order.id
                    ),

                patient_id:
                    Number(
                        report.order
                            .patient_id
                    ),

                report_id:
                    report.report?.id ||
                    null,

                referred_by:
                    referredBy,

                pathologist_name:
                    pathologistName,

                remarks,

                results:
                    report.tests.map(
                        (test) => ({
                            test_id:
                                Number(
                                    test.test_id
                                ),

                            result_value:
                                test.result_value ||
                                "",
                        })
                    ),
            };

            const response = await fetch(
                `${API_URL}/reports`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body:
                        JSON.stringify(
                            payload
                        ),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to save report"
                );
            }

            alert(
                "Report saved successfully"
            );

            await openReport(
                report.order.id
            );
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
            setSaving(false);
        }
    };

    // =====================================================
    // PRINT REPORT
    // =====================================================

    const printReport = () => {
        const element =
            document.getElementById(
                "printable-report"
            );

        if (!element) {
            return;
        }

        const printWindow =
            window.open(
                "",
                "_blank",
                "width=1000,height=900"
            );

        if (!printWindow) {
            alert(
                "Please allow pop-ups to print report."
            );

            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>

            <html>

            <head>

                <title>
                    Pathology Report - ${
                        report?.order
                            ?.patient_name ||
                        ""
                    }
                </title>

                <style>

                    @page {
                        size: A4;
                        margin: 10mm;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        padding: 0;
                        font-family:
                            Arial,
                            Helvetica,
                            sans-serif;

                        color: #222;
                        background: white;
                    }

                    .print-report {
                        width: 100%;
                    }

                    .report-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;

                        min-height: 105px;

                        border-bottom:
                            2px solid #222;

                        padding:
                            10px 5px 12px;
                    }

                    .lab-logo {
                        width: 90px;
                        height: 90px;

                        border-radius: 50%;

                        border:
                            2px solid #333;

                        display: flex;
                        align-items: center;
                        justify-content: center;

                        font-weight: bold;
                        font-size: 12px;

                        text-align: center;
                    }

                    .lab-title {
                        flex: 1;
                        text-align: center;
                    }

                    .lab-title h1 {
                        margin: 0;

                        font-size: 27px;
                        font-weight: 800;
                        letter-spacing: 1px;
                    }

                    .lab-title h2 {
                        margin:
                            5px 0;

                        font-size: 15px;
                        font-weight: 700;
                    }

                    .lab-title p {
                        margin: 2px 0;

                        font-size: 12px;
                    }

                    .lab-contact {
                        width: 120px;

                        text-align: right;

                        font-size: 11px;
                    }

                    .report-title {
                        margin:
                            8px auto 14px;

                        width: 230px;

                        text-align: center;

                        font-weight: bold;

                        padding: 5px 12px;

                        background: #eee;

                        border:
                            1px solid #555;
                    }

                    .patient-info {
                        display: grid;

                        grid-template-columns:
                            1fr 1fr;

                        border:
                            1px solid #aaa;

                        margin-bottom: 12px;
                    }

                    .patient-info-row {
                        display: flex;

                        padding:
                            6px 8px;

                        border-bottom:
                            1px solid #ddd;
                    }

                    .patient-info-row:nth-child(
                        odd
                    ) {
                        border-right:
                            1px solid #ddd;
                    }

                    .patient-info-label {
                        width: 110px;

                        font-size: 11px;

                        font-weight: bold;
                    }

                    .patient-info-value {
                        font-size: 12px;

                        font-weight: 600;
                    }

                    .section-heading {
                        background: #eee;

                        border:
                            1px solid #777;

                        padding: 5px 8px;

                        font-size: 13px;

                        font-weight: bold;

                        text-transform:
                            uppercase;
                    }

                    table {
                        width: 100%;

                        border-collapse:
                            collapse;

                        margin-top: 0;
                    }

                    th,
                    td {
                        border:
                            1px solid #aaa;

                        padding:
                            6px 7px;

                        font-size: 11px;

                        vertical-align: top;
                    }

                    th {
                        background: #f1f1f1;

                        font-size: 11px;

                        font-weight: bold;
                    }

                    .test-name {
                        font-weight: bold;

                        text-transform:
                            uppercase;
                    }

                    .method {
                        display: block;

                        margin-top: 3px;

                        font-size: 9px;

                        font-weight: normal;
                    }

                    .result {
                        font-weight: bold;
                    }

                    .result-low {
                        color: #b42318;

                        font-weight: bold;
                    }

                    .result-high {
                        color: #b42318;

                        font-weight: bold;
                    }

                    .result-normal {
                        color: #222;

                        font-weight: bold;
                    }

                    .flag {
                        margin-left: 4px;

                        font-size: 9px;

                        font-weight: bold;
                    }

                    .end-report {
                        text-align: center;

                        font-size: 12px;

                        font-weight: bold;

                        margin-top: 15px;
                    }

                    .good-health {
                        font-size: 11px;

                        font-weight: bold;

                        font-style: italic;

                        margin-top: 8px;
                    }

                    .report-footer {
                        display: flex;

                        justify-content:
                            space-between;

                        margin-top: 55px;
                    }

                    .signature {
                        width: 190px;

                        text-align: center;

                        padding-top: 35px;

                        border-top:
                            1px solid #555;

                        font-size: 11px;
                    }

                    .disclaimer {
                        margin-top: 35px;

                        padding:
                            6px;

                        text-align: center;

                        border-top:
                            1px solid #aaa;

                        font-size: 8px;
                    }

                </style>

            </head>

            <body>

                ${element.outerHTML}

            </body>

            </html>
        `);

        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    };

    // =====================================================
    // RESULT STATUS
    // =====================================================

    const getResultStatus = (
        result,
        referenceRange
    ) => {
        if (
            result === null ||
            result === undefined ||
            result === ""
        ) {
            return "NORMAL";
        }

        const value =
            parseFloat(result);

        if (Number.isNaN(value)) {
            return "NORMAL";
        }

        const range =
            String(
                referenceRange || ""
            ).toLowerCase();

        /*
         * Supports common ranges:
         *
         * <200
         * >50
         * 50 - 80
         * 50-80
         * Normal <200
         * Normal 50-80
         * Low risk <3.0
         */

        const lessMatch =
            range.match(
                /(?:<|less\s*than)\s*(\d+(?:\.\d+)?)/
            );

        if (lessMatch) {
            const max =
                Number(
                    lessMatch[1]
                );

            if (value > max) {
                return "HIGH";
            }

            return "NORMAL";
        }

        const greaterMatch =
            range.match(
                /(?:>|greater\s*than)\s*(\d+(?:\.\d+)?)/
            );

        if (greaterMatch) {
            const min =
                Number(
                    greaterMatch[1]
                );

            if (value < min) {
                return "LOW";
            }

            return "NORMAL";
        }

        const betweenMatch =
            range.match(
                /(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/
            );

        if (betweenMatch) {
            const min =
                Number(
                    betweenMatch[1]
                );

            const max =
                Number(
                    betweenMatch[2]
                );

            if (value < min) {
                return "LOW";
            }

            if (value > max) {
                return "HIGH";
            }

            return "NORMAL";
        }

        return "NORMAL";
    };

    // =====================================================
    // RESULT CLASS
    // =====================================================

    const getResultClass = (
        result,
        referenceRange
    ) => {
        const status =
            getResultStatus(
                result,
                referenceRange
            );

        if (status === "LOW") {
            return "result-low";
        }

        if (status === "HIGH") {
            return "result-high";
        }

        return "result-normal";
    };

    // =====================================================
    // RESULT FLAG
    // =====================================================

    const getResultFlag = (
        result,
        referenceRange
    ) => {
        const status =
            getResultStatus(
                result,
                referenceRange
            );

        if (status === "LOW") {
            return "L";
        }

        if (status === "HIGH") {
            return "H";
        }

        return "";
    };

    // =====================================================
    // SAVE LAB SETTINGS
    // =====================================================

    const saveLabSettings = () => {
        localStorage.setItem(
            "lab_name",
            labName
        );

        localStorage.setItem(
            "lab_address",
            labAddress
        );

        localStorage.setItem(
            "lab_mobile",
            labMobile
        );

        alert(
            "Lab details saved"
        );
    };

    // =====================================================
    // REPORT VIEW
    // =====================================================

    if (report) {
        return (
            <div className="reports-page">

                {/* =========================================
                    REPORT EDITOR HEADER
                ========================================== */}

                <div className="report-editor-header">

                    <div>
                        <h2>
                            Report Entry
                        </h2>

                        <p>
                            Enter patient test
                            results manually.
                            Reference range and
                            unit are automatic.
                        </p>
                    </div>

                    <div className="editor-actions">

                        <button
                            className="back-btn"
                            onClick={() =>
                                setReport(
                                    null
                                )
                            }
                            disabled={saving}
                        >
                            ← Back
                        </button>

                        <button
                            className="save-report-btn"
                            onClick={
                                saveReport
                            }
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : "Save Report"}
                        </button>

                        <button
                            className="print-btn"
                            onClick={
                                printReport
                            }
                        >
                            🖨 Print Report
                        </button>

                    </div>

                </div>

                {/* =========================================
                    ERROR
                ========================================== */}

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {/* =========================================
                    LAB SETTINGS
                ========================================== */}

                <div className="settings-card">

                    <div className="settings-title">
                        Lab Details
                    </div>

                    <div className="settings-grid">

                        <div>
                            <label>
                                Lab Name
                            </label>

                            <input
                                value={labName}
                                onChange={(e) =>
                                    setLabName(
                                        e.target
                                            .value
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label>
                                Address
                            </label>

                            <input
                                value={
                                    labAddress
                                }
                                onChange={(e) =>
                                    setLabAddress(
                                        e.target
                                            .value
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label>
                                Mobile
                            </label>

                            <input
                                value={
                                    labMobile
                                }
                                onChange={(e) =>
                                    setLabMobile(
                                        e.target
                                            .value
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label>
                                Referred By
                            </label>

                            <input
                                value={
                                    referredBy
                                }
                                onChange={(e) =>
                                    setReferredBy(
                                        e.target
                                            .value
                                    )
                                }
                                placeholder="SELF / Doctor Name"
                            />
                        </div>

                    </div>

                    <button
                        className="small-save-btn"
                        onClick={
                            saveLabSettings
                        }
                    >
                        Save Lab Details
                    </button>

                </div>

                {/* =========================================
                    REPORT ENTRY
                ========================================== */}

                <div className="report-entry-card">

                    <div className="entry-title">
                        Patient Report
                    </div>

                    <div className="patient-summary">

                        <div>
                            <span>
                                Patient Name
                            </span>

                            <strong>
                                {
                                    report.order
                                        ?.patient_name ||
                                    "-"
                                }
                            </strong>
                        </div>

                        <div>
                            <span>
                                Patient Code
                            </span>

                            <strong>
                                #
                                {
                                    report.order
                                        ?.patient_id ||
                                    "-"
                                }
                            </strong>
                        </div>

                        <div>
                            <span>
                                Report No
                            </span>

                            <strong>
                                {report.report?.report_no || "Not Generated"}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Age / Sex
                            </span>

                            <strong>
                                {
                                    report.order
                                        ?.age ??
                                    "-"
                                }{" "}
                                Years /{" "}
                                {
                                    report.order
                                        ?.gender ||
                                    "-"
                                }
                            </strong>
                        </div>

                        <div>
                            <span>
                                Received On
                            </span>

                            <strong>
                                {formatDate(
                                    report.order
                                        ?.order_date
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Reported On
                            </span>

                            <strong>
                                {formatDate(
                                    new Date()
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Referred By
                            </span>

                            <strong>
                                {referredBy ||
                                    "SELF"}
                            </strong>
                        </div>

                    </div>

                    {/* =====================================
                        TEST RESULT TABLE
                    ====================================== */}

                    <div className="result-table-wrapper">

                        <table className="result-entry-table">

                            <thead>
                                <tr>
                                    <th>
                                        #
                                    </th>

                                    <th>
                                        Investigation
                                    </th>

                                    <th>
                                        Result
                                    </th>

                                    <th>
                                        Units
                                    </th>

                                    <th>
                                        Reference Range
                                    </th>

                                    <th>
                                        Status
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {report.tests?.map(
                                    (
                                        test,
                                        index
                                    ) => {
                                        const status =
                                            getResultStatus(
                                                test.result_value,
                                                test.reference_range
                                            );

                                        return (
                                            <tr
                                                key={
                                                    test.test_id
                                                }
                                            >

                                                <td>
                                                    {index +
                                                        1}
                                                </td>

                                                <td>
                                                    <strong>
                                                        {
                                                            test.test_name
                                                        }
                                                    </strong>

                                                    <small>
                                                        {
                                                            test.test_code
                                                        }
                                                    </small>

                                                    {test.method && (
                                                        <em>
                                                            Method:{" "}
                                                            {
                                                                test.method
                                                            }
                                                        </em>
                                                    )}
                                                </td>

                                                <td>
                                                    <input
                                                        className={`result-input ${
                                                            status ===
                                                            "LOW"
                                                                ? "input-low"
                                                                : status ===
                                                                  "HIGH"
                                                                ? "input-high"
                                                                : ""
                                                        }`}
                                                        type="text"
                                                        value={
                                                            test.result_value ||
                                                            ""
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            updateResult(
                                                                test.test_id,
                                                                e
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="Enter result"
                                                    />
                                                </td>

                                                <td>
                                                    {
                                                        test.unit ||
                                                        "-"
                                                    }
                                                </td>

                                                <td className="reference-range">
                                                    {
                                                        test.reference_range ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>

                                                    {test.result_value ? (
                                                        <span
                                                            className={`status-badge status-${status.toLowerCase()}`}
                                                        >
                                                            {status ===
                                                            "LOW"
                                                                ? "↓ LOW"
                                                                : status ===
                                                                  "HIGH"
                                                                ? "↑ HIGH"
                                                                : "NORMAL"}
                                                        </span>
                                                    ) : (
                                                        <span className="status-pending">
                                                            Pending
                                                        </span>
                                                    )}

                                                </td>

                                            </tr>
                                        );
                                    }
                                )}

                            </tbody>

                        </table>

                    </div>

                    {/* =====================================
                        PATHOLOGIST
                    ====================================== */}

                    <div className="report-extra">

                        <div>
                            <label>
                                Pathologist /
                                Authorized Signatory
                            </label>

                            <input
                                value={
                                    pathologistName
                                }
                                onChange={(e) =>
                                    setPathologistName(
                                        e.target
                                            .value
                                    )
                                }
                                placeholder="Enter name"
                            />
                        </div>

                        <div>
                            <label>
                                Report Remarks
                            </label>

                            <textarea
                                value={remarks}
                                onChange={(e) =>
                                    setRemarks(
                                        e.target
                                            .value
                                    )
                                }
                                placeholder="Optional remarks..."
                            />
                        </div>

                    </div>

                </div>

                {/* =========================================
                    PRINT PREVIEW
                ========================================== */}

                <div className="preview-title">
                    Report Preview
                </div>

                <div className="print-preview">

                    <div
                        id="printable-report"
                        className="print-report"
                    >

                        {/* HEADER */}

                        <div className="report-header">

                            <div className="lab-logo">
                                {labName
                                    .substring(
                                        0,
                                        12
                                    )}
                            </div>

                            <div className="lab-title">

                                <h1>
                                    {labName}
                                </h1>

                                <h2>
                                    PATHOLOGY
                                    REPORT
                                </h2>

                                <p>
                                    {
                                        labAddress
                                    }
                                </p>

                            </div>

                            <div className="lab-contact">

                                {labMobile && (
                                    <>
                                        <strong>
                                            Mob:
                                        </strong>{" "}
                                        {
                                            labMobile
                                        }
                                    </>
                                )}

                            </div>

                        </div>

                        <div className="report-title">
                            PATHOLOGY REPORT
                        </div>

                        {/* PATIENT INFO */}

                        <div className="patient-info">

                            <div className="patient-info-row">
                                <span className="patient-info-label">
                                    Patient Name:
                                </span>

                                <span className="patient-info-value">
                                    {
                                        report
                                            .order
                                            ?.patient_name ||
                                        "-"
                                    }
                                </span>
                            </div>

                            <div className="patient-info-row">
                                <span className="patient-info-label">
                                    Patient Code:
                                </span>

                                <span className="patient-info-value">
                                    {
                                        report
                                            .order
                                            ?.patient_code ||
                                        report
                                            .order
                                            ?.patient_id ||
                                        "-"
                                    }
                                </span>
                            </div>

                            <div className="patient-info-row">
                                <span className="patient-info-label">
                                    Report No:
                                </span>

                                <span className="patient-info-value">
                                    {
                                        report.report?.report_no ||
                                        "Not Generated"
                                    }
                                </span>
                            </div>

                            <div className="patient-info-row">
                                <span className="patient-info-label">
                                    Age / Sex:
                                </span>

                                <span className="patient-info-value">
                                    {
                                        report
                                            .order
                                            ?.age ??
                                        "-"
                                    }{" "}
                                    Years /{" "}
                                    {
                                        report
                                            .order
                                            ?.gender ||
                                        "-"
                                    }
                                </span>
                            </div>

                            <div className="patient-info-row">
                                <span className="patient-info-label">
                                    Received On:
                                </span>

                                <span className="patient-info-value">
                                    {formatDate(
                                        report
                                            .order
                                            ?.order_date
                                    )}
                                </span>
                            </div>

                            <div className="patient-info-row">
                                <span className="patient-info-label">
                                    Referred By:
                                </span>

                                <span className="patient-info-value">
                                    {
                                        referredBy ||
                                        "SELF"
                                    }
                                </span>
                            </div>

                            <div className="patient-info-row">
                                <span className="patient-info-label">
                                    Reported On:
                                </span>

                                <span className="patient-info-value">
                                    {formatDate(
                                        new Date()
                                    )}
                                </span>
                            </div>

                        </div>

                        {/* TEST TABLE */}

                        <div className="section-heading">
                            Investigation
                        </div>

                        <table>

                            <thead>
                                <tr>
                                    <th>
                                        INVESTIGATION
                                    </th>

                                    <th>
                                        RESULT
                                    </th>

                                    <th>
                                        UNITS
                                    </th>

                                    <th>
                                        NORMAL RANGE
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {report.tests?.map(
                                    (test) => {
                                        const status =
                                            getResultStatus(
                                                test.result_value,
                                                test.reference_range
                                            );

                                        const resultClass =
                                            getResultClass(
                                                test.result_value,
                                                test.reference_range
                                            );

                                        const flag =
                                            getResultFlag(
                                                test.result_value,
                                                test.reference_range
                                            );

                                        return (
                                            <tr
                                                key={
                                                    test.test_id
                                                }
                                            >

                                                <td>
                                                    <div className="test-name">
                                                        {
                                                            test.test_name
                                                        }
                                                    </div>

                                                    {test.method && (
                                                        <span className="method">
                                                            Method: (
                                                            {
                                                                test.method
                                                            }
                                                            )
                                                        </span>
                                                    )}
                                                </td>

                                                <td
                                                    className={`result ${resultClass}`}
                                                >
                                                    {
                                                        test.result_value ||
                                                        "-"
                                                    }

                                                    {flag && (
                                                        <span className="flag">
                                                            {flag}
                                                        </span>
                                                    )}
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

                                            </tr>
                                        );
                                    }
                                )}

                            </tbody>

                        </table>

                        {/* REMARKS */}

                        {remarks && (
                            <div
                                style={{
                                    marginTop:
                                        "10px",
                                    fontSize:
                                        "10px",
                                }}
                            >
                                <strong>
                                    Remarks:
                                </strong>{" "}
                                {remarks}
                            </div>
                        )}

                        {/* END */}

                        <div className="end-report">
                            **** END OF REPORT ****
                        </div>

                        <div className="good-health">
                            We wish you a good
                            health!
                        </div>

                        {/* FOOTER */}

                        <div className="report-footer">

                            <div className="signature">
                                Sample Collected
                                <br />
                                Inside the Lab
                            </div>

                            <div className="signature">
                                Lab Technologist
                                <br />
                                {pathologistName ||
                                    "B.Sc. / MLT"}
                            </div>

                            <div className="signature">
                                Signature
                            </div>

                        </div>

                        <div className="disclaimer">
                            This is a professional
                            laboratory report.
                            Please correlate
                            clinically.
                            In case of any
                            discrepancy, please
                            contact the laboratory.
                        </div>

                    </div>

                </div>

            </div>
        );
    }

    // =====================================================
    // MAIN REPORT LIST
    // =====================================================

    return (
        <div className="reports-page">

            <div className="page-header">

                <div>
                    <h2>
                        Pathology Reports
                    </h2>

                    <p>
                        Enter results and
                        generate patient
                        reports
                    </p>
                </div>

                <button
                    className="refresh-btn"
                    onClick={
                        loadOrders
                    }
                    disabled={loading}
                >
                    {loading
                        ? "Loading..."
                        : "Refresh"}
                </button>

            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="search-section">

                <div className="search-box">
                    🔎

                    <input
                        value={search}
                        onChange={(e) => {
                            setSearch(
                                e.target.value
                            );
                            setCurrentPage(
                                1
                            );
                        }}
                        placeholder="Search Report No, Order No, Patient Name or Patient ID..."
                    />
                </div>

                <span>
                    {
                        filteredOrders.length
                    }{" "}
                    orders
                </span>

            </div>

            <div className="orders-table-container">

                <table>

                    <thead>
                        <tr>
                            <th>
                                #
                            </th>

                            <th>
                                Report No
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
                                Date
                            </th>

                            <th>
                                Tests
                            </th>

                            <th>
                                Amount
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
                                    colSpan="9"
                                    className="empty-row"
                                >
                                    Loading...
                                </td>
                            </tr>
                        ) : paginatedOrders.length ===
                          0 ? (
                            <tr>
                                <td
                                    colSpan="9"
                                    className="empty-row"
                                >
                                    No orders found
                                </td>
                            </tr>
                        ) : (
                            paginatedOrders.map(
                                (
                                    order,
                                    index
                                ) => (
                                    <tr
                                        key={
                                            order.id
                                        }
                                    >

                                        <td>
                                            {
                                                startIndex +
                                                index +
                                                1
                                            }
                                        </td>

                                        <td>
                                            <strong>
                                                {order.report_no || "-"}
                                            </strong>
                                        </td>

                                        <td>
                                            <strong>
                                                {
                                                    order.order_no
                                                }
                                            </strong>
                                        </td>

                                        <td>
                                            {
                                                order.patient_name ||
                                                "-"
                                            }
                                        </td>

                                        <td>
                                            #
                                            {
                                                order.patient_id
                                            }
                                        </td>

                                        <td>
                                            {formatDate(
                                                order.order_date
                                            )}
                                        </td>

                                        <td>
                                            {
                                                order.test_count ??
                                                "-"
                                            }
                                        </td>

                                        <td>
                                            ₹
                                            {Number(
                                                order.total_amount ||
                                                    0
                                            ).toFixed(
                                                2
                                            )}
                                        </td>

                                        <td>

                                            <button
                                                className="enter-report-btn"
                                                onClick={() =>
                                                    openReport(
                                                        order.id
                                                    )
                                                }
                                            >
                                                Enter Report
                                            </button>

                                        </td>

                                    </tr>
                                )
                            )
                        )}

                    </tbody>

                </table>

            </div>

            {filteredOrders.length >
                0 && (
                <div className="pagination">

                    <button
                        disabled={
                            currentPage ===
                            1
                        }
                        onClick={() =>
                            setCurrentPage(
                                (p) =>
                                    Math.max(
                                        1,
                                        p - 1
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
                                currentPage
                            }
                        </strong>{" "}
                        of{" "}
                        <strong>
                            {
                                totalPages
                            }
                        </strong>
                    </span>

                    <button
                        disabled={
                            currentPage ===
                            totalPages
                        }
                        onClick={() =>
                            setCurrentPage(
                                (p) =>
                                    Math.min(
                                        totalPages,
                                        p + 1
                                    )
                            )
                        }
                    >
                        Next →
                    </button>

                </div>
            )}

        </div>
    );
}

export default Reports;