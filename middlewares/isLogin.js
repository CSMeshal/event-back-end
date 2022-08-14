const { AuthenticationError } = require('apollo-server-express')

const isLoggedin = (parent, args, { user }, info) => {
    if (!user) {
        throw new AuthenticationError("You must be logged in!")
    }
}

module.exports = { isLoggedin }