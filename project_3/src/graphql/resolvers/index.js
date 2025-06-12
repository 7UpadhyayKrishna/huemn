const userResolvers = require('./userResolvers');
const bookResolvers = require('./bookResolvers');
const borrowResolvers = require('./borrowResolvers');
const statsResolvers = require('./statsResolvers');
const analyticsResolvers = require('./analyticsResolvers');

const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...bookResolvers.Query,
    ...borrowResolvers.Query,
    ...statsResolvers.Query,
    ...analyticsResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...bookResolvers.Mutation,
    ...borrowResolvers.Mutation,
  },
};

module.exports = resolvers;