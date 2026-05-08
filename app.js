require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const axios = require("axios");

const app = express();

// Expanded CORS to include your frontend domains
app.use(cors({
  origin: [
    "https://mccannamediation.com", 
    "http://localhost:3000", 
    "https://mccannamediationbackend.onrender.com",
    "https://mccanna-mediation.vercel.app", // Add your Vercel frontend URL
    "http://localhost:5173" // For React dev server if using Vite
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- CAPTCHA VERIFY ---------------- */
const verifyCaptcha = async (token) => {
  if (!token) return false;
  
  try {
    const res = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET,
          response: token,
        },
        timeout: 10000 // 10 second timeout
      }
    );

    return res.data.success === true;
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
    user: process.env.EM_USER || "jmccanna@mcannamediation.com",
    pass: process.env.EM_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify transporter connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter ready to send messages");
  }
});

/* ---------------- ROUTE ---------------- */
app.post("/sendEmail", async (req, res) => {
  const { 
    emUser,      // Client's email address
    nameUser,    // Client name or party names
    subject,     // Email subject
    body,        // Email body content
    captcha,     // reCAPTCHA token
    party1,      // Optional: Party 1 name
    party2,      // Optional: Party 2 name
    conflictType // Optional: Type of conflict
  } = req.body;

  console.log("📧 Received request:", { 
    emUser, 
    nameUser, 
    subject, 
    hasCaptcha: !!captcha,
    party1, 
    party2, 
    conflictType 
  });

  /* ---- BASIC VALIDATION ---- */
  if (!body) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields. Please provide the consultation details.",
    });
  }

  if (!captcha) {
    return res.status(400).json({
      success: false,
      message: "Please complete the reCAPTCHA verification.",
    });
  }

  /* ---- CAPTCHA CHECK ---- */
  const isHuman = await verifyCaptcha(captcha);

  if (!isHuman) {
    return res.status(400).json({
      success: false,
      message: "reCAPTCHA verification failed. Please try again.",
    });
  }

  try {
    // Prepare email content
    const emailSubject = subject || "New Consultation Request - McCanna Mediation";
    const emailBody = body;

    /* ---- SEND TO BUSINESS (James McCanna) ---- */
    await transporter.sendMail({
      from: `"McCanna Mediation Website" <${process.env.EM_USER || "jmccanna@mcannamediation.com"}>`,
      to: emUser,
      subject: emailSubject,
      text: emailBody,
      replyTo: emUser || process.env.EM_USER,
    });

    console.log("✅ Email sent to James McCanna");

    /* ---- AUTO REPLY TO CLIENT (if email provided) ---- */
    if (emUser && emUser !== process.env.EM_USER && emUser.includes('@')) {
      const clientName = nameUser || (party1 && party2 ? `${party1} & ${party2}` : "Client");
      
      const autoReplyText = `Dear ${clientName},

Thank you for reaching out to McCanna Mediation.

I have received your consultation request${conflictType ? ` regarding ${conflictType}` : ''} and will review the details soon.

I typically respond within 24 hours. If you need immediate assistance, please feel free to call.

Best regards,

James McCanna
McCanna Mediation
Phone: [Your Phone Number]
Website: https://mccannamediation.com`;

      await transporter.sendMail({
        from: `"James McCanna" <${process.env.EM_USER || "jmccanna@mcannamediation.com"}>`,
        to: emUser,
        subject: "We received your consultation request - McCanna Mediation",
        text: autoReplyText,
      });
      console.log(`✅ Auto-reply sent to ${emUser}`);
    } else {
      console.log("ℹ️ No auto-reply sent - valid client email not provided");
    }

    return res.status(200).json({
      success: true,
      message: "Consultation request sent successfully. James McCanna will contact you within 24 hours.",
    });

  } catch (error) {
    console.error("❌ Email error:", error);
    
    // Detailed error logging
    if (error.response) {
      console.error("Response error:", error.response);
    } else if (error.code) {
      console.error("Error code:", error.code);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send consultation request. Please try again later or call directly.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ---------------- HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.json({
    status: "active",
    message: "McCanna Mediation backend is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3111;
app.listen(PORT, () => {
  console.log(`🚀 McCanna Mediation backend running on port ${PORT}`);
  console.log(`📧 Email configured with: ${process.env.EM_USER || "jmccanna@mcannamediation.com"}`);
});