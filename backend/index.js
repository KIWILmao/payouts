const express = require("express")
const mongoose = require("mongoose")
const rootRouter = require("./routes/index.js")
const cors = require("cors")
const bodyParse = require("body-parser")
const app = express()

mongoose.connect("mongodb://localhost:27017/payouts")

app.use(cors())

app.use(bodyParse.json())

app.use("/api/v1", rootRouter)

app.listen(3000, (req, res) => {
    console.log("server is running")
})
