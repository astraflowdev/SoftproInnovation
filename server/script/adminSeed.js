const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

dotenv.config();

// Seed (or reset) the admin account. Idempotent: updates the existing admin
// with the same email instead of creating duplicates.
// Override defaults with env vars: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD.
const adminSeed = async () => {
    const name = process.env.ADMIN_NAME || "Piyush Pal";
    const email = process.env.ADMIN_EMAIL || "admin@gmail.com";
    const plainPassword = process.env.ADMIN_PASSWORD || "admin1234";

    await mongoose.connect(process.env.MONGO_URI);

    const password = await bcrypt.hash(plainPassword, 10);

    const res = await Admin.findOneAndUpdate(
        { email },
        { name, email, password },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Admin seeded: ${res.email} (id ${res._id})`);
    await mongoose.disconnect();
};

adminSeed().catch((err) => {
    console.error("Admin seed failed:", err.message);
    process.exit(1);
});
