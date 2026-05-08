require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors({
  origin: ["https://mccannamediation.com", "http://localhost:3000", "https://mccannamediationbackend.onrender.com"]
}));
app.use(express.json());

/* ---------------- CAPTCHA VERIFY ---------------- */
const verifyCaptcha = async (token) => {
  try {
    const res = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET,
          response: token,
        },
      }
    );

    return res.data.success;
  } catch (err) {
    console.error("Captcha error:", err.message);
    return false;
  }
};

/* ---------------- EMAIL TRANSPORTER ---------------- */
// Using Titan Email (Hostinger) - Same as your dreweb setup
const transporter = nodemailer.createTransport({
  host: "smtp.titan.email",  // Changed from outlook to titan
  port: 465,
  secure: true,
  auth: {
    user: "jmccanna@mcannamediation.com",
    pass: process.env.EM_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/* ---------------- ROUTE ---------------- */
app.post("/sendEmail", async (req, res) => {
  const { emUser, nameUser, subject, body, captcha, party1, party2, conflictType } = req.body;

  console.log("Received request:", { emUser, nameUser, party1, party2, conflictType });

  /* ---- BASIC VALIDATION ---- */
  if (!body) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  /* ---- CAPTCHA CHECK ---- */
  const isHuman = await verifyCaptcha(captcha);

  if (!captcha || !isHuman) {
    return res.status(400).json({
      message: "Captcha verification failed. Try again.",
    });
  }

  try {
    /* ---- SEND TO BUSINESS (James) ---- */
    await transporter.sendMail({
      from: `"McCanna Mediation Website" <jmccanna@mcannamediation.com>`,
      to: "jmccanna@mcannamediation.com",
      subject: subject || "New Consultation Request",
      text: body,
      replyTo: emUser || "jmccanna@mcannamediation.com",
    });

    console.log("✅ Email sent to business");

    /* ---- AUTO REPLY (only if client email provided) ---- */
    if (emUser && emUser !== "jmccanna@mcannamediation.com") {
      await transporter.sendMail({
        from: `"James McCanna" <jmccanna@mcannamediation.com>`,
        to: emUser,
        subject: "We received your consultation request",
        text: `Dear ${nameUser || "Client"},

Thank you for reaching out to McCanna Mediation.

I have received your consultation request regarding ${conflictType || "your matter"} and will review the details soon.

I typically respond within 24 hours. If you need immediate assistance, please feel free to call.

Best regards,

James McCanna
McCanna Mediation`,
      });
      console.log("✅ Auto-reply sent");
    }

    return res.status(200).json({
      message: "Consultation request sent successfully. James will contact you within 24 hours.",
    });

  } catch (error) {
    console.error("❌ Email error:", error);

    return res.status(500).json({
      message: "Failed to send message. Please try again later.",
    });
  }
});

/* ---------------- SERVER ---------------- */
app.get("/", (req, res) => {
  res.send("McCanna Mediation backend running");
});

const PORT = process.env.PORT || 3111;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});