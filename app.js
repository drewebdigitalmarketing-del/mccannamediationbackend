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
  port: 465,
  secure: true,
  auth: {
    user: process.env.EM_USER,
    pass: process.env.EM_PASS,
  },
  tls: {
    servername: process.env.HAK,
  },
});

/* ---------------- ROUTE ---------------- */
app.post("/sendEmail", async (req, res) => {
  const { emUser, nameUser, subject, body, captcha } = req.body;

  /* ---- BASIC VALIDATION ---- */
  if (!emUser || !nameUser || !body) {
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
    /* ---- SEND TO BUSINESS ---- */
    await transporter.sendMail({
      from: `"Website Contact" <${process.env.EM_USER}>`,
      to: process.env.EM_USER,
      subject: subject,
      text: `${body}\n\nSender: ${emUser}`,
      replyTo: emUser,
    });

    console.log("✅ Email sent to business");

    /* ---- AUTO REPLY ---- */
    await transporter.sendMail({
      from: `"McCanna Mediation" <${process.env.EM_USER}>`,
      to: emUser,
      subject: "We received your message",
      text: `Hi ${nameUser},

Thanks for getting in touch with McCanna Mediation!

I’ve received your message and will review the details soon. I typically respond within 24 hours, but I’ll do my best to get back to you sooner.

In the meantime, if you have any additional info you'd like to share, feel free to reply here.

Talk soon,

James McCanna  
McCanna Mediation`,
    });

    console.log("✅ Auto-reply sent");

    return res.status(200).json({
      message: "Message sent successfully. We'll reply shortly.",
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
  res.send("macanna mediation backend running");
});

const PORT = process.env.PORT || 3111;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});