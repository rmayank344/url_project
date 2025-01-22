const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const bodyParser = require('body-parser')
const PORT = process.env.PORT || 3000;
const cors = require("cors");
const morgan = require("morgan");
require("./DB/conn");


app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
app.use('/api', require("./routes/authenticate_routes"));
app.use('/api', require('./routes/url_routes'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

