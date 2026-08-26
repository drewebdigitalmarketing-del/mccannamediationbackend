require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors({
  origin: ["https://mccannamediation.com", "http://localhost:3000"]
}));
app.use(express.json());



/* ---------------- EMAIL TRANSPORTER ---------------- */
const transporter = nodemailer.createTransport({
  host: process.env.HAK,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EM_USER,
    pass: process.env.EM_PASS,
  },
  tls: {
    servername: process.env.HAK,
    ciphers:"TLSv1.2"
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


  try {
    await transporter.sendMail({
      from: `"McCanna Mediation" <${process.env.EM_USER}>`,
      to: process.env.EM_USER,
      subject: subject,
      text: body,
      replyTo: emUser,
    });

    await transporter.sendMail({
      from: `"McCanna Mediation" <${process.env.EM_USER}>`,
      to: emUser,
      subject: "We received your consultation request",
      text: `Hello!

Thank you for contacting McCanna Mediation!

I will review the details of your case and contact you as soon as possible.

Best regards,
James McCanna
McCanna Mediation`,
    });

    return res.status(200).json({
      message: "Your consultation request has been sent successfully! James will contact you within 24 hours.",
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
  res.send("maccana backend running");
});

const PORT = process.env.PORT || 3111;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});