const express = require("express")
const z = require("zod")
const { HASH_SECRET, JWT_SECRET } = require("../config.js")
const { User } = require("../db.js")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const { authMiddleware } = require("../middleware.js")

const router = express.Router()

const signUpBody = z.object({
    firstname: z.string(),
    lastname: z.string(),
    username: z
        .string()
        .email({ message: "please provide valid email address" }),
    password: z.string(),
})

const signInBody = z.object({
    username: z.string().email(),
    password: z.string(),
})

const updateBody = z.object({
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    username: z
        .string()
        .email({ message: "please provide valid email address" })
        .optional(),
    password: z.string().optional(),
})

router.post("/signup", async (req, res) => {
    const { success, error } = signUpBody.safeParse(req.body)
    if (!success) {
        return res.send({
            msg: error.errors[0].message,
        })
    }

    const { username, firstname, lastname, password } = req.body
    console.log(username)
    const user = await User.findOne({
        username: username,
    })
    console.log(user)

    if (user) {
        return res.json({
            msg: "user already exists",
        })
    }

    const salt = crypto.randomBytes(64).toString("hex")
    const hashedPassword = crypto
        .createHmac("sha256", salt)
        .update(password)
        .digest("hex")

    const created = await User.create({
        username,
        password: hashedPassword,
        salt,
        firstname,
        lastname,
    })

    const token = jwt.sign({ _id: created._id }, JWT_SECRET)

    return res.json({
        msg: "user created",
        token,
    })
})
router.post("/signin", async (req, res) => {
    const { username, password } = req.body
    const { success } = signInBody.safeParse(req.body)
    if (!success) {
        return res.status(403).json({
            msg: "invalid inputs",
        })
    }

    const user = await User.findOne({
        username,
    })
    if (!user) {
        return res.status(404).json({
            msg: "user not exist",
        })
    }

    console.log(user)

    const salt = user.salt
    const hashedPassword = crypto
        .createHmac("sha256", salt)
        .update(password)
        .digest("hex")

    if (user.password == hashedPassword) {
        const token = jwt.sign(
            {
                _id: user._id,
            },
            JWT_SECRET
        )
        return res.status(200).json({
            msg: "login successfully",
            token,
        })
    } else {
        return res.status(403).json({
            msg: "invalid password",
        })
    }
})
router.put("/update", authMiddleware, async (req, res) => {
    const { success, error } = updateBody.safeParse(req.body)
    console.log(error)
    if (!success) {
        return res.send({
            msg: error.errors[0].message,
        })
    }
    const { username, firstname, lastname, password } = req.body

    const user = await User.findById(req.userId)
    if (!user) {
        return res.json({
            msg: "user doesnt exist or invalid token",
        })
    }

    if (password) {
        const salt = crypto.randomBytes(64).toString("hex")
        const hashedPassword = crypto
            .createHmac("sha256", salt)
            .update(password)
            .digest("hex")
        const user = await User.findByIdAndUpdate(req.userId, {
            ...req.body,
            salt,
            password: hashedPassword,
        })
        return res.json({ msg: "user updated successfully" })
    } else {
        const user = await User.findByIdAndUpdate(req.userId, {
            ...req.body,
        })
        return res.json({ msg: "user updated successfully" })
    }
})

module.exports = router
