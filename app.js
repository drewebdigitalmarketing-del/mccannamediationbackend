require("dotenv").config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(
  cors({
    origin: ["https://mccannalaw.com", "http://localhost:3000"],
  })
);

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
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EM_USER,
    pass: process.env.EM_PASS,
  },
});

/* ---------------- ROUTE ---------------- */
app.post("/sendEmail", async (req, res) => {
  const { emUser, nameUser, subject, body, captcha } = req.body;

  if (!emUser || !nameUser || !body) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  if (!captcha) {
    return res.status(400).json({
      message: "Captcha verification required. Please verify you're not a robot.",
    });
  }

  const isHuman = await verifyCaptcha(captcha);

  if (!isHuman) {
    return res.status(400).json({
      message: "Captcha verification failed. Try again.",
    });
  }

  console.log("Trying to send email...");

  try {
    await transporter.sendMail({
      from: `"McCanna Law" <${process.env.EM_USER}>`,
      to: process.env.EM_USER,
      subject: subject || "New contact form submission",
      text: `
New contact form submission:

Name: ${nameUser}
Email: ${emUser}
Subject: ${subject || "No subject provided"}

Message:
${body}
      `,
      replyTo: emUser,
    });

    console.log("Email 1 sent.");

    await transporter.sendMail({
      from: `"McCanna Mediation" <${process.env.EM_USER}>`,
      to: emUser,
      subject: "We received your message request",
      text: `Hello ${nameUser},

Thank you for contacting McCanna Law!

I will review the details of your case and contact you as soon as possible.

Best regards,
James McCanna`,
    });

    console.log("Email 2 sent.");

    return res.status(200).json({
      message:
        "Your consultation request has been sent successfully! James will contact you within 24 hours.",
    });
  } catch (error) {
    console.error("Email error:", error);

    return res.status(500).json({
      message: "Failed to send message. Please try again later.",
    });
  }
});

/* ---------------- SERVER ---------------- */
app.get("/", (req, res) => {
  res.send("McCanna backend running");
});

const PORT = process.env.PORT || 3111;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});