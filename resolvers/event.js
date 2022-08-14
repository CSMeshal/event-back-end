const Event = require('../models/event')
const { transformEvent } = require('./transform')
const { UserInputError } = require('apollo-server-express')
const { combineResolvers } = require("graphql-resolvers")
const { isLoggedin } = require("../middlewares/isLogin")
const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()

const eventResolver = {
  Query: {
    events: async () => {
      try {
        const events = await Event.find({}).sort({ created_at: 'desc' }).populate('creator')
        return events.map(event => transformEvent(event))
      } catch (error) {
        throw error
      }
    },
    getUserEvents: async (_, { userId }) => {
      try {
        const events = await Event.find({ creator: userId })
        return events.map(event => transformEvent(event))
      } catch (error) {
        throw error
      }
    }
  },

  Mutation: {
    createEvent: combineResolvers(isLoggedin, async (_, args, context) => {
      const ExistingEvent = await Event.findOne({ title: args.eventInput.title })
      if (ExistingEvent) {
        throw new UserInputError('We have an event with the same topic, please choose another topic')
      }
      const event = new Event({
        title: args.eventInput.title,
        description: args.eventInput.description,
        price: args.eventInput.price,
        date: new Date(args.eventInput.date),
        creator: context.user._id,
      })

      let createdEvent
      try {
        const result = await event.save()
        createdEvent = transformEvent(result)
        pubsub.publish('EVENT_ADDED', {
          eventAdded: createdEvent
        })
        return createdEvent
      } catch (err) {
        throw err
      }
    }),
    deleteEvent: async (_, args) => {
      try {
        await Event.deleteOne({ _id: args.eventId })
        return Event.find({})
      } catch (err) {
        throw err
      }
    }
  },

  Subscription: {
    eventAdded: {
      subscribe: () => pubsub.asyncIterator(['EVENT_ADDED']),
    },
  },
}

module.exports = { eventResolver }