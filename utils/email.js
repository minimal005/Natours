// відправка листів за допомогою модуля nodemailer
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Створюємо транспортер
  const transporter = nodemailer.createTransport({
    // service: 'Gmail', //Активувати в gmail 'less secure app' опцію
    // Gmail використовується хіба для приватних додатків
    // Для виробничих додатків краще не використовуувати gmail
    // обмеження по розсилці 500 листів і швидко заносять в спамери
    // host і port коментуємо
    // Використовуємо mailtrap для перевірки роботи пошти
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) Визначаємо параметри електронної пошти
  const mailOptions = {
    from: 'Halyna Kravchenko <minimal@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html:
  };

  // 3) І нарешті відправляємо лист на електронну пошту
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
