const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

express.static.mime.define({'text/css': ['css']});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🔫 Gun Simulator running at http://localhost:${PORT}`);
});