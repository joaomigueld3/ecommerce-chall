import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'hotmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export default transporter;
