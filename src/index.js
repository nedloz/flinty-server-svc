require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const errorHandler = require('./utils/errorHandler');
const attachUserFromHeader = require('./utils/attachUserFromHeaders');
const serverRoutes = require("./routes/serverRoutes");
const rolesRoutes = require("./routes/rolesRoutes");
const channelsRoutes = require('./routes/channelsRoutes');
const membersRoutes = require('./routes/membersRoutes');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`✅ Запрос: ${req.method} ${req.originalUrl}`);
    next();
});
app.use(attachUserFromHeader);

app.use('/servers', serverRoutes);
app.use('/servers/:server_id/roles', rolesRoutes)
app.use('/servers/:server_id/channels', channelsRoutes);
app.use('/servers/:server_id/members', membersRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});


app.use(errorHandler);

(async () => {
    try { 
        await mongoose.connect(process.env.MONGO_URI);
        app.listen(process.env.PORT, () => console.log(`✅ MongoDB connected\nСервер запущен на порту: ${process.env.PORT}`));

    } catch (err) {
        logger.error('❌ MongoDB error: ' + err.message);
        process.exit(1);
    }
})();

module.exports = app;