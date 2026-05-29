const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

async function resetPassword() {
    try {
        await mongoose.connect(MONGO_URI);

        const db = mongoose.connection.db;

        const email = "hihello@gmail.com";
        const newPassword = "newpassword123";

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const result = await db.collection("users").updateOne(
            { email: email },
            {
                $set: {
                    password: hashedPassword,
                },
            }
        );

        if (result.matchedCount === 0) {
            console.log("User not found");
        } else {
            console.log("Password updated successfully");
        }

        process.exit();
    } catch (error) {
        console.error("Error resetting password:", error);
        process.exit(1);
    }
}

resetPassword();