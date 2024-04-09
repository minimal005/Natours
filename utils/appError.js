// виявлення операційних помилок
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    // startsWith - метод використовується для рядків, тому робимо шаблонний рядок і на ньому викликаємо.
    // Робимо перевірку, чи починається statusCode з 4
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // всі помилки, які ми створюємо, будуть в основному операційними помилками
    this.isOperational = true;

    //Таким чином, коли створюється новий об'єкт і викликається функція-конструктор,
    // цей виклик не з'явиться на трасуванні стеку і не забруднить його.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
