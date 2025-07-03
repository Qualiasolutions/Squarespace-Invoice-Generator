const express = require('express');
const pm2 = require('pm2');
const path = require('path');

const app = express();
const port = process.env.DASHBOARD_PORT || 3000;

app.use(express.static(__dirname));

app.get('/status', (req, res) => {
    pm2.list((err, list) => {
        if (err) {
            res.status(500).send(err);
            return;
        }

        const status = list.map(proc => ({
            name: proc.name,
            status: proc.pm2_env.status,
            cpu: proc.monit.cpu,
            mem: (proc.monit.memory / 1024 / 1024).toFixed(2),
        }));

        res.json(status);
    });
});

app.listen(port, () => {
    console.log(`Dashboard server listening at http://localhost:${port}`);
});
