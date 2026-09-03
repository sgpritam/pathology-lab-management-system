const bcrypt = require("bcrypt");
const db = require("./db");

async function createAdmin() {
    try {
        const password = "Admin@123";

        const passwordHash = await bcrypt.hash(password, 12);

        await db.query(
            `INSERT INTO users
            (name, username, password_hash, role, status)
            VALUES (?, ?, ?, ?, ?)`,
            [
                "Lab Administrator",
                "admin",
                passwordHash,
                "LAB_ADMIN",
                "ACTIVE"
            ]
        );

        console.log("Admin user created successfully");

        process.exit(0);
    } catch (error) {
        console.error("Error creating admin:", error);
        process.exit(1);
    }
}

createAdmin();