import nodemailer from "nodemailer";
import {
  emailHost,
  emailPort,
  emailAddress,
  emailPass,
  emailFrom,
} from "../core/config/config.js"; 

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: false,
      auth: {
        user: emailAddress,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: emailFrom,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
};

export default sendEmail;
