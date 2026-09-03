const express = require("express");
const cors = require("cors");

const db = require("./db");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);


// ==========================================
// HOME
// ==========================================

app.get("/", async (req, res) => {
    res.json({
        message: "Welcome to the Pathology Lab API",
    });
});

// ==========================================
// GET ALL TESTS
// ==========================================
const authMiddleware = require("./middleware/authMiddleware");
const roleMiddleware = require("./middleware/roleMiddleware");

app.get("/api/tests", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                id,
                test_code,
                test_name,
                sample_type,
                vial_name,
                price,
                reference_range,
                unit,
                vial_color
            FROM tests
            ORDER BY test_name
        `);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "An error occurred while fetching tests",
            error: error.message,
        });
    }
});


// ==========================================
// ADD NEW TEST
// ==========================================

app.post("/api/tests", authMiddleware, roleMiddleware("LAB_ADMIN"), async (req, res) => {

    try {

        const {
            test_code,
            test_name,
            sample_type,
            vial_name,
            price,
            reference_range,
            unit,
            vial_color
        } = req.body;

        // ------------------------------------------
        // VALIDATION
        // ------------------------------------------

        if (!test_code || !test_code.trim()) {
            return res.status(400).json({
                message: "Test code is required"
            });
        }

        if (!test_name || !test_name.trim()) {
            return res.status(400).json({
                message: "Test name is required"
            });
        }

        // ------------------------------------------
        // CHECK DUPLICATE TEST CODE
        // ------------------------------------------

        const [existing] = await db.query(
            `
            SELECT id
            FROM tests
            WHERE test_code = ?
            LIMIT 1
            `,
            [test_code.trim()]
        );

        if (existing.length > 0) {

            return res.status(409).json({
                message: "Test code already exists"
            });

        }

        // ------------------------------------------
        // INSERT TEST
        // ------------------------------------------

        const [result] = await db.query(
            `
            INSERT INTO tests
            (
                test_code,
                test_name,
                sample_type,
                vial_name,
                price,
                reference_range,
                unit,
                vial_color
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                test_code.trim(),
                test_name.trim(),
                sample_type || null,
                vial_name || null,
                Number(price) || 0,
                reference_range || null,
                unit || null,
                vial_color || null
            ]
        );

        // ------------------------------------------
        // GET CREATED TEST
        // ------------------------------------------

        const [newTest] = await db.query(
            `
            SELECT
                id,
                test_code,
                test_name,
                sample_type,
                vial_name,
                price,
                reference_range,
                unit,
                vial_color
            FROM tests
            WHERE id = ?
            `,
            [result.insertId]
        );

        res.status(201).json(newTest[0]);

    } catch (error) {

        console.error(
            "ADD TEST ERROR:",
            error
        );

        res.status(500).json({
            message: "An error occurred while adding test",
            error: error.message
        });

    }

});

// ==========================================
// UPDATE TEST
// ==========================================

app.put("/api/tests/:id", authMiddleware, roleMiddleware("LAB_ADMIN","RECEPTIONIST"), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            test_code,
            test_name,
            sample_type,
            vial_name,
            price,
            reference_range,
            unit,
            vial_color
        } = req.body;

        if (!test_code || !test_name) {

            return res.status(400).json({
                message: "Test code and test name are required"
            });

        }


        // Check duplicate test code
        // excluding current test

        const [existing] = await db.query(
            `
            SELECT id
            FROM tests
            WHERE test_code = ?
            AND id != ?
            `,
            [test_code, id]
        );


        if (existing.length > 0) {

            return res.status(409).json({
                message: "Another test already uses this test code"
            });

        }


        const [result] = await db.query(
            `
            UPDATE tests
            SET
                test_code = ?,
                test_name = ?,
                sample_type = ?,
                vial_name = ?,
                price = ?,
                reference_range = ?,
                unit = ?,
                vial_color = ?
            WHERE id = ?
            `,
            [
                test_code,
                test_name,
                sample_type || null,
                vial_name || null,
                price || 0,
                reference_range || null,
                unit || null,
                vial_color || null,
                id
            ]
        );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "Test not found"
            });

        }

        const [updatedTest] = await db.query(
            `
            SELECT
                id,
                test_code,
                test_name,
                sample_type,
                vial_name,
                price,
                reference_range,
                unit,
                vial_color
            FROM tests
            WHERE id = ?
            `,
            [id]
        );
        res.json(updatedTest[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "An error occurred while updating test",
            error: error.message
        });
    }
});

// ==========================================
// DELETE TEST
// ==========================================

app.delete("/api/tests/:id", authMiddleware, roleMiddleware("LAB_ADMIN"), async (req, res) => {

    try {

        const { id } = req.params;


        const [result] = await db.query(
            `
            DELETE FROM tests
            WHERE id = ?
            `,
            [id]
        );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "Test not found"
            });

        }


        res.json({
            message: "Test deleted successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "An error occurred while deleting test",
            error: error.message
        });

    }

});

// =========================================================
// REGISTER PATIENT
// =========================================================

// =========================================================
// REGISTER PATIENT + CREATE LAB ORDER
// =========================================================

app.post("/api/patients", authMiddleware,
    roleMiddleware(
        "LAB_ADMIN",
        "RECEPTIONIST"
    ), async (req, res) => {
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
        const {
            patient_name,
            age,
            gender,
            mobile,
            address,
            registration_date,
            test_ids
        } = req.body;

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!patient_name || !patient_name.trim()) {
            return res.status(400).json({
                message: "Patient name is required"
            });
        }

        if (!registration_date) {
            return res.status(400).json({
                message: "Registration date is required"
            });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(registration_date)) {
            return res.status(400).json({
                message: "Invalid registration date. Expected YYYY-MM-DD"
            });
        }

        if (!Array.isArray(test_ids) || test_ids.length === 0) {
            return res.status(400).json({
                message: "At least one test is required"
            });
        }

        // -------------------------------------------------
        // NORMALIZE TEST IDS
        // -------------------------------------------------

        const numericTestIds = [
            ...new Set(
                test_ids
                    .map(Number)
                    .filter(
                        id =>
                            Number.isInteger(id) &&
                            id > 0
                    )
            )
        ];

        if (numericTestIds.length === 0) {
            return res.status(400).json({
                message: "Invalid test selection"
            });
        }

        // -------------------------------------------------
        // GET TESTS + PRICE
        // -------------------------------------------------

        const placeholders = numericTestIds
            .map(() => "?")
            .join(",");

        const [testRows] = await connection.query(
            `
            SELECT
                id,
                test_name,
                price
            FROM tests
            WHERE id IN (${placeholders})
            `,
            numericTestIds
        );

        if (testRows.length !== numericTestIds.length) {
            return res.status(400).json({
                message: "One or more selected tests do not exist"
            });
        }

        // -------------------------------------------------
        // TOTAL AMOUNT
        // -------------------------------------------------

        const totalAmount = testRows.reduce(
            (total, test) =>
                total + Number(test.price || 0),
            0
        );

        // -------------------------------------------------
        // CURRENT DATE/TIME
        // -------------------------------------------------

        const now = new Date();

        const registrationTime =
            `${String(now.getHours()).padStart(2, "0")}:` +
            `${String(now.getMinutes()).padStart(2, "0")}:` +
            `${String(now.getSeconds()).padStart(2, "0")}`;

        // -------------------------------------------------
        // START TRANSACTION
        // -------------------------------------------------

        await connection.beginTransaction();
        transactionStarted = true;

        // -------------------------------------------------
        // INSERT PATIENT
        // -------------------------------------------------

        const [patientResult] = await connection.query(
            `
            INSERT INTO patients
            (
                patient_name,
                age,
                gender,
                mobile,
                address,
                registration_date,
                registration_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                patient_name.trim(),
                age === "" || age == null
                    ? null
                    : Number(age),
                gender || null,
                mobile || null,
                address || null,
                registration_date,
                registrationTime
            ]
        );

        const patientId = patientResult.insertId;

        // -------------------------------------------------
        // INSERT PATIENT TESTS
        // -------------------------------------------------

        for (const test of testRows) {
            await connection.query(
                `
                INSERT INTO patient_tests
                (
                    patient_id,
                    test_id,
                    price
                )
                VALUES (?, ?, ?)
                `,
                [
                    patientId,
                    test.id,
                    Number(test.price || 0)
                ]
            );
        }

        // -------------------------------------------------
        // CREATE LAB ORDER
        // -------------------------------------------------

        const orderDate = registration_date;
        const orderTime = registrationTime;

        const [orderResult] = await connection.query(
            `
            INSERT INTO lab_orders
            (
                patient_id,
                order_no,
                order_date,
                order_time,
                status,
                total_amount
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                patientId,
                "TEMP",
                orderDate,
                orderTime,
                "Registered",
                totalAmount
            ]
        );

        const orderId = orderResult.insertId;

        // -------------------------------------------------
        // GENERATE ORDER NUMBER
        // -------------------------------------------------

        const orderNo =
            `LAB-${String(orderId).padStart(6, "0")}`;

        await connection.query(
            `
            UPDATE lab_orders
            SET order_no = ?
            WHERE id = ?
            `,
            [
                orderNo,
                orderId
            ]
        );

        // -------------------------------------------------
        // INSERT LAB ORDER TESTS
        // -------------------------------------------------

        for (const test of testRows) {
            await connection.query(
                `
                INSERT INTO lab_order_tests
                (
                    order_id,
                    test_id,
                    price,
                    status
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    orderId,
                    test.id,
                    Number(test.price || 0),
                    "Pending"
                ]
            );
        }

        // -------------------------------------------------
        // COMMIT
        // -------------------------------------------------

        await connection.commit();
        transactionStarted = false;

        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------

        res.status(201).json({
            success: true,
            message: "Patient registered successfully",
            patientId,
            orderId,
            orderNo,
            totalAmount
        });

    } catch (error) {

        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            "REGISTER PATIENT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                error.sqlMessage ||
                error.message ||
                "Failed to register patient"
        });

    } finally {
        connection.release();
    }
});


// =========================================================
// GET ALL PATIENTS
// =========================================================

app.get("/api/patients",authMiddleware,
    roleMiddleware(
        "LAB_ADMIN",
        "RECEPTIONIST",
        "DOCTOR",
        "LAB_TECHNICIAN"
    ), async (req, res) => {
    try {
        const [patients] = await db.query(`
            SELECT
                id,
                patient_name,
                age,
                gender,
                mobile,
                address,
                registration_date,
                registration_time,
                created_at
            FROM patients
            ORDER BY id DESC
        `);

        res.json(patients);

    } catch (error) {
        console.error("GET PATIENTS ERROR:", error);

        res.status(500).json({
            message: "Failed to load patients",
            error: error.message
        });
    }
});

// =========================================================
// GET PATIENT BY ID
// =========================================================

app.get("/api/patients/:id", async (req, res) => {
    try {
        const patientId = Number(req.params.id);

        if (!Number.isInteger(patientId) || patientId <= 0) {
            return res.status(400).json({
                message: "Invalid patient ID"
            });
        }

        // Get patient
        const [patients] = await db.query(
            `
            SELECT
                id,
                patient_name,
                age,
                gender,
                mobile,
                address,
                registration_date,
                registration_time,
                created_at
            FROM patients
            WHERE id = ?
            `,
            [patientId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        // Get patient tests
        const [tests] = await db.query(
            `
            SELECT
                pt.id,
                pt.patient_id,
                pt.test_id,
                pt.price,
                t.test_code,
                t.test_name,
                t.sample_type,
                t.vial_name,
                t.vial_color
            FROM patient_tests pt
            INNER JOIN tests t
                ON pt.test_id = t.id
            WHERE pt.patient_id = ?
            ORDER BY pt.id ASC
            `,
            [patientId]
        );

        const totalAmount = tests.reduce(
            (total, test) =>
                total + Number(test.price || 0),
            0
        );

        return res.json({
            patient: patients[0],
            tests,
            total_amount: totalAmount
        });

    } catch (error) {
        console.error(
            "GET PATIENT BY ID ERROR:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch patient",
            error: error.message
        });
    }
});

// =========================================================
// UPDATE PATIENT + UPDATE LAB ORDER
// =========================================================

app.put("/api/patients/:id", async (req, res) => {
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
        const patientId = Number(req.params.id);

        const {
            patient_name,
            age,
            gender,
            mobile,
            address,
            registration_date,
            test_ids
        } = req.body;

        console.log("=================================");
        console.log("UPDATE PATIENT REQUEST");
        console.log("Patient ID:", patientId);
        console.log("Body:", req.body);
        console.log("=================================");

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!Number.isInteger(patientId) || patientId <= 0) {
            return res.status(400).json({
                message: "Invalid patient ID"
            });
        }

        if (!patient_name || !patient_name.trim()) {
            return res.status(400).json({
                message: "Patient name is required"
            });
        }

        if (!registration_date) {
            return res.status(400).json({
                message: "Registration date is required"
            });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(registration_date)) {
            return res.status(400).json({
                message:
                    "Invalid registration date. Expected YYYY-MM-DD"
            });
        }

        if (!Array.isArray(test_ids) || test_ids.length === 0) {
            return res.status(400).json({
                message: "At least one test is required"
            });
        }

        // -------------------------------------------------
        // NORMALIZE TEST IDS
        // -------------------------------------------------

        const numericTestIds = [
            ...new Set(
                test_ids
                    .map(Number)
                    .filter(
                        id =>
                            Number.isInteger(id) &&
                            id > 0
                    )
            )
        ];

        if (numericTestIds.length === 0) {
            return res.status(400).json({
                message: "Invalid test selection"
            });
        }

        // -------------------------------------------------
        // CHECK PATIENT
        // -------------------------------------------------

        const [patientRows] = await connection.query(
            `
            SELECT id
            FROM patients
            WHERE id = ?
            `,
            [patientId]
        );

        if (patientRows.length === 0) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        // -------------------------------------------------
        // GET TEST DETAILS
        // -------------------------------------------------

        const placeholders = numericTestIds
            .map(() => "?")
            .join(",");

        const [testRows] = await connection.query(
            `
            SELECT
                id,
                test_name,
                price
            FROM tests
            WHERE id IN (${placeholders})
            `,
            numericTestIds
        );

        if (testRows.length !== numericTestIds.length) {
            return res.status(400).json({
                message:
                    "One or more selected tests do not exist"
            });
        }

        // -------------------------------------------------
        // TOTAL AMOUNT
        // -------------------------------------------------

        const totalAmount = testRows.reduce(
            (total, test) =>
                total + Number(test.price || 0),
            0
        );

        // -------------------------------------------------
        // UPDATED DATE/TIME
        // -------------------------------------------------

        const now = new Date();

        const updatedDate =
            `${now.getFullYear()}-` +
            `${String(now.getMonth() + 1).padStart(2, "0")}-` +
            `${String(now.getDate()).padStart(2, "0")}`;

        const updatedTime =
            `${String(now.getHours()).padStart(2, "0")}:` +
            `${String(now.getMinutes()).padStart(2, "0")}:` +
            `${String(now.getSeconds()).padStart(2, "0")}`;

        // -------------------------------------------------
        // START TRANSACTION
        // -------------------------------------------------

        await connection.beginTransaction();
        transactionStarted = true;

        // -------------------------------------------------
        // UPDATE PATIENT
        // -------------------------------------------------

        await connection.query(
            `
            UPDATE patients
            SET
                patient_name = ?,
                age = ?,
                gender = ?,
                mobile = ?,
                address = ?,
                updated_date = ?,
                updated_time = ?
            WHERE id = ?
            `,
            [
                patient_name.trim(),
                age === "" || age == null
                    ? null
                    : Number(age),
                gender || null,
                mobile || null,
                address || null,
                updatedDate,
                updatedTime,
                patientId
            ]
        );

        // -------------------------------------------------
        // DELETE OLD PATIENT TESTS
        // -------------------------------------------------

        await connection.query(
            `
            DELETE FROM patient_tests
            WHERE patient_id = ?
            `,
            [patientId]
        );

        // -------------------------------------------------
        // INSERT UPDATED PATIENT TESTS
        // -------------------------------------------------

        for (const test of testRows) {
            await connection.query(
                `
                INSERT INTO patient_tests
                (
                    patient_id,
                    test_id,
                    price
                )
                VALUES (?, ?, ?)
                `,
                [
                    patientId,
                    test.id,
                    Number(test.price || 0)
                ]
            );
        }

        // -------------------------------------------------
        // FIND EXISTING LAB ORDER
        // -------------------------------------------------

        const [existingOrders] = await connection.query(
            `
            SELECT
                id,
                status
            FROM lab_orders
            WHERE patient_id = ?
            ORDER BY id DESC
            LIMIT 1
            `,
            [patientId]
        );

        let orderId;
        let orderNo;

        // -------------------------------------------------
        // UPDATE EXISTING ORDER
        // -------------------------------------------------

        if (existingOrders.length > 0) {

            orderId = existingOrders[0].id;

            const currentStatus =
                existingOrders[0].status;

            // Keep current order status.
            // Only update date/time/amount.
            await connection.query(
                `
                UPDATE lab_orders
                SET
                    order_date = ?,
                    order_time = ?,
                    total_amount = ?
                WHERE id = ?
                `,
                [
                    registration_date,
                    updatedTime,
                    totalAmount,
                    orderId
                ]
            );

            // Delete old order tests
            await connection.query(
                `
                DELETE FROM lab_order_tests
                WHERE order_id = ?
                `,
                [orderId]
            );

            // Insert updated order tests
            for (const test of testRows) {

                await connection.query(
                    `
                    INSERT INTO lab_order_tests
                    (
                        order_id,
                        test_id,
                        price,
                        status
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        orderId,
                        test.id,
                        Number(test.price || 0),

                        currentStatus === "Completed"
                            ? "Completed"
                            : currentStatus === "Processing"
                                ? "Processing"
                                : currentStatus === "Sample Collected"
                                    ? "Collected"
                                    : currentStatus === "Cancelled"
                                        ? "Cancelled"
                                        : "Pending"
                    ]
                );
            }

            const [orderRows] = await connection.query(
                `
                SELECT order_no
                FROM lab_orders
                WHERE id = ?
                `,
                [orderId]
            );

            orderNo = orderRows[0]?.order_no;

        } else {

            // -------------------------------------------------
            // CREATE ORDER IF PATIENT HAS NO ORDER
            // -------------------------------------------------

            const [orderResult] = await connection.query(
                `
                INSERT INTO lab_orders
                (
                    patient_id,
                    order_no,
                    order_date,
                    order_time,
                    status,
                    total_amount
                )
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    patientId,
                    "TEMP",
                    registration_date,
                    updatedTime,
                    "Registered",
                    totalAmount
                ]
            );

            orderId = orderResult.insertId;

            orderNo =
                `LAB-${String(orderId).padStart(6, "0")}`;

            await connection.query(
                `
                UPDATE lab_orders
                SET order_no = ?
                WHERE id = ?
                `,
                [
                    orderNo,
                    orderId
                ]
            );

            for (const test of testRows) {

                await connection.query(
                    `
                    INSERT INTO lab_order_tests
                    (
                        order_id,
                        test_id,
                        price,
                        status
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        orderId,
                        test.id,
                        Number(test.price || 0),
                        "Pending"
                    ]
                );
            }
        }

        // -------------------------------------------------
        // COMMIT
        // -------------------------------------------------

        await connection.commit();
        transactionStarted = false;

        console.log(
            "Patient + Lab Order updated successfully"
        );

        return res.status(200).json({
            success: true,
            message: "Patient updated successfully",
            patientId,
            orderId,
            orderNo,
            totalAmount,
            updatedDate,
            updatedTime
        });

    } catch (error) {

        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            "UPDATE PATIENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.sqlMessage ||
                error.message ||
                "An error occurred while updating patient",
            error_code: error.code || null
        });

    } finally {
        connection.release();
    }
});

// ==========================================
// DELETE PATIENT
// ==========================================

app.delete("/api/patients/:id", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const { id } = req.params;

        await connection.beginTransaction();


        // ==========================================
        // CHECK PATIENT
        // ==========================================

        const [patient] = await connection.query(
            `
            SELECT id
            FROM patients
            WHERE id = ?
            `,
            [id]
        );


        if (patient.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                message: "Patient not found"
            });

        }


        // ==========================================
        // DELETE PATIENT TESTS FIRST
        // ==========================================

        await connection.query(
            `
            DELETE FROM patient_tests
            WHERE patient_id = ?
            `,
            [id]
        );


        // ==========================================
        // DELETE PATIENT
        // ==========================================

        const [result] = await connection.query(
            `
            DELETE FROM patients
            WHERE id = ?
            `,
            [id]
        );


        if (result.affectedRows === 0) {

            await connection.rollback();

            return res.status(404).json({
                message: "Patient not found"
            });

        }


        await connection.commit();


        res.json({
            message: "Patient deleted successfully"
        });


    } catch (error) {

        await connection.rollback();

        console.error(error);

        res.status(500).json({
            message: "An error occurred while deleting patient",
            error: error.message
        });

    } finally {

        connection.release();

    }

});

// =========================================================
// CREATE LAB ORDER
// =========================================================

app.post("/api/lab-orders", async (req, res) => {

    const connection = await db.getConnection();
    let transactionStarted = false;

    try {

        const {
            patient_id,
            test_ids
        } = req.body;

        const patientId = Number(patient_id);

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!Number.isInteger(patientId) || patientId <= 0) {
            return res.status(400).json({
                message: "Invalid patient ID"
            });
        }

        if (!Array.isArray(test_ids) || test_ids.length === 0) {
            return res.status(400).json({
                message: "At least one test is required"
            });
        }

        // -------------------------------------------------
        // CHECK PATIENT
        // -------------------------------------------------

        const [patients] = await connection.query(
            `
            SELECT id, patient_name
            FROM patients
            WHERE id = ?
            `,
            [patientId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        // -------------------------------------------------
        // NORMALIZE TEST IDS
        // -------------------------------------------------

        const numericTestIds = [
            ...new Set(
                test_ids
                    .map(Number)
                    .filter(
                        id =>
                            Number.isInteger(id) &&
                            id > 0
                    )
            )
        ];

        if (numericTestIds.length === 0) {
            return res.status(400).json({
                message: "Invalid test selection"
            });
        }

        // -------------------------------------------------
        // GET TESTS
        // -------------------------------------------------

        const placeholders = numericTestIds
            .map(() => "?")
            .join(",");

        const [tests] = await connection.query(
            `
            SELECT
                id,
                test_name,
                price
            FROM tests
            WHERE id IN (${placeholders})
            `,
            numericTestIds
        );

        if (tests.length !== numericTestIds.length) {
            return res.status(400).json({
                message:
                    "One or more selected tests do not exist"
            });
        }

        // -------------------------------------------------
        // TOTAL
        // -------------------------------------------------

        const totalAmount = tests.reduce(
            (total, test) =>
                total + Number(test.price || 0),
            0
        );

        // -------------------------------------------------
        // DATE / TIME
        // -------------------------------------------------

        const now = new Date();

        const orderDate =
            `${now.getFullYear()}-${String(
                now.getMonth() + 1
            ).padStart(2, "0")}-${String(
                now.getDate()
            ).padStart(2, "0")}`;

        const orderTime =
            `${String(
                now.getHours()
            ).padStart(2, "0")}:${String(
                now.getMinutes()
            ).padStart(2, "0")}:${String(
                now.getSeconds()
            ).padStart(2, "0")}`;

        // -------------------------------------------------
        // START TRANSACTION
        // -------------------------------------------------

        await connection.beginTransaction();
        transactionStarted = true;

        // -------------------------------------------------
        // CREATE ORDER
        // -------------------------------------------------

        const [orderResult] = await connection.query(
            `
            INSERT INTO lab_orders
            (
                patient_id,
                order_no,
                order_date,
                order_time,
                status,
                total_amount
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                patientId,
                "TEMP",
                orderDate,
                orderTime,
                "Registered",
                totalAmount
            ]
        );

        const orderId = orderResult.insertId;

        // -------------------------------------------------
        // GENERATE ORDER NUMBER
        // -------------------------------------------------

        const orderNo =
            `LAB-${String(orderId).padStart(6, "0")}`;

        await connection.query(
            `
            UPDATE lab_orders
            SET order_no = ?
            WHERE id = ?
            `,
            [
                orderNo,
                orderId
            ]
        );

        // -------------------------------------------------
        // INSERT ORDER TESTS
        // -------------------------------------------------

        for (const test of tests) {

            await connection.query(
                `
                INSERT INTO lab_order_tests
                (
                    order_id,
                    test_id,
                    price,
                    status
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    orderId,
                    test.id,
                    Number(test.price || 0),
                    "Pending"
                ]
            );
        }

        // -------------------------------------------------
        // COMMIT
        // -------------------------------------------------

        await connection.commit();
        transactionStarted = false;

        res.status(201).json({
            message: "Lab order created successfully",
            orderId,
            orderNo,
            totalAmount
        });

    } catch (error) {

        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            "CREATE LAB ORDER ERROR:",
            error
        );

        res.status(500).json({
            message:
                error.sqlMessage ||
                error.message ||
                "Failed to create lab order"
        });

    } finally {
        connection.release();
    }
});

// =========================================================
// GET ALL LAB ORDERS
// =========================================================

app.get("/api/lab-orders", async (req, res) => {

    try {

        const [orders] = await db.query(`
            SELECT
                lo.id,
                lo.order_no,
                lo.patient_id,
                p.patient_name,
                p.age,
                p.gender,
                p.mobile,
                p.address,
                lo.order_date,
                lo.order_time,
                lo.status,
                lo.total_amount,
                lo.created_at
            FROM lab_orders lo
            INNER JOIN patients p
                ON p.id = lo.patient_id
            ORDER BY lo.id DESC
        `);

        res.status(200).json(orders);

    } catch (error) {

        console.error(
            "GET LAB ORDERS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load lab orders",
            error: error.message
        });

    }

});

// =========================================================
// GET LAB ORDER BY ID
// =========================================================

app.get("/api/lab-orders/:id", async (req, res) => {

    try {

        const orderId = Number(req.params.id);

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        // ------------------------------------------
        // ORDER + PATIENT
        // ------------------------------------------

        const [orders] = await db.query(
            `
            SELECT
                lo.id,
                lo.order_no,
                lo.patient_id,
                lo.order_date,
                lo.order_time,
                lo.status,
                lo.total_amount,
                lo.created_at,

                p.patient_name,
                p.age,
                p.gender,
                p.mobile,
                p.address

            FROM lab_orders lo

            INNER JOIN patients p
                ON p.id = lo.patient_id

            WHERE lo.id = ?

            LIMIT 1
            `,
            [orderId]
        );

        if (orders.length === 0) {

            return res.status(404).json({
                message: "Lab order not found"
            });

        }

        // ------------------------------------------
        // ORDER TESTS
        // ------------------------------------------

        const [tests] = await db.query(
            `
            SELECT
                lot.id,
                lot.test_id,
                lot.price,
                lot.status,

                t.test_code,
                t.test_name,
                t.sample_type,
                t.vial_name,
                t.vial_color

            FROM lab_order_tests lot

            INNER JOIN tests t
                ON t.id = lot.test_id

            WHERE lot.order_id = ?

            ORDER BY lot.id ASC
            `,
            [orderId]
        );

        res.status(200).json({
            order: orders[0],
            tests: tests
        });

    } catch (error) {

        console.error(
            "GET LAB ORDER ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to load lab order",
            error: error.message
        });

    }

});

// =========================================================
// UPDATE LAB ORDER
// =========================================================

app.put("/api/lab-orders/:id", async (req, res) => {

    const connection = await db.getConnection();
    let transactionStarted = false;

    try {

        const orderId = Number(req.params.id);

        const {
            patient_id,
            test_ids
        } = req.body;

        const patientId = Number(patient_id);

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        if (!Number.isInteger(patientId) || patientId <= 0) {
            return res.status(400).json({
                message: "Invalid patient ID"
            });
        }

        if (!Array.isArray(test_ids) || test_ids.length === 0) {
            return res.status(400).json({
                message: "At least one test is required"
            });
        }

        // -------------------------------------------------
        // CHECK ORDER
        // -------------------------------------------------

        const [orders] = await connection.query(
            `
            SELECT id
            FROM lab_orders
            WHERE id = ?
            `,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Lab order not found"
            });
        }

        // -------------------------------------------------
        // CHECK PATIENT
        // -------------------------------------------------

        const [patients] = await connection.query(
            `
            SELECT id
            FROM patients
            WHERE id = ?
            `,
            [patientId]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        // -------------------------------------------------
        // NORMALIZE TEST IDS
        // -------------------------------------------------

        const numericTestIds = [
            ...new Set(
                test_ids
                    .map(Number)
                    .filter(
                        id =>
                            Number.isInteger(id) &&
                            id > 0
                    )
            )
        ];

        if (numericTestIds.length === 0) {
            return res.status(400).json({
                message: "Invalid test selection"
            });
        }

        // -------------------------------------------------
        // GET TESTS
        // -------------------------------------------------

        const placeholders = numericTestIds
            .map(() => "?")
            .join(",");

        const [tests] = await connection.query(
            `
            SELECT
                id,
                test_name,
                price
            FROM tests
            WHERE id IN (${placeholders})
            `,
            numericTestIds
        );

        if (tests.length !== numericTestIds.length) {
            return res.status(400).json({
                message:
                    "One or more selected tests do not exist"
            });
        }

        // -------------------------------------------------
        // CALCULATE TOTAL
        // -------------------------------------------------

        const totalAmount = tests.reduce(
            (total, test) =>
                total + Number(test.price || 0),
            0
        );

        // -------------------------------------------------
        // START TRANSACTION
        // -------------------------------------------------

        await connection.beginTransaction();
        transactionStarted = true;

        // -------------------------------------------------
        // UPDATE ORDER
        // -------------------------------------------------

        await connection.query(
            `
            UPDATE lab_orders
            SET
                patient_id = ?,
                total_amount = ?
            WHERE id = ?
            `,
            [
                patientId,
                totalAmount,
                orderId
            ]
        );

        // -------------------------------------------------
        // DELETE OLD ORDER TESTS
        // -------------------------------------------------

        await connection.query(
            `
            DELETE FROM lab_order_tests
            WHERE order_id = ?
            `,
            [orderId]
        );

        // -------------------------------------------------
        // INSERT UPDATED TESTS
        // -------------------------------------------------

        for (const test of tests) {

            await connection.query(
                `
                INSERT INTO lab_order_tests
                (
                    order_id,
                    test_id,
                    price,
                    status
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    orderId,
                    test.id,
                    Number(test.price || 0),
                    "Pending"
                ]
            );
        }

        // -------------------------------------------------
        // COMMIT
        // -------------------------------------------------

        await connection.commit();
        transactionStarted = false;

        res.status(200).json({
            message: "Lab order updated successfully",
            orderId,
            totalAmount
        });

    } catch (error) {

        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            "UPDATE LAB ORDER ERROR:",
            error
        );

        res.status(500).json({
            message:
                error.sqlMessage ||
                error.message ||
                "Failed to update lab order"
        });

    } finally {

        connection.release();

    }

});


// =========================================================
// UPDATE LAB ORDER STATUS
// =========================================================

app.put("/api/lab-orders/:id/status", async (req, res) => {

    try {

        const orderId = Number(req.params.id);
        const { status } = req.body;

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        if (!status || typeof status !== "string") {
            return res.status(400).json({
                message: "Status is required"
            });
        }

        // -------------------------------------------------
        // ALLOWED STATUS
        // -------------------------------------------------

        const allowedStatuses = [
            "Registered",
            "Sample Collected",
            "Processing",
            "Completed",
            "Delivered",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        // -------------------------------------------------
        // CHECK ORDER
        // -------------------------------------------------

        const [orders] = await db.query(
            `
            SELECT id
            FROM lab_orders
            WHERE id = ?
            `,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Lab order not found"
            });
        }

        // -------------------------------------------------
        // UPDATE STATUS
        // -------------------------------------------------

        await db.query(
            `
            UPDATE lab_orders
            SET status = ?
            WHERE id = ?
            `,
            [
                status,
                orderId
            ]
        );

        res.status(200).json({
            message: "Lab order status updated successfully",
            orderId,
            status
        });

    } catch (error) {

        console.error(
            "UPDATE LAB ORDER STATUS ERROR:",
            error
        );

        res.status(500).json({
            message:
                error.sqlMessage ||
                error.message ||
                "Failed to update lab order status"
        });

    }

});

// =========================================================
// UPDATE LAB ORDER STATUS
// =========================================================

app.put("/api/lab-orders/:id/status", async (req, res) => {
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
        const orderId = Number(req.params.id);
        const { status } = req.body;

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        const allowedStatuses = [
            "Registered",
            "Sample Pending",
            "Sample Collected",
            "Processing",
            "Completed",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        // -------------------------------------------------
        // CHECK ORDER
        // -------------------------------------------------

        const [orders] = await connection.query(
            `
            SELECT id
            FROM lab_orders
            WHERE id = ?
            `,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Lab order not found"
            });
        }

        // -------------------------------------------------
        // START TRANSACTION
        // -------------------------------------------------

        await connection.beginTransaction();
        transactionStarted = true;

        // -------------------------------------------------
        // UPDATE ORDER STATUS
        // -------------------------------------------------

        await connection.query(
            `
            UPDATE lab_orders
            SET status = ?
            WHERE id = ?
            `,
            [
                status,
                orderId
            ]
        );

        // -------------------------------------------------
        // UPDATE INDIVIDUAL TEST STATUS
        // -------------------------------------------------

        let testStatus = "Pending";

        if (status === "Sample Collected") {
            testStatus = "Collected";
        }

        if (status === "Processing") {
            testStatus = "Processing";
        }

        if (status === "Completed") {
            testStatus = "Completed";
        }

        if (status === "Cancelled") {
            testStatus = "Cancelled";
        }

        if (
            status === "Registered" ||
            status === "Sample Pending"
        ) {
            testStatus = "Pending";
        }

        await connection.query(
            `
            UPDATE lab_order_tests
            SET status = ?
            WHERE order_id = ?
            `,
            [
                testStatus,
                orderId
            ]
        );

        // -------------------------------------------------
        // COMMIT
        // -------------------------------------------------

        await connection.commit();
        transactionStarted = false;

        res.json({
            message: "Lab order status updated successfully",
            orderId,
            status
        });

    } catch (error) {

        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            "UPDATE LAB ORDER STATUS ERROR:",
            error
        );

        res.status(500).json({
            message:
                error.sqlMessage ||
                error.message ||
                "Failed to update lab order status"
        });

    } finally {
        connection.release();
    }
});

// =========================================================
// GET ALL SAMPLES
// =========================================================

app.get("/api/samples", async (req, res) => {

    try {

        const [samples] = await db.query(`
            SELECT
                s.id,
                s.sample_no,
                s.order_id,
                lo.order_no,

                s.patient_id,
                p.patient_name,
                p.age,
                p.gender,
                p.mobile,

                s.sample_type,
                s.vial_name,
                s.vial_color,

                s.collected_at,
                s.collected_by,

                s.received_at,
                s.received_by,

                s.status,
                s.rejection_reason,

                s.created_at

            FROM samples s

            INNER JOIN lab_orders lo
                ON lo.id = s.order_id

            INNER JOIN patients p
                ON p.id = s.patient_id

            ORDER BY s.id DESC
        `);

        res.status(200).json(samples);

    } catch (error) {

        console.error(
            "GET SAMPLES ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to load samples",
            error: error.message
        });

    }

});


// =========================================================
// GET SAMPLE BY ID
// =========================================================

app.get("/api/samples/:id", async (req, res) => {

    try {

        const sampleId =
            Number(req.params.id);

        if (
            !Number.isInteger(sampleId) ||
            sampleId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid sample ID"
            });
        }

        const [samples] = await db.query(
            `
            SELECT
                s.id,
                s.sample_no,

                s.order_id,
                lo.order_no,

                s.patient_id,
                p.patient_name,
                p.age,
                p.gender,
                p.mobile,
                p.address,

                s.sample_type,
                s.vial_name,
                s.vial_color,

                s.collected_at,
                s.collected_by,

                s.received_at,
                s.received_by,

                s.status,
                s.rejection_reason,

                s.created_at

            FROM samples s

            INNER JOIN lab_orders lo
                ON lo.id = s.order_id

            INNER JOIN patients p
                ON p.id = s.patient_id

            WHERE s.id = ?

            LIMIT 1
            `,
            [sampleId]
        );

        if (samples.length === 0) {

            return res.status(404).json({
                message: "Sample not found"
            });

        }

        res.status(200).json(
            samples[0]
        );

    } catch (error) {

        console.error(
            "GET SAMPLE ERROR:",
            error
        );

        res.status(500).json({
            message: "Failed to load sample",
            error: error.message
        });

    }

});


// =========================================================
// CREATE SAMPLE
// =========================================================

app.post("/api/samples", async (req, res) => {

    const connection =
        await db.getConnection();

    let transactionStarted = false;

    try {

        const {
            order_id
        } = req.body;

        const orderId =
            Number(order_id);

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (
            !Number.isInteger(orderId) ||
            orderId <= 0
        ) {

            return res.status(400).json({
                message: "Invalid order ID"
            });

        }

        // -------------------------------------------------
        // CHECK ORDER
        // -------------------------------------------------

        const [orders] =
            await connection.query(
                `
                SELECT
                    lo.id,
                    lo.patient_id,
                    lo.status
                FROM lab_orders lo
                WHERE lo.id = ?
                LIMIT 1
                `,
                [orderId]
            );

        if (orders.length === 0) {

            return res.status(404).json({
                message: "Lab order not found"
            });

        }

        const order =
            orders[0];

        // -------------------------------------------------
        // GET ORDER TESTS
        // -------------------------------------------------

        const [tests] =
            await connection.query(
                `
                SELECT
                    lot.test_id,
                    t.test_name,
                    t.sample_type,
                    t.vial_name,
                    t.vial_color
                FROM lab_order_tests lot

                INNER JOIN tests t
                    ON t.id = lot.test_id

                WHERE lot.order_id = ?

                ORDER BY lot.id ASC
                `,
                [orderId]
            );

        if (tests.length === 0) {

            return res.status(400).json({
                message:
                    "No tests found for this order"
            });

        }

        // -------------------------------------------------
        // START TRANSACTION
        // -------------------------------------------------

        await connection.beginTransaction();

        transactionStarted = true;

        // -------------------------------------------------
        // GROUP TESTS BY SAMPLE CONFIGURATION
        // -------------------------------------------------

        const sampleGroups = {};

        for (const test of tests) {

            const key =
                `${test.sample_type || ""}|` +
                `${test.vial_name || ""}|` +
                `${test.vial_color || ""}`;

            if (!sampleGroups[key]) {

                sampleGroups[key] = {
                    sample_type:
                        test.sample_type,

                    vial_name:
                        test.vial_name,

                    vial_color:
                        test.vial_color
                };

            }

        }

        // -------------------------------------------------
        // CREATE SAMPLES
        // -------------------------------------------------

        const createdSamples = [];

        for (
            const group
            of Object.values(sampleGroups)
        ) {

            const [sampleResult] =
                await connection.query(
                    `
                    INSERT INTO samples
                    (
                        sample_no,
                        order_id,
                        patient_id,
                        sample_type,
                        vial_name,
                        vial_color,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        "TEMP",
                        orderId,
                        order.patient_id,
                        group.sample_type,
                        group.vial_name,
                        group.vial_color,
                        "Pending"
                    ]
                );

            const sampleId =
                sampleResult.insertId;

            const sampleNo = `SMP-${Date.now()}-${item.order_item_id}`;

            await connection.query(
                `
                UPDATE samples
                SET sample_no = ?
                WHERE id = ?
                `,
                [
                    sampleNo,
                    sampleId
                ]
            );

            createdSamples.push({
                id: sampleId,
                sample_no: sampleNo,
                sample_type:
                    group.sample_type,
                vial_name:
                    group.vial_name,
                vial_color:
                    group.vial_color
            });

        }

        // -------------------------------------------------
        // COMMIT
        // -------------------------------------------------

        await connection.commit();

        transactionStarted = false;

        res.status(201).json({
            message:
                "Sample(s) created successfully",

            orderId,

            samples:
                createdSamples
        });

    } catch (error) {

        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            "CREATE SAMPLE ERROR:",
            error
        );

        res.status(500).json({
            message:
                error.sqlMessage ||
                error.message ||
                "Failed to create sample"
        });

    } finally {

        connection.release();

    }

});


// =========================================================
// UPDATE SAMPLE
// =========================================================

app.put("/api/samples/:id", async (req, res) => {

    try {

        const sampleId =
            Number(req.params.id);

        const {
            sample_type,
            vial_name,
            vial_color,
            rejection_reason
        } = req.body;

        if (
            !Number.isInteger(sampleId) ||
            sampleId <= 0
        ) {

            return res.status(400).json({
                message: "Invalid sample ID"
            });

        }

        const [samples] =
            await db.query(
                `
                SELECT id
                FROM samples
                WHERE id = ?
                `,
                [sampleId]
            );

        if (samples.length === 0) {

            return res.status(404).json({
                message: "Sample not found"
            });

        }

        await db.query(
            `
            UPDATE samples
            SET
                sample_type = ?,
                vial_name = ?,
                vial_color = ?,
                rejection_reason = ?
            WHERE id = ?
            `,
            [
                sample_type,
                vial_name || null,
                vial_color || null,
                rejection_reason || null,
                sampleId
            ]
        );

        res.status(200).json({
            message:
                "Sample updated successfully"
        });

    } catch (error) {

        console.error(
            "UPDATE SAMPLE ERROR:",
            error
        );

        res.status(500).json({
            message:
                error.sqlMessage ||
                error.message ||
                "Failed to update sample"
        });

    }

});


// =========================================================
// UPDATE SAMPLE STATUS
// =========================================================

app.put("/api/samples/:id/status", async (req, res) => {

    try {

        const sampleId =
            Number(req.params.id);

        const {
            status,
            collected_by,
            received_by,
            rejection_reason
        } = req.body;

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (
            !Number.isInteger(sampleId) ||
            sampleId <= 0
        ) {

            return res.status(400).json({
                message: "Invalid sample ID"
            });

        }

        const allowedStatuses = [
            "Pending",
            "Collected",
            "Received",
            "Rejected"
        ];

        if (
            !allowedStatuses.includes(status)
        ) {

            return res.status(400).json({
                message:
                    "Invalid sample status"
            });

        }

        // -------------------------------------------------
        // CHECK SAMPLE
        // -------------------------------------------------

        const [samples] =
            await db.query(
                `
                SELECT
                    id,
                    status
                FROM samples
                WHERE id = ?
                LIMIT 1
                `,
                [sampleId]
            );

        if (samples.length === 0) {

            return res.status(404).json({
                message: "Sample not found"
            });

        }

        // -------------------------------------------------
        // COLLECTED
        // -------------------------------------------------

        if (status === "Collected") {

            await db.query(
                `
                UPDATE samples
                SET
                    status = ?,
                    collected_at = NOW(),
                    collected_by = ?,
                    rejection_reason = NULL
                WHERE id = ?
                `,
                [
                    status,
                    collected_by ||
                        "Lab Staff",
                    sampleId
                ]
            );

        }

        // -------------------------------------------------
        // RECEIVED
        // -------------------------------------------------

        else if (status === "Received") {

            await db.query(
                `
                UPDATE samples
                SET
                    status = ?,
                    received_at = NOW(),
                    received_by = ?,
                    rejection_reason = NULL
                WHERE id = ?
                `,
                [
                    status,
                    received_by ||
                        "Lab Staff",
                    sampleId
                ]
            );

        }

        // -------------------------------------------------
        // REJECTED
        // -------------------------------------------------

        else if (status === "Rejected") {

            await db.query(
                `
                UPDATE samples
                SET
                    status = ?,
                    rejection_reason = ?
                WHERE id = ?
                `,
                [
                    status,
                    rejection_reason ||
                        "Sample rejected",
                    sampleId
                ]
            );

        }

        // -------------------------------------------------
        // PENDING
        // -------------------------------------------------

        else {

            await db.query(
                `
                UPDATE samples
                SET
                    status = ?,
                    rejection_reason = NULL
                WHERE id = ?
                `,
                [
                    status,
                    sampleId
                ]
            );

        }

        res.status(200).json({
            message:
                "Sample status updated successfully",

            sampleId,

            status
        });

    } catch (error) {

        console.error(
            "UPDATE SAMPLE STATUS ERROR:",
            error
        );

        res.status(500).json({
            message:
                error.sqlMessage ||
                error.message ||
                "Failed to update sample status"
        });

    }

});

// =====================================================
// LAB ORDERS
// =====================================================

// GET ALL LAB ORDERS
app.get("/api/lab-orders", async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT
                lo.id,
                lo.order_no,
                lo.patient_id,
                p.patient_name,
                p.mobile,
                lo.order_date,
                lo.order_time,
                lo.status,
                lo.total_amount,
                lo.created_at,
                lo.updated_at,
                COUNT(oi.id) AS test_count
            FROM lab_orders lo
            LEFT JOIN patients p
                ON p.id = lo.patient_id
            LEFT JOIN lab_order_items oi
                ON oi.order_id = lo.id
            GROUP BY
                lo.id,
                lo.order_no,
                lo.patient_id,
                p.patient_name,
                p.mobile,
                lo.order_date,
                lo.order_time,
                lo.status,
                lo.total_amount,
                lo.created_at,
                lo.updated_at
            ORDER BY lo.id DESC
        `);

        res.json(orders);

    } catch (error) {
        console.error("GET LAB ORDERS ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch lab orders",
            error: error.message
        });
    }
});


// =====================================================
// GET SINGLE LAB ORDER WITH TESTS
// =====================================================

app.get("/api/lab-orders/:id", async (req, res) => {
    try {

        const { id } = req.params;

        // ---------------------------------------------
        // ORDER + PATIENT
        // ---------------------------------------------

        const [orders] = await db.query(`
            SELECT
                lo.id,
                lo.order_no,
                lo.patient_id,
                p.patient_name,
                p.mobile,
                p.age,
                p.gender,
                p.address,
                lo.order_date,
                lo.order_time,
                lo.status,
                lo.total_amount,
                lo.created_at,
                lo.updated_at
            FROM lab_orders lo
            LEFT JOIN patients p
                ON p.id = lo.patient_id
            WHERE lo.id = ?
        `, [id]);


        if (orders.length === 0) {

            return res.status(404).json({
                message: "Lab order not found"
            });

        }


        // ---------------------------------------------
        // ORDER TESTS
        // ---------------------------------------------

        const [tests] = await db.query(`
            SELECT
                oi.id,
                oi.order_id,
                oi.test_id,
                t.test_code,
                t.test_name,
                t.sample_type,
                t.vial_name,
                t.vial_color,
                oi.price,
                oi.status,
                oi.created_at
            FROM lab_order_items oi
            LEFT JOIN tests t
                ON t.id = oi.test_id
            WHERE oi.order_id = ?
            ORDER BY oi.id ASC
        `, [id]);


        // ---------------------------------------------
        // RESPONSE FORMAT
        // IMPORTANT:
        // Frontend expects data.order + data.tests
        // ---------------------------------------------

        res.json({

            order: orders[0],

            tests: tests

        });


    } catch (error) {

        console.error(
            "GET SINGLE LAB ORDER ERROR:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch lab order",

            error:
                error.message

        });

    }
});


// =====================================================
// UPDATE LAB ORDER STATUS
// =====================================================

app.put("/api/lab-orders/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = [
            "Registered",
            "Sample Pending",
            "Sample Collected",
            "Processing",
            "Completed",
            "Delivered",
            "Cancelled"
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        const [result] = await db.query(`
            UPDATE lab_orders
            SET status = ?
            WHERE id = ?
        `, [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Lab order not found"
            });
        }

        res.json({
            message: "Lab order status updated successfully"
        });

    } catch (error) {
        console.error("UPDATE LAB ORDER STATUS ERROR:", error);

        res.status(500).json({
            message: "Failed to update order status",
            error: error.message
        });
    }
});


// =====================================================
// UPDATE INDIVIDUAL TEST STATUS
// =====================================================

app.put("/api/lab-orders/items/:itemId/status", async (req, res) => {
    try {
        const { itemId } = req.params;
        const { status } = req.body;

        const validStatuses = [
            "Pending",
            "Collected",
            "Processing",
            "Completed",
            "Cancelled"
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid test status"
            });
        }

        const [result] = await db.query(`
            UPDATE lab_order_items
            SET status = ?
            WHERE id = ?
        `, [status, itemId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Order item not found"
            });
        }

        res.json({
            message: "Test status updated successfully"
        });

    } catch (error) {
        console.error("UPDATE ORDER ITEM STATUS ERROR:", error);

        res.status(500).json({
            message: "Failed to update test status",
            error: error.message
        });
    }
});


// =====================================================
// CANCEL LAB ORDER
// =====================================================

app.put("/api/lab-orders/:id/cancel", async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;

        await connection.beginTransaction();

        const [order] = await connection.query(`
            SELECT id
            FROM lab_orders
            WHERE id = ?
        `, [id]);

        if (order.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Lab order not found"
            });
        }

        await connection.query(`
            UPDATE lab_orders
            SET status = 'Cancelled'
            WHERE id = ?
        `, [id]);

        await connection.query(`
            UPDATE lab_order_items
            SET status = 'Cancelled'
            WHERE order_id = ?
        `, [id]);

        await connection.commit();

        res.json({
            message: "Lab order cancelled successfully"
        });

    } catch (error) {
        await connection.rollback();

        console.error("CANCEL LAB ORDER ERROR:", error);

        res.status(500).json({
            message: "Failed to cancel lab order",
            error: error.message
        });

    } finally {
        connection.release();
    }
});

// =====================================================
// UPDATE LAB ORDER
// Patient + Tests
// =====================================================

app.put("/api/lab-orders/:id", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const { id } = req.params;

        const {
            patient_id,
            test_ids
        } = req.body;


        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (!patient_id) {

            return res.status(400).json({
                message: "Patient is required"
            });

        }


        if (
            !Array.isArray(test_ids) ||
            test_ids.length === 0
        ) {

            return res.status(400).json({
                message:
                    "At least one test is required"
            });

        }


        await connection.beginTransaction();


        // ---------------------------------------------
        // CHECK ORDER
        // ---------------------------------------------

        const [orders] = await connection.query(`
            SELECT id
            FROM lab_orders
            WHERE id = ?
        `, [id]);


        if (orders.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                message: "Lab order not found"
            });

        }


        // ---------------------------------------------
        // GET TEST PRICES
        // ---------------------------------------------

        const placeholders =
            test_ids.map(() => "?").join(",");


        const [tests] = await connection.query(
            `
            SELECT
                id,
                price
            FROM tests
            WHERE id IN (${placeholders})
            `,
            test_ids
        );


        if (tests.length !== test_ids.length) {

            await connection.rollback();

            return res.status(400).json({
                message:
                    "One or more selected tests are invalid"
            });

        }


        // ---------------------------------------------
        // CALCULATE TOTAL
        // ---------------------------------------------

        const totalAmount =
            tests.reduce(
                (total, test) =>
                    total +
                    Number(test.price || 0),
                0
            );


        // ---------------------------------------------
        // UPDATE ORDER
        // ---------------------------------------------

        await connection.query(
            `
            UPDATE lab_orders
            SET
                patient_id = ?,
                total_amount = ?
            WHERE id = ?
            `,
            [
                Number(patient_id),
                totalAmount,
                id
            ]
        );


        // ---------------------------------------------
        // DELETE OLD ORDER ITEMS
        // ---------------------------------------------

        await connection.query(
            `
            DELETE FROM lab_order_items
            WHERE order_id = ?
            `,
            [id]
        );


        // ---------------------------------------------
        // INSERT NEW ORDER ITEMS
        // ---------------------------------------------

        for (const test of tests) {

            await connection.query(
                `
                INSERT INTO lab_order_items
                (
                    order_id,
                    test_id,
                    price,
                    status
                )
                VALUES (?, ?, ?, 'Pending')
                `,
                [
                    id,
                    test.id,
                    test.price
                ]
            );

        }


        await connection.commit();


        res.json({

            message:
                "Lab order updated successfully",

            order_id:
                Number(id),

            total_amount:
                totalAmount

        });


    } catch (error) {

        await connection.rollback();

        console.error(
            "UPDATE LAB ORDER ERROR:",
            error
        );

        res.status(500).json({

            message:
                "Failed to update lab order",

            error:
                error.message

        });

    } finally {

        connection.release();

    }

});

// =====================================================
// UPDATE ORDER STATUS
// =====================================================

app.put("/api/lab-orders/:id/status", async (req, res) => {

    try {

        const { id } = req.params;
        const { status } = req.body;


        const validStatuses = [
            "Registered",
            "Sample Pending",
            "Sample Collected",
            "Processing",
            "Completed",
            "Delivered",
            "Cancelled"
        ];


        if (!validStatuses.includes(status)) {

            return res.status(400).json({
                message: "Invalid order status"
            });

        }


        const [result] = await db.query(
            `
            UPDATE lab_orders
            SET status = ?
            WHERE id = ?
            `,
            [
                status,
                id
            ]
        );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "Lab order not found"
            });

        }


        res.json({

            message:
                "Lab order status updated successfully"

        });


    } catch (error) {

        console.error(
            "UPDATE ORDER STATUS ERROR:",
            error
        );

        res.status(500).json({

            message:
                "Failed to update order status",

            error:
                error.message

        });

    }

});

// =====================================================
// SAMPLE MANAGEMENT
// =====================================================


// =====================================================
// GET ALL SAMPLES
// =====================================================

app.get("/api/samples", async (req, res) => {
    try {

        const [samples] = await db.query(`
            SELECT
                s.id,
                s.sample_no,

                s.order_id,
                lo.order_no,

                s.order_item_id,

                s.patient_id,
                p.patient_name,
                p.mobile,
                p.age,
                p.gender,

                s.test_id,
                t.test_code,
                t.test_name,

                s.sample_type,
                s.vial_name,
                s.vial_color,

                s.collected_at,
                s.collected_by,

                s.received_at,
                s.received_by,

                s.status,
                s.rejection_reason,

                s.created_at

            FROM samples s

            LEFT JOIN lab_orders lo
                ON lo.id = s.order_id

            LEFT JOIN patients p
                ON p.id = s.patient_id

            LEFT JOIN tests t
                ON t.id = s.test_id

            ORDER BY s.id DESC
        `);

        res.json(samples);

    } catch (error) {

        console.error("GET SAMPLES ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch samples",
            error: error.message
        });

    }
});


// =====================================================
// GET SINGLE SAMPLE
// =====================================================

app.get("/api/samples/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const [samples] = await db.query(`
            SELECT
                s.id,
                s.sample_no,

                s.order_id,
                lo.order_no,

                s.order_item_id,

                s.patient_id,
                p.patient_name,
                p.mobile,
                p.age,
                p.gender,
                p.address,

                s.test_id,
                t.test_code,
                t.test_name,

                s.sample_type,
                s.vial_name,
                s.vial_color,

                s.collected_at,
                s.collected_by,

                s.received_at,
                s.received_by,

                s.status,
                s.rejection_reason,

                s.created_at

            FROM samples s

            LEFT JOIN lab_orders lo
                ON lo.id = s.order_id

            LEFT JOIN patients p
                ON p.id = s.patient_id

            LEFT JOIN tests t
                ON t.id = s.test_id

            WHERE s.id = ?
        `, [id]);

        if (samples.length === 0) {

            return res.status(404).json({
                message: "Sample not found"
            });

        }

        res.json(samples[0]);

    } catch (error) {

        console.error("GET SAMPLE ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch sample",
            error: error.message
        });

    }

});


// =====================================================
// COLLECT SAMPLE
// =====================================================

app.put("/api/samples/:id/collect", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const { id } = req.params;

        const {
            collected_by,
            collected_at
        } = req.body;

        if (!collected_by) {

            return res.status(400).json({
                message: "Collector name is required"
            });

        }

        await connection.beginTransaction();


        // ---------------------------------------------
        // GET SAMPLE
        // ---------------------------------------------

        const [samples] = await connection.query(`
            SELECT
                id,
                sample_no,
                order_id,
                order_item_id,
                patient_id,
                test_id,
                status
            FROM samples
            WHERE id = ?
            FOR UPDATE
        `, [id]);


        if (samples.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                message: "Sample not found"
            });

        }

        const sample = samples[0];


        if (sample.status === "Collected") {

            await connection.rollback();

            return res.status(400).json({
                message: "Sample is already collected"
            });

        }


        if (sample.status === "Received") {

            await connection.rollback();

            return res.status(400).json({
                message: "Received sample cannot be collected again"
            });

        }


        if (sample.status === "Rejected") {

            await connection.rollback();

            return res.status(400).json({
                message: "Rejected sample cannot be collected"
            });

        }


        // ---------------------------------------------
        // UPDATE SAMPLE
        // ---------------------------------------------

        const finalCollectedAt =
            collected_at ||
            new Date();


        await connection.query(`
            UPDATE samples
            SET
                collected_at = ?,
                collected_by = ?,
                status = 'Collected',
                rejection_reason = NULL
            WHERE id = ?
        `, [
            finalCollectedAt,
            collected_by,
            id
        ]);


        // ---------------------------------------------
        // UPDATE ORDER ITEM
        // ---------------------------------------------

        if (sample.order_item_id) {

            await connection.query(`
                UPDATE lab_order_items
                SET status = 'Collected'
                WHERE id = ?
            `, [sample.order_item_id]);

        }


        // ---------------------------------------------
        // CHECK ALL SAMPLES
        // ---------------------------------------------

        const [summaryRows] = await connection.query(`
            SELECT
                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN status = 'Collected'
                        THEN 1
                        ELSE 0
                    END
                ) AS collected,

                SUM(
                    CASE
                        WHEN status = 'Pending'
                        THEN 1
                        ELSE 0
                    END
                ) AS pending,

                SUM(
                    CASE
                        WHEN status = 'Rejected'
                        THEN 1
                        ELSE 0
                    END
                ) AS rejected

            FROM samples
            WHERE order_id = ?
        `, [sample.order_id]);


        const summary = summaryRows[0];

        const total =
            Number(summary.total || 0);

        const collected =
            Number(summary.collected || 0);

        const pending =
            Number(summary.pending || 0);


        // ---------------------------------------------
        // UPDATE ORDER STATUS
        // ---------------------------------------------

        if (
            total > 0 &&
            collected === total
        ) {

            await connection.query(`
                UPDATE lab_orders
                SET status = 'Sample Collected'
                WHERE id = ?
            `, [sample.order_id]);

        } else {

            await connection.query(`
                UPDATE lab_orders
                SET status = 'Sample Pending'
                WHERE id = ?
            `, [sample.order_id]);

        }


        await connection.commit();


        res.json({

            message: "Sample collected successfully",

            sample_id: Number(sample.id),

            sample_no: sample.sample_no,

            order_id: Number(sample.order_id),

            patient_id: Number(sample.patient_id),

            test_id: sample.test_id
                ? Number(sample.test_id)
                : null,

            status: "Collected",

            collected_by,

            collected_at: finalCollectedAt,

            order_status:
                total > 0 && collected === total
                    ? "Sample Collected"
                    : "Sample Pending",

            summary: {
                total,
                collected,
                pending,
                rejected:
                    Number(summary.rejected || 0)
            }

        });


    } catch (error) {

        await connection.rollback();

        console.error(
            "COLLECT SAMPLE ERROR:",
            error
        );

        res.status(500).json({

            message:
                "Failed to collect sample",

            error:
                error.message

        });

    } finally {

        connection.release();

    }

});


// =====================================================
// RECEIVE SAMPLE
// =====================================================

app.put("/api/samples/:id/receive", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const { id } = req.params;

        const {
            received_by,
            received_at
        } = req.body;


        if (!received_by) {

            return res.status(400).json({
                message:
                    "Receiver name is required"
            });

        }


        await connection.beginTransaction();


        const [samples] = await connection.query(`
            SELECT
                id,
                sample_no,
                order_id,
                order_item_id,
                status
            FROM samples
            WHERE id = ?
            FOR UPDATE
        `, [id]);


        if (samples.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                message:
                    "Sample not found"
            });

        }


        const sample = samples[0];


        if (sample.status === "Pending") {

            await connection.rollback();

            return res.status(400).json({
                message:
                    "Pending sample cannot be received. Collect it first."
            });

        }


        if (sample.status === "Received") {

            await connection.rollback();

            return res.status(400).json({
                message:
                    "Sample is already received"
            });

        }


        if (sample.status === "Rejected") {

            await connection.rollback();

            return res.status(400).json({
                message:
                    "Rejected sample cannot be received"
            });

        }


        const finalReceivedAt =
            received_at ||
            new Date();


        await connection.query(`
            UPDATE samples
            SET
                received_at = ?,
                received_by = ?,
                status = 'Received'
            WHERE id = ?
        `, [
            finalReceivedAt,
            received_by,
            id
        ]);


        await connection.commit();


        res.json({

            message:
                "Sample received successfully",

            sample_id:
                Number(sample.id),

            sample_no:
                sample.sample_no,

            order_id:
                Number(sample.order_id),

            status:
                "Received",

            received_by,

            received_at:
                finalReceivedAt

        });


    } catch (error) {

        await connection.rollback();

        console.error(
            "RECEIVE SAMPLE ERROR:",
            error
        );

        res.status(500).json({

            message:
                "Failed to receive sample",

            error:
                error.message

        });

    } finally {

        connection.release();

    }

});


// =====================================================
// REJECT SAMPLE
// =====================================================

app.put("/api/samples/:id/reject", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const { id } = req.params;

        const {
            rejection_reason
        } = req.body;


        if (!rejection_reason) {

            return res.status(400).json({
                message:
                    "Rejection reason is required"
            });

        }


        await connection.beginTransaction();


        const [samples] = await connection.query(`
            SELECT
                id,
                sample_no,
                order_id,
                order_item_id,
                status
            FROM samples
            WHERE id = ?
            FOR UPDATE
        `, [id]);


        if (samples.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                message:
                    "Sample not found"
            });

        }


        const sample = samples[0];


        if (sample.status === "Received") {

            await connection.rollback();

            return res.status(400).json({
                message:
                    "Received sample cannot be rejected"
            });

        }


        if (sample.status === "Rejected") {

            await connection.rollback();

            return res.status(400).json({
                message:
                    "Sample is already rejected"
            });

        }


        await connection.query(`
            UPDATE samples
            SET
                status = 'Rejected',
                rejection_reason = ?
            WHERE id = ?
        `, [
            rejection_reason,
            id
        ]);


        // ---------------------------------------------
        // ORDER ITEM BACK TO PENDING
        // ---------------------------------------------

        if (sample.order_item_id) {

            await connection.query(`
                UPDATE lab_order_items
                SET status = 'Pending'
                WHERE id = ?
            `, [sample.order_item_id]);

        }


        // ---------------------------------------------
        // ORDER BACK TO SAMPLE PENDING
        // ---------------------------------------------

        await connection.query(`
            UPDATE lab_orders
            SET status = 'Sample Pending'
            WHERE id = ?
        `, [sample.order_id]);


        await connection.commit();


        res.json({

            message:
                "Sample rejected successfully",

            sample_id:
                Number(sample.id),

            sample_no:
                sample.sample_no,

            order_id:
                Number(sample.order_id),

            status:
                "Rejected",

            rejection_reason

        });


    } catch (error) {

        await connection.rollback();

        console.error(
            "REJECT SAMPLE ERROR:",
            error
        );

        res.status(500).json({

            message:
                "Failed to reject sample",

            error:
                error.message

        });

    } finally {

        connection.release();

    }

});

// =====================================================
// CREATE SAMPLES FOR AN ORDER
// =====================================================

app.post("/api/samples/create-for-order/:orderId", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const { orderId } = req.params;

        await connection.beginTransaction();


        // =================================================
        // GET ORDER
        // =================================================

        const [orders] = await connection.query(`
            SELECT
                id,
                patient_id,
                status
            FROM lab_orders
            WHERE id = ?
            LIMIT 1
        `, [orderId]);


        if (orders.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                message: "Lab order not found"
            });

        }


        const order = orders[0];


        // =================================================
        // GET ORDER ITEMS
        // =================================================

        const [items] = await connection.query(`
            SELECT
                loi.id AS order_item_id,
                loi.order_id,
                loi.test_id,
                loi.price,
                loi.status AS item_status,

                t.test_code,
                t.test_name,
                t.sample_type,
                t.vial_name,
                t.vial_color

            FROM lab_order_items loi

            INNER JOIN tests t
                ON t.id = loi.test_id

            WHERE loi.order_id = ?
              AND loi.status != 'Cancelled'

            ORDER BY loi.id ASC
        `, [orderId]);


        if (items.length === 0) {

            await connection.rollback();

            return res.status(400).json({
                message:
                    "No active tests found for this order"
            });

        }


        // =================================================
        // CREATE SAMPLES
        // =================================================

        let createdCount = 0;
        let existingCount = 0;

        const samples = [];


        for (const item of items) {


            // =============================================
            // CHECK EXISTING SAMPLE
            // =============================================

            const [existing] = await connection.query(`
                SELECT
                    id,
                    sample_no,
                    order_item_id,
                    test_id,
                    status
                FROM samples
                WHERE order_id = ?
                  AND order_item_id = ?
                LIMIT 1
            `, [
                orderId,
                item.order_item_id
            ]);


            if (existing.length > 0) {

                existingCount++;

                samples.push({

                    id:
                        existing[0].id,

                    sample_no:
                        existing[0].sample_no,

                    order_item_id:
                        existing[0].order_item_id,

                    test_id:
                        existing[0].test_id,

                    status:
                        existing[0].status,

                    created:
                        false

                });

                continue;

            }


            // =============================================
            // GENERATE SAMPLE NUMBER
            // =============================================

            const [lastSample] = await connection.query(`
                SELECT id
                FROM samples
                ORDER BY id DESC
                LIMIT 1
            `);


            let nextNumber = 1;


            if (lastSample.length > 0) {

                nextNumber =
                    Number(lastSample[0].id) + 1;

            }


            const sampleNo =
                `SMP-${String(nextNumber).padStart(6, "0")}`;


            // =============================================
            // INSERT SAMPLE
            // =============================================

            const [result] = await connection.query(`
                INSERT INTO samples
                (
                    sample_no,
                    order_id,
                    order_item_id,
                    patient_id,
                    test_id,
                    sample_type,
                    vial_name,
                    vial_color,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
            `, [

                sampleNo,

                item.order_id,

                item.order_item_id,

                order.patient_id,

                item.test_id,

                item.sample_type || "Unknown",

                item.vial_name || null,

                item.vial_color || null

            ]);


            createdCount++;


            samples.push({

                id:
                    result.insertId,

                sample_no:
                    sampleNo,

                order_item_id:
                    item.order_item_id,

                test_id:
                    item.test_id,

                test_code:
                    item.test_code,

                test_name:
                    item.test_name,

                sample_type:
                    item.sample_type,

                vial_name:
                    item.vial_name,

                vial_color:
                    item.vial_color,

                status:
                    "Pending",

                created:
                    true

            });

        }


        // =================================================
        // UPDATE LAB ORDER STATUS
        // =================================================

        await connection.query(`
            UPDATE lab_orders
            SET status = 'Sample Pending'
            WHERE id = ?
        `, [orderId]);


        // =================================================
        // COMMIT
        // =================================================

        await connection.commit();


        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            message:
                "Samples created successfully",

            order_id:
                Number(orderId),

            patient_id:
                Number(order.patient_id),

            total_order_items:
                items.length,

            created_count:
                createdCount,

            existing_count:
                existingCount,

            samples

        });


    } catch (error) {

        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error(
                "Rollback error:",
                rollbackError
            );
        }


        console.error(
            "CREATE SAMPLES ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to create samples",

            error:
                error.message

        });

    } finally {

        connection.release();

    }

});

// =====================================================
// GET SINGLE SAMPLE
// =====================================================

app.get("/api/samples/:id", async (req, res) => {

    try {

        const { id } = req.params;


        const [samples] = await db.query(`
            SELECT
                s.id,
                s.sample_no,

                s.order_id,
                lo.order_no,

                s.order_item_id,

                s.patient_id,
                p.patient_name,
                p.mobile,
                p.age,
                p.gender,
                p.address,

                s.test_id,
                t.test_code,
                t.test_name,

                s.sample_type,
                s.vial_name,
                s.vial_color,

                s.collection_date,
                s.collection_time,

                s.collected_by,

                s.status,
                s.rejection_reason,

                s.created_at,
                s.updated_at

            FROM samples s

            LEFT JOIN lab_orders lo
                ON lo.id = s.order_id

            LEFT JOIN patients p
                ON p.id = s.patient_id

            LEFT JOIN tests t
                ON t.id = s.test_id

            WHERE s.id = ?
        `, [id]);


        if (samples.length === 0) {

            return res.status(404).json({
                message: "Sample not found"
            });

        }


        res.json(samples[0]);


    } catch (error) {

        console.error(
            "GET SAMPLE ERROR:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch sample",

            error:
                error.message

        });

    }

});


// =====================================================
// COLLECT SAMPLE
// =====================================================

app.put("/api/samples/:id/collect", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const { id } = req.params;

        const {
            collected_by,
            collected_at
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (!collected_by) {

            return res.status(400).json({
                message: "Collector name is required"
            });

        }


        await connection.beginTransaction();


        // =================================================
        // GET SAMPLE
        // =================================================

        const [samples] = await connection.query(`
            SELECT
                id,
                sample_no,
                order_id,
                order_item_id,
                patient_id,
                test_id,
                status
            FROM samples
            WHERE id = ?
            LIMIT 1
        `, [id]);


        if (samples.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                message: "Sample not found"
            });

        }


        const sample = samples[0];


        // =================================================
        // STATUS VALIDATION
        // =================================================

        if (sample.status === "Collected") {

            await connection.rollback();

            return res.status(400).json({
                message: "Sample is already collected"
            });

        }


        if (sample.status === "Received") {

            await connection.rollback();

            return res.status(400).json({
                message: "Received sample cannot be collected again"
            });

        }


        if (sample.status === "Rejected") {

            await connection.rollback();

            return res.status(400).json({
                message: "Rejected sample cannot be collected"
            });

        }


        // =================================================
        // COLLECTION TIME
        // =================================================

        const collectionDateTime =
            collected_at ||
            new Date();


        // =================================================
        // UPDATE SAMPLE
        // =================================================

        await connection.query(`
            UPDATE samples
            SET
                collected_at = ?,
                collected_by = ?,
                status = 'Collected'
            WHERE id = ?
        `, [
            collectionDateTime,
            collected_by,
            id
        ]);


        // =================================================
        // UPDATE ORDER ITEM
        // =================================================

        await connection.query(`
            UPDATE lab_order_items
            SET
                status = 'Collected'
            WHERE id = ?
        `, [
            sample.order_item_id
        ]);


        // =================================================
        // CHECK ALL SAMPLES OF ORDER
        // =================================================

        const [summaryRows] = await connection.query(`
            SELECT
                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN status = 'Collected'
                             OR status = 'Received'
                        THEN 1
                        ELSE 0
                    END
                ) AS collected,

                SUM(
                    CASE
                        WHEN status = 'Pending'
                        THEN 1
                        ELSE 0
                    END
                ) AS pending,

                SUM(
                    CASE
                        WHEN status = 'Rejected'
                        THEN 1
                        ELSE 0
                    END
                ) AS rejected

            FROM samples
            WHERE order_id = ?
        `, [
            sample.order_id
        ]);


        const summary = {

            total:
                Number(
                    summaryRows[0].total || 0
                ),

            collected:
                Number(
                    summaryRows[0].collected || 0
                ),

            pending:
                Number(
                    summaryRows[0].pending || 0
                ),

            rejected:
                Number(
                    summaryRows[0].rejected || 0
                )

        };


        // =================================================
        // UPDATE ORDER STATUS
        // =================================================

        let orderStatus = "Sample Pending";


        if (
            summary.total > 0 &&
            summary.collected === summary.total
        ) {

            orderStatus =
                "Sample Collected";

        }


        await connection.query(`
            UPDATE lab_orders
            SET
                status = ?
            WHERE id = ?
        `, [
            orderStatus,
            sample.order_id
        ]);


        // =================================================
        // COMMIT
        // =================================================

        await connection.commit();


        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            message:
                "Sample collected successfully",

            sample_id:
                Number(sample.id),

            sample_no:
                sample.sample_no,

            order_id:
                Number(sample.order_id),

            patient_id:
                Number(sample.patient_id),

            test_id:
                Number(sample.test_id),

            status:
                "Collected",

            collected_by,

            collected_at:
                collectionDateTime,

            order_status:
                orderStatus,

            summary

        });


    } catch (error) {

        try {

            await connection.rollback();

        } catch (rollbackError) {

            console.error(
                "ROLLBACK ERROR:",
                rollbackError
            );

        }


        console.error(
            "COLLECT SAMPLE ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to collect sample",

            error:
                error.message

        });

    } finally {

        connection.release();

    }

});

// =====================================================
// REJECT SAMPLE
// =====================================================

app.put("/api/samples/:id/reject", async (req, res) => {

    const connection = await db.getConnection();

    try {

        const { id } = req.params;

        const {
            rejection_reason
        } = req.body;


        if (!rejection_reason) {

            return res.status(400).json({
                message:
                    "Rejection reason is required"
            });

        }


        await connection.beginTransaction();


        const [samples] = await connection.query(`
            SELECT
                id,
                order_id,
                order_item_id,
                status
            FROM samples
            WHERE id = ?
        `, [id]);


        if (samples.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                message: "Sample not found"
            });

        }


        const sample = samples[0];


        await connection.query(`
            UPDATE samples
            SET
                status = 'Rejected',
                rejection_reason = ?
            WHERE id = ?
        `, [
            rejection_reason,
            id
        ]);


        await connection.query(`
            UPDATE lab_order_items
            SET status = 'Pending'
            WHERE id = ?
        `, [sample.order_item_id]);


        await connection.query(`
            UPDATE lab_orders
            SET status = 'Sample Pending'
            WHERE id = ?
        `, [sample.order_id]);


        await connection.commit();


        res.json({

            message:
                "Sample rejected successfully"

        });


    } catch (error) {

        await connection.rollback();

        console.error(
            "REJECT SAMPLE ERROR:",
            error
        );

        res.status(500).json({

            message:
                "Failed to reject sample",

            error:
                error.message

        });

    } finally {

        connection.release();

    }

});

// ==========================================================
// REPORTS
// ==========================================================

// ----------------------------------------------------------
// GET REPORT BY ORDER ID
// ----------------------------------------------------------

app.get("/api/reports/order/:orderId", async (req, res) => {
    try {
        const orderId = Number(req.params.orderId);

        if (!orderId) {
            return res.status(400).json({
                message: "Invalid order ID",
            });
        }

        // ==============================================
        // ORDER + PATIENT
        // ==============================================

        const [orders] = await db.query(
            `
            SELECT
                lo.id,
                lo.order_no,
                lo.patient_id,
                lo.order_date,
                lo.order_time,
                lo.total_amount,

                p.patient_name,
                p.age,
                p.gender,
                p.mobile,
                p.address

            FROM lab_orders lo

            INNER JOIN patients p
                ON p.id = lo.patient_id

            WHERE lo.id = ?

            LIMIT 1
            `,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                message: "Lab order not found",
            });
        }

        const order = orders[0];

        // ==============================================
        // ORDER TESTS
        // ==============================================

        const [tests] = await db.query(
            `
            SELECT
                lot.id,
                lot.order_id,
                lot.test_id,

                t.test_code,
                t.test_name,
                t.unit,
                t.reference_range,
                t.price

            FROM lab_order_tests lot

            INNER JOIN tests t
                ON t.id = lot.test_id

            WHERE lot.order_id = ?

            ORDER BY t.test_name
            `,
            [orderId]
        );

        // ==============================================
        // EXISTING REPORT
        // ==============================================

        const [reports] = await db.query(
            `
            SELECT
                id,
                order_id,
                patient_id,
                report_no,
                status,
                remarks,
                pathologist_name,
                created_at,
                updated_at

            FROM reports

            WHERE order_id = ?

            LIMIT 1
            `,
            [orderId]
        );

        let report = null;
        let results = [];

        if (reports.length > 0) {
            report = reports[0];

            const [reportResults] =
                await db.query(
                    `
                    SELECT
                        rr.id,
                        rr.report_id,
                        rr.test_id,
                        rr.result_value,
                        rr.unit,
                        rr.reference_range,
                        rr.remarks,

                        t.test_code,
                        t.test_name

                    FROM report_results rr

                    INNER JOIN tests t
                        ON t.id = rr.test_id

                    WHERE rr.report_id = ?

                    ORDER BY t.test_name
                    `,
                    [report.id]
                );

            results = reportResults;
        }

        return res.json({
            order,
            tests,
            report,
            results,
        });
    } catch (error) {
        console.error(
            "GET report by order error:",
            error
        );

        return res.status(500).json({
            message: "Failed to load report",
            error: error.message,
        });
    }
});


// ----------------------------------------------------------
// CREATE / UPDATE REPORT
// ----------------------------------------------------------

app.post("/api/reports", async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            order_id,
            patient_id,
            status = "Draft",
            remarks = "",
            pathologist_name = "",
            results = [],
        } = req.body;

        if (!order_id) {
            return res.status(400).json({
                message: "Order ID is required",
            });
        }

        if (!patient_id) {
            return res.status(400).json({
                message: "Patient ID is required",
            });
        }

        if (!Array.isArray(results)) {
            return res.status(400).json({
                message: "Results must be an array",
            });
        }

        if (
            status !== "Draft" &&
            status !== "Completed"
        ) {
            return res.status(400).json({
                message:
                    "Invalid report status",
            });
        }

        await connection.beginTransaction();

        // ==============================================
        // CHECK ORDER
        // ==============================================

        const [orderRows] =
            await connection.query(
                `
                SELECT
                    id,
                    patient_id

                FROM lab_orders

                WHERE id = ?

                LIMIT 1
                `,
                [order_id]
            );

        if (orderRows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: "Lab order not found",
            });
        }

        // ==============================================
        // CHECK EXISTING REPORT
        // ==============================================

        const [existingReports] =
            await connection.query(
                `
                SELECT
                    id,
                    report_no,
                    status

                FROM reports

                WHERE order_id = ?

                LIMIT 1
                `,
                [order_id]
            );

        let reportId;
        let reportNo;

        // ==============================================
        // UPDATE EXISTING REPORT
        // ==============================================

        if (existingReports.length > 0) {
            const existing =
                existingReports[0];

            reportId = existing.id;
            reportNo = existing.report_no;

            await connection.query(
                `
                UPDATE reports

                SET
                    patient_id = ?,
                    status = ?,
                    remarks = ?,
                    pathologist_name = ?

                WHERE id = ?
                `,
                [
                    patient_id,
                    status,
                    remarks,
                    pathologist_name,
                    reportId,
                ]
            );

            // Remove old results
            await connection.query(
                `
                DELETE FROM report_results

                WHERE report_id = ?
                `,
                [reportId]
            );
        }

        // ==============================================
        // CREATE NEW REPORT
        // ==============================================

        else {
            reportNo =
                await generateReportNumber(
                    connection
                );

            const [result] =
                await connection.query(
                    `
                    INSERT INTO reports
                    (
                        order_id,
                        patient_id,
                        report_no,
                        status,
                        remarks,
                        pathologist_name
                    )

                    VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        order_id,
                        patient_id,
                        reportNo,
                        status,
                        remarks,
                        pathologist_name,
                    ]
                );

            reportId = result.insertId;
        }

        // ==============================================
        // INSERT RESULTS
        // ==============================================

        for (const item of results) {
            if (!item.test_id) {
                continue;
            }

            // IMPORTANT:
            // Reference range and unit are taken
            // automatically from tests table.
            const [testRows] =
                await connection.query(
                    `
                    SELECT
                        id,
                        unit,
                        reference_range

                    FROM tests

                    WHERE id = ?

                    LIMIT 1
                    `,
                    [item.test_id]
                );

            if (testRows.length === 0) {
                continue;
            }

            const test = testRows[0];

            await connection.query(
                `
                INSERT INTO report_results
                (
                    report_id,
                    test_id,
                    result_value,
                    unit,
                    reference_range,
                    remarks
                )

                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    reportId,
                    item.test_id,
                    item.result_value || "",
                    test.unit || "",
                    test.reference_range || "",
                    item.remarks || "",
                ]
            );
        }

        await connection.commit();

        // ==============================================
        // RETURN COMPLETE REPORT
        // ==============================================

        const [reportRows] =
            await db.query(
                `
                SELECT
                    id,
                    order_id,
                    patient_id,
                    report_no,
                    status,
                    remarks,
                    pathologist_name,
                    created_at,
                    updated_at

                FROM reports

                WHERE id = ?

                LIMIT 1
                `,
                [reportId]
            );

        const [resultRows] =
            await db.query(
                `
                SELECT
                    rr.id,
                    rr.report_id,
                    rr.test_id,
                    rr.result_value,
                    rr.unit,
                    rr.reference_range,
                    rr.remarks,

                    t.test_code,
                    t.test_name

                FROM report_results rr

                INNER JOIN tests t
                    ON t.id = rr.test_id

                WHERE rr.report_id = ?

                ORDER BY t.test_name
                `,
                [reportId]
            );

        return res.status(200).json({
            message:
                status === "Completed"
                    ? "Report completed successfully"
                    : "Report saved as draft",

            report: reportRows[0],

            results: resultRows,
        });
    } catch (error) {
        await connection.rollback();

        console.error(
            "POST report error:",
            error
        );

        return res.status(500).json({
            message: "Failed to save report",
            error: error.message,
        });
    } finally {
        connection.release();
    }
});


// ----------------------------------------------------------
// GENERATE REPORT NUMBER
// ----------------------------------------------------------

async function generateReportNumber(connection) {
    const [rows] =
        await connection.query(
            `
            SELECT
                report_no

            FROM reports

            ORDER BY id DESC

            LIMIT 1
            `
        );

    let nextNumber = 1;

    if (
        rows.length > 0 &&
        rows[0].report_no
    ) {
        const match =
            String(rows[0].report_no).match(
                /(\d+)$/
            );

        if (match) {
            nextNumber =
                Number(match[1]) + 1;
        }
    }

    return `RPT-${String(
        nextNumber
    ).padStart(6, "0")}`;
}

// ============================================================
// REPORT APIs
// ============================================================


// ============================================================
// GET REPORT BY LAB ORDER
// ============================================================

app.get("/api/reports/order/:orderId", async (req, res) => {
    try {
        const orderId = Number(req.params.orderId);

        if (!orderId) {
            return res.status(400).json({
                message: "Invalid order ID",
            });
        }


        // ----------------------------------------------------
        // ORDER + PATIENT
        // ----------------------------------------------------

        const [orders] = await db.query(
            `
            SELECT
                lo.id,
                lo.order_no,
                lo.patient_id,
                lo.order_date,
                lo.order_time,
                lo.total_amount,

                p.patient_name,
                p.age,
                p.gender,
                p.mobile,
                p.address

            FROM lab_orders lo

            INNER JOIN patients p
                ON p.id = lo.patient_id

            WHERE lo.id = ?

            LIMIT 1
            `,
            [orderId]
        );


        if (orders.length === 0) {
            return res.status(404).json({
                message: "Lab order not found",
            });
        }


        const order = orders[0];


        // ----------------------------------------------------
        // EXISTING REPORT
        // ----------------------------------------------------

        const [reports] = await db.query(
            `
            SELECT
                id,
                order_id,
                patient_id,
                report_no,
                status,
                remarks,
                pathologist_name,
                created_at,
                updated_at

            FROM reports

            WHERE order_id = ?

            LIMIT 1
            `,
            [orderId]
        );


        const existingReport =
            reports.length > 0
                ? reports[0]
                : null;


        // ----------------------------------------------------
        // ORDER TESTS
        // ----------------------------------------------------

        const [tests] = await db.query(
            `
            SELECT
                lot.test_id,

                t.test_code,
                t.test_name,
                t.sample_type,
                t.reference_range,
                t.unit,

                rr.id AS result_id,
                rr.result_value,
                rr.remarks AS result_remarks

            FROM lab_order_tests lot

            INNER JOIN tests t
                ON t.id = lot.test_id

            LEFT JOIN report_results rr
                ON rr.report_id = ?
                AND rr.test_id = lot.test_id

            WHERE lot.order_id = ?

            ORDER BY t.test_name ASC
            `,
            [
                existingReport
                    ? existingReport.id
                    : 0,

                orderId,
            ]
        );


        // ----------------------------------------------------
        // DEFAULT VALUES
        // ----------------------------------------------------

        const reportTests = tests.map(
            (test) => ({
                test_id:
                    test.test_id,

                test_code:
                    test.test_code,

                test_name:
                    test.test_name,

                sample_type:
                    test.sample_type,

                unit:
                    test.unit || "",

                /*
                 * IMPORTANT:
                 *
                 * Reference range
                 * automatically comes
                 * from tests table.
                 */

                reference_range:
                    test.reference_range ||
                    "",

                result_value:
                    test.result_value ||
                    "",

                result_remarks:
                    test.result_remarks ||
                    "",

                result_id:
                    test.result_id ||
                    null,
            })
        );


        return res.json({
            order,

            report:
                existingReport,

            tests:
                reportTests,
        });

    } catch (error) {

        console.error(
            "GET REPORT ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to load report",
            error:
                error.message,
        });
    }
});


// ============================================================
// CREATE / UPDATE REPORT
// ============================================================

app.post("/api/reports", async (req, res) => {

    const connection =
        await db.getConnection();

    try {

        const {
            order_id,
            patient_id,
            report_id,
            referred_by,
            pathologist_name,
            remarks,
            results,
        } = req.body;


        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!order_id) {
            return res.status(400).json({
                message:
                    "Order ID is required",
            });
        }


        if (!patient_id) {
            return res.status(400).json({
                message:
                    "Patient ID is required",
            });
        }


        if (
            !Array.isArray(results) ||
            results.length === 0
        ) {
            return res.status(400).json({
                message:
                    "Report results are required",
            });
        }


        await connection.beginTransaction();


        // ----------------------------------------------------
        // CHECK EXISTING REPORT
        // ----------------------------------------------------

        let reportId =
            report_id
                ? Number(report_id)
                : null;


        if (reportId) {

            const [existing] =
                await connection.query(
                    `
                    SELECT id
                    FROM reports
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [reportId]
                );


            if (
                existing.length === 0
            ) {
                reportId = null;
            }
        }


        // ----------------------------------------------------
        // CREATE REPORT
        // ----------------------------------------------------

        if (!reportId) {

            const reportNo =
                await generateReportNumber(
                    connection
                );


            const [result] =
                await connection.query(
                    `
                    INSERT INTO reports
                    (
                        order_id,
                        patient_id,
                        report_no,
                        status,
                        remarks,
                        pathologist_name
                    )

                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        'Draft',
                        ?,
                        ?
                    )
                    `,
                    [
                        order_id,
                        patient_id,
                        reportNo,
                        remarks || null,
                        pathologist_name ||
                            null,
                    ]
                );


            reportId =
                result.insertId;

        } else {

            // ------------------------------------------------
            // UPDATE REPORT
            // ------------------------------------------------

            await connection.query(
                `
                UPDATE reports

                SET
                    remarks = ?,
                    pathologist_name = ?

                WHERE id = ?
                `,
                [
                    remarks || null,
                    pathologist_name ||
                        null,
                    reportId,
                ]
            );
        }


        // ----------------------------------------------------
        // SAVE RESULTS
        // ----------------------------------------------------

        for (const item of results) {

            const testId =
                Number(item.test_id);


            if (!testId) {
                continue;
            }


            /*
             * IMPORTANT:
             *
             * Unit and reference_range
             * are NOT taken from frontend.
             *
             * They are automatically
             * fetched from tests table.
             */

            const [testRows] =
                await connection.query(
                    `
                    SELECT
                        unit,
                        reference_range

                    FROM tests

                    WHERE id = ?

                    LIMIT 1
                    `,
                    [testId]
                );


            if (
                testRows.length === 0
            ) {
                continue;
            }


            const test =
                testRows[0];


            // ------------------------------------------------
            // CHECK EXISTING RESULT
            // ------------------------------------------------

            const [existingResults] =
                await connection.query(
                    `
                    SELECT id

                    FROM report_results

                    WHERE report_id = ?
                    AND test_id = ?

                    LIMIT 1
                    `,
                    [
                        reportId,
                        testId,
                    ]
                );


            if (
                existingResults.length >
                0
            ) {

                await connection.query(
                    `
                    UPDATE report_results

                    SET
                        result_value = ?,
                        unit = ?,
                        reference_range = ?

                    WHERE id = ?
                    `,
                    [
                        item.result_value ||
                            null,

                        test.unit ||
                            null,

                        test.reference_range ||
                            null,

                        existingResults[0]
                            .id,
                    ]
                );

            } else {

                await connection.query(
                    `
                    INSERT INTO report_results
                    (
                        report_id,
                        test_id,
                        result_value,
                        unit,
                        reference_range
                    )

                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )
                    `,
                    [
                        reportId,

                        testId,

                        item.result_value ||
                            null,

                        test.unit ||
                            null,

                        test.reference_range ||
                            null,
                    ]
                );
            }
        }


        // ----------------------------------------------------
        // REPORT STATUS
        // ----------------------------------------------------

        const [resultCount] =
            await connection.query(
                `
                SELECT
                    COUNT(*) AS total,

                    SUM(
                        CASE
                            WHEN result_value IS NOT NULL
                            AND result_value != ''
                            THEN 1
                            ELSE 0
                        END
                    ) AS completed

                FROM report_results

                WHERE report_id = ?
                `,
                [reportId]
            );


        const total =
            Number(
                resultCount[0]?.total || 0
            );

        const completed =
            Number(
                resultCount[0]?.completed ||
                    0
            );


        let status = "Draft";


        if (
            total > 0 &&
            completed === total
        ) {
            status = "Completed";
        }


        await connection.query(
            `
            UPDATE reports

            SET status = ?

            WHERE id = ?
            `,
            [
                status,
                reportId,
            ]
        );


        await connection.commit();


        return res.json({
            message:
                "Report saved successfully",

            report_id:
                reportId,

            status,
        });

    } catch (error) {

        await connection.rollback();

        console.error(
            "SAVE REPORT ERROR:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to save report",

            error:
                error.message,
        });

    } finally {

        connection.release();
    }
});


// ============================================================
// GENERATE REPORT NUMBER
// ============================================================

async function generateReportNumber(
    connection
) {

    const year =
        new Date().getFullYear();


    const [rows] =
        await connection.query(
            `
            SELECT
                COUNT(*) AS total

            FROM reports

            WHERE YEAR(created_at) = ?
            `,
            [year]
        );


    const nextNumber =
        Number(
            rows[0]?.total || 0
        ) + 1;


    return `RPT-${year}-${String(
        nextNumber
    ).padStart(6, "0")}`;
}

// =====================================================
// REPORTS
// =====================================================

// GET ALL REPORTS
// Search:
// report_no
// order_no
// patient_name
// patient_id
// status
// =====================================================

app.get("/api/reports", async (req, res) => {
    try {
        const search = String(req.query.search || "")
            .trim()
            .toLowerCase();

        let sql = `
            SELECT
                r.id,
                r.report_no,
                r.order_id,
                r.patient_id,
                r.status,
                r.remarks,
                r.pathologist_name,
                r.created_at,
                r.updated_at,

                lo.order_no,
                lo.order_date,
                lo.order_time,
                lo.total_amount,

                p.patient_name,
                p.age,
                p.gender,
                p.mobile,
                p.address

            FROM reports r

            LEFT JOIN lab_orders lo
                ON lo.id = r.order_id

            LEFT JOIN patients p
                ON p.id = r.patient_id

        `;

        const params = [];

        if (search) {
            sql += `
                WHERE
                    LOWER(COALESCE(r.report_no, '')) LIKE ?
                    OR LOWER(COALESCE(lo.order_no, '')) LIKE ?
                    OR LOWER(COALESCE(p.patient_name, '')) LIKE ?
                    OR CAST(r.patient_id AS CHAR) LIKE ?
                    OR LOWER(COALESCE(r.status, '')) LIKE ?
            `;

            const searchValue = `%${search}%`;

            params.push(
                searchValue,
                searchValue,
                searchValue,
                `%${search}%`,
                searchValue
            );
        }

        sql += `
            ORDER BY r.id DESC
        `;

        const [rows] = await db.query(sql, params);

        res.json(rows);

    } catch (error) {

        console.error(
            "GET /api/reports error:",
            error
        );

        res.status(500).json({
            message: "Failed to load reports",
            error: error.message
        });
    }
});


// =====================================================
// GET SINGLE REPORT
// =====================================================

app.get("/api/reports/:id", async (req, res) => {

    try {

        const reportId = Number(req.params.id);

        if (!reportId) {
            return res.status(400).json({
                message: "Invalid report ID"
            });
        }

        // -------------------------------------------------
        // REPORT + PATIENT + ORDER
        // -------------------------------------------------

        const [reportRows] = await db.query(
            `
            SELECT
                r.id,
                r.report_no,
                r.order_id,
                r.patient_id,
                r.status,
                r.remarks,
                r.pathologist_name,
                r.created_at,
                r.updated_at,

                lo.order_no,
                lo.order_date,
                lo.order_time,
                lo.total_amount,

                p.patient_name,
                p.age,
                p.gender,
                p.mobile,
                p.address

            FROM reports r

            LEFT JOIN lab_orders lo
                ON lo.id = r.order_id

            LEFT JOIN patients p
                ON p.id = r.patient_id

            WHERE r.id = ?

            LIMIT 1
            `,
            [reportId]
        );

        if (reportRows.length === 0) {

            return res.status(404).json({
                message: "Report not found"
            });

        }

        const report = reportRows[0];

        // -------------------------------------------------
        // REPORT TEST RESULTS
        // -------------------------------------------------

        const [resultRows] = await db.query(
            `
            SELECT
                rr.id,
                rr.report_id,
                rr.test_id,

                rr.result_value,
                rr.unit,
                rr.reference_range,
                rr.remarks,

                t.test_code,
                t.test_name,
                t.sample_type,
                t.vial_name,
                t.vial_color,
                t.price,

                t.reference_range AS master_reference_range,
                t.unit AS master_unit

            FROM report_results rr

            LEFT JOIN tests t
                ON t.id = rr.test_id

            WHERE rr.report_id = ?

            ORDER BY rr.id ASC
            `,
            [reportId]
        );

        res.json({
            report,
            results: resultRows
        });

    } catch (error) {

        console.error(
            "GET /api/reports/:id error:",
            error
        );

        res.status(500).json({
            message: "Failed to load report",
            error: error.message
        });
    }
});


// =====================================================
// GET REPORT BY REPORT NUMBER
// Example:
// /api/reports/by-number/RPT-2026-000003
// =====================================================

app.get(
    "/api/reports/by-number/:reportNo",
    async (req, res) => {

        try {

            const reportNo = String(
                req.params.reportNo || ""
            ).trim();

            if (!reportNo) {
                return res.status(400).json({
                    message: "Report number is required"
                });
            }

            const [reportRows] = await db.query(
                `
                SELECT
                    r.id,
                    r.report_no,
                    r.order_id,
                    r.patient_id,
                    r.status,
                    r.remarks,
                    r.pathologist_name,
                    r.created_at,
                    r.updated_at,

                    lo.order_no,
                    lo.order_date,
                    lo.order_time,
                    lo.total_amount,

                    p.patient_name,
                    p.age,
                    p.gender,
                    p.mobile,
                    p.address

                FROM reports r

                LEFT JOIN lab_orders lo
                    ON lo.id = r.order_id

                LEFT JOIN patients p
                    ON p.id = r.patient_id

                WHERE LOWER(r.report_no) = LOWER(?)

                LIMIT 1
                `,
                [reportNo]
            );

            if (reportRows.length === 0) {

                return res.status(404).json({
                    message:
                        "Report number not found"
                });

            }

            const report = reportRows[0];

            const [resultRows] = await db.query(
                `
                SELECT
                    rr.id,
                    rr.report_id,
                    rr.test_id,
                    rr.result_value,
                    rr.unit,
                    rr.reference_range,
                    rr.remarks,

                    t.test_code,
                    t.test_name,
                    t.sample_type,
                    t.vial_name,
                    t.vial_color,
                    t.price,

                    t.reference_range AS master_reference_range,
                    t.unit AS master_unit

                FROM report_results rr

                LEFT JOIN tests t
                    ON t.id = rr.test_id

                WHERE rr.report_id = ?

                ORDER BY rr.id ASC
                `,
                [report.id]
            );

            res.json({
                report,
                results: resultRows
            });

        } catch (error) {

            console.error(
                "GET report by number error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load report by report number",
                error: error.message
            });
        }
    }
);

// ==========================================
// SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `Server is running on port ${PORT}`
    );

});