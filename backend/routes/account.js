const express = require("express")
const { authMiddleware } = require("../middleware")
const { Account, User } = require("../db")
const z = require("zod")
const mongoose = require("mongoose")

const router = express.Router()

const transferBody = z.object({
    to: z.string(),
    amount: z.number(),
})

router.get("/balance", authMiddleware, async (req, res) => {
    const userId = req.userId
    if (userId) {
        const balance = await Account.findOne({
            userId,
        })
        console.log(balance)
        return res.status(200).json({
            balance: balance.balance,
        })
    }
})
router.post("/transfer", authMiddleware, async (req, res) => {
    // bad solution
    // const { success } = transferBody.safeParse(req.body)
    // if (!success) {
    //     return res.status(403).json({
    //         msg: "invalid inputs",
    //     })
    // }
    // const bal = await Account.findOne({
    //     userId: req.userId,
    // })
    // if (bal.balance < req.body.amount) {
    //     return res.json({
    //         msg: "Insufficient balance",
    //     })
    // }
    // const toAccount = await Account.findOne({
    //     userId: req.body.to,
    // })
    // if (!toAccount) {
    //     return res.status(400).json({
    //         message: "Invalid account",
    //     })
    // }
    // await Account.findOneAndUpdate(
    //     {
    //         userId: req.userId,
    //     },
    //     {
    //         $inc: {
    //             balance: -req.body.amount,
    //         },
    //     }
    // )
    // await Account.findOneAndUpdate(
    //     {
    //         userId: req.body.to,
    //     },
    //     {
    //         $inc: {
    //             balance: req.body.amount,
    //         },
    //     }
    // )
    // return res.json({
    //     msg: "transfred successfully",
    // })
    const session = await mongoose.startSession()
    session.startTransaction()
    const { amount, to } = req.body

    const account = await Account.findOne({ userId: req.userId }).session(
        session
    )

    if (!account || account.balance < amount) {
        await session.abortTransaction()
        return res.status(400).json({
            message: "Insufficient balance",
        })
    }
    const toAccount = await Account.findOne({ userId: to }).session(session)

    if (!toAccount) {
        await session.abortTransaction()
        return res.status(400).json({
            message: "Invalid account",
        })
    }
    await Account.updateOne(
        { userId: req.userId },
        { $inc: { balance: -amount } }
    ).session(session)
    await Account.updateOne(
        { userId: to },
        { $inc: { balance: amount } }
    ).session(session)

    await session.commitTransaction()
    return res.json({
        message: "Transfer successful",
    })
})

module.exports = router
