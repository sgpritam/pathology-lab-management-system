const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const db = require("../db");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// ==========================================
// LOGIN
// ==========================================

router.post("/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const [users] = await db.query(
            `SELECT *
             FROM users
             WHERE username = ?
             LIMIT 1`,
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const user = users[0];

        if (user.status !== "ACTIVE") {
            return res.status(403).json({
                message: "User account is inactive"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.json({
            message: "Login successful",

            token,

            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({
            message: "Internal server error"
        });
    }
});


// ==========================================
// CURRENT USER
// ==========================================

router.get(
    "/me",
    authMiddleware,
    async (req, res) => {

        try {

            const [users] = await db.query(
                `SELECT id, name, username, role, status
                 FROM users
                 WHERE id = ?
                 LIMIT 1`,
                [req.user.userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.json({
                user: users[0]
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Server error"
            });
        }
    }
);


// ==========================================
// ADMIN TEST
// ==========================================

router.get(
    "/admin-test",
    authMiddleware,
    roleMiddleware("LAB_ADMIN"),
    (req, res) => {

        res.json({
            message: "Admin API access successful",
            user: req.user
        });

    }
);


module.exports = router;