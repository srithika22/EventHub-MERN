const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');

  // Handle different token formats
  let token;
  if (authHeader && authHeader.toLowerCase().includes('bearer')) {
    token = authHeader.replace(/Bearer\s+/gi, '');
  } else {
    token = authHeader; // could be direct token
  }

  // Check token presence
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Add user payload to the request object
    console.log('🔐 User authenticated:', decoded.id);
    next();
  } catch (err) {
    console.log('❌ Token verification failed:', err.message);
    return res.status(401).json({ message: 'Token is not valid' });
  }
};