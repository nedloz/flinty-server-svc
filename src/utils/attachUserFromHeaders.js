module.exports = (req, res, next) => {
    const userId = req.headers['x-user-id'];
  
    if (!userId) {
      return res.status(401).json({ error: true, message: 'Unauthorized: missing x-user-id header' });
    }
  
    req.user = { user_id: userId };
    next();
};
  