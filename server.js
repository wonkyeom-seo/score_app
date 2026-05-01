const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;
const DATA_FILE = "data.json";

app.use(bodyParser.json());
app.use(express.static("public"));

function loadData() {
    if (!fs.existsSync(DATA_FILE)) return { users: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const data = loadData();

    if (data.users.find(u => u.username === username)) {
        return res.json({ success: false });
    }

    data.users.push({ username, password, scores: {} });
    saveData(data);

    res.json({ success: true });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const data = loadData();

    const user = data.users.find(
        u => u.username === username && u.password === password
    );

    if (!user) return res.json({ success: false });

    res.json({ success: true, scores: user.scores });
});

app.post("/save", (req, res) => {
    const { username, scores } = req.body;
    const data = loadData();

    const user = data.users.find(u => u.username === username);
    if (!user) return res.json({ success: false });

    user.scores = scores;
    saveData(data);

    res.json({ success: true });
});

app.listen(PORT, () => console.log("Server running on port", PORT));
