const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";

  let token = null;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    } else if (parts.length === 1) {
      token = parts[0];
    }
  }

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");
    req.user = { id: decoded.id, name: decoded.name };
    return next();
  } catch (err) {
    console.error("Auth middleware error:", err && err.message ? err.message : err);
    return res.status(401).json({ message: "Token is not valid" });
  }
};
