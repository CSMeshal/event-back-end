const { ApolloServer } = require('apollo-server-express')
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
const express = require('express')
const { createServer } = require('http')
require('dotenv').config()
const { typeDefs } = require('./schema/index')
const { resolvers } = require('./resolvers/index')
const mongoose = require('mongoose')
const User = require('./models/user')
const jwt = require('jsonwebtoken')

const { makeExecutableSchema } = require('@graphql-tools/schema')
const { WebSocketServer } = require ('ws')
const { useServer } = require('graphql-ws/lib/use/ws')

async function startApolloServer(typeDefs, resolvers) {
    const app = express()
    const httpServer = createServer(app)
    // app.use((req, res, next) => {
    //     res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL)
    //     next()
    // })
    const schema = makeExecutableSchema({
        typeDefs,
        resolvers,
    })
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
    })
    const serverCleanup = useServer({ schema }, wsServer)
    const server = new ApolloServer({
        schema,
        context: async ({ req }) => {
            const auth = req ? req.headers.authorization : null
            if (auth) {
                const decodedToken = jwt.verify(
                    auth.slice(4), process.env.JWT_SECRET
                )
                const user = await User.findById(decodedToken.id)
                return { user }
            }
        },
        plugins: [
            ApolloServerPluginDrainHttpServer({ httpServer }),
            {
                async serverWillStart() {
                    return {
                        async drainServer() {
                            serverCleanup.dispose()
                        }
                    }
                }
            }
        ],
    })

    await server.start()
    server.applyMiddleware({ app })

    await new Promise(resolve => httpServer.listen({ port: process.env.PORT }, resolve))
    console.log(`Server ready at http://localhost:${process.env.PORT}${server.graphqlPath}`)
    mongoose.connect(process.env.DB_URL,
        // , { useNewUrlParser: true, useUnifiedTopology: true },
        err => {
            if (err) throw err
            console.log('DB Connected successfully')
        }
    )
    return { server, app }
}
startApolloServer(typeDefs, resolvers)
