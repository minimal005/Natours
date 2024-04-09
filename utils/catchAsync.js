// Ловимо помилки в асинхронних функціях
// В цю функцію треба обертати всі асинхронні функціїї (asynk/await)
module.exports = (func) => {
  return (req, res, next) => {
    func(req, res, next).catch(next);
  };
};
