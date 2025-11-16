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

export async function send2FAEmailWithLinks(
  toEmail: string,
  userName: string,
  approveLink: string,
  rejectLink: string
): Promise<boolean> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@socialblog.com',
      to: toEmail,
      subject: '🔐 SocialBlog - Xác minh đăng nhập',
      html: `
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
                display: inline-block;
                padding: 12px 30px;
                background-color: #28a745;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
              ">✅ YES</a>
              
              <a href="${rejectLink}" style="
                display: inline-block;
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
            ⏰ Link này sẽ hết hạn trong 5 phút
          </p>
          
          <p style="color: #999; font-size: 12px;">
            ⚠️ Nếu không phải bạn, vui lòng bỏ qua email này.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ 2FA Email sent to:', toEmail);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error);
    return false;
  }
}