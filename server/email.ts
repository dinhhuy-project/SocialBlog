import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Hàm gửi mail dùng chung
export async function sendEmail(to: string, subject: string, html: string) {
  const mailOptions = {
    from: process.env.EMAIL_USER || "noreply@socialblog.com",
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
}

export async function send2FAEmailWithLinks(
  toEmail: string,
  userName: string,
  approveLink: string,
  rejectLink: string
): Promise<boolean> {
  try {
    // const mailOptions = {
    //   from: process.env.EMAIL_USER || 'noreply@socialblog.com',
    //   to: toEmail,
    //   subject: '🔐 SocialBlog - Xác minh đăng nhập',
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">🔐 Xác minh đăng nhập SocialBlog</h2>
      
      <p>Xin chào <strong>${userName}</strong>,</p>
      
      <p style="color: #666;">
        Chúng tôi phát hiện một lần đăng nhập từ thiết bị hoặc địa chỉ IP mới. 
        Vui lòng xác nhận đây là bạn.
      </p>
      
      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin-bottom: 15px;">Nhấn YES để xác nhận, hoặc NO để từ chối</p>
        
        <div style="display: flex; gap: 10px; justify-content: center;">
          <a href="${approveLink}" style="
            padding: 12px 30px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          ">✅ YES</a>
          
          <a href="${rejectLink}" style="
            padding: 12px 30px;
            background-color: #dc3545;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          ">❌ NO</a>
        </div>
      </div>
      
      <p style="color: #999; font-size: 12px; margin-top: 20px;">
        ⏰ Link hết hạn sau 5 phút
      </p>
    </div>
  `;
    // await transporter.sendMail(mailOptions);
    await sendEmail(toEmail, "🔐 SocialBlog - Xác minh đăng nhập", html);
    console.log('✅ 2FA Email sent to:', toEmail);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error);
    return false;
  }
}

export async function sendResetPasswordEmail(to: string, username: string, resetLink: string) {
  try {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2>Xin chào ${username}!</h2>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          <p>Nhấn vào nút bên dưới để đặt lại mật khẩu (link chỉ có hiệu lực trong <strong>15 phút</strong>):</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background:#007bff;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
          <hr>
          <small>Nếu nút không hoạt động, truy cập link: <br><a href="${resetLink}">${resetLink}</a></small>
        </div>
      `;
    await sendEmail(to, "🔐 Đặt lại mật khẩu - SocialBlog", html);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error);
    return false;
  }
  
}