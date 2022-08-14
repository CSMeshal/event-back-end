const User = require('../models/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { UserInputError } = require('apollo-server-express')

const authResolver = {
    Mutation: {
        login: async (_, { email, password }) => {
            const user = await User.findOne({ email: email })
            if (!user) {
                throw new UserInputError('This account does not exist for us!')
            }
            const isEqual = await bcrypt.compare(password, user.password)
            if (!isEqual) {
                throw new UserInputError('Wrong email or password')
            }
            const userForToken = {
                email: user.email,
                id: user.id,
            }
            return {
                userId: user.id,
                token: jwt.sign(userForToken, process.env.JWT_SECRET),
                username: user.username
            }
        },

        createUser: async (_, args) => {
            try {
                const existingUser = await User.findOne({ email: args.userInput.email })
                if (existingUser) {
                    throw new UserInputError('This account already exists', {
                        invalidArgs: args.userInput.email,
                    })
                }
                const hashedPassword = await bcrypt.hash(args.userInput.password, 12)
                const user = new User({
                    username: args.userInput.username,
                    email: args.userInput.email,
                    password: hashedPassword
                })
                await user.save()
                const userForToken = {
                    email: user.email,
                    id: user.id,
                }
                return {
                    userId: user.id,
                    token: jwt.sign(userForToken, process.env.JWT_SECRET),
                    username: user.username
                }
            } catch (err) {
                throw err
            }
        }
    }
}

module.exports = { authResolver }
