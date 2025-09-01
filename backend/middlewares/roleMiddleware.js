// middlewares/roleMiddleware.js
module.exports = function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Accès interdit : rôle insuffisant' });
    }

    next(); // autorisé
  };
};
