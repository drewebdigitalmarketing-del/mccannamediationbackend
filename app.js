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
      text: `Hi ${nameUser},

Thank you for reaching out to McCanna Mediation!

James has received your consultation request and will review the details of your case. He typically responds within 24 hours.

Best regards,
James McCanna`,
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