const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const graphqlExpress = require('graphql-server-express').graphqlExpress;
const graphiqlExpress = require('graphql-server-express').graphiqlExpress;
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;

const prepare = (o) => {
  o._id = o._id.toString()
  return o
}

// const url = 'mongodb://localhost:27017';
// const url = 'mongodb+srv://graphap-329:kphMP1IVi6ILsqRI@graphql-n2cts.mongodb.net/test?retryWrites=true'
const url = 'mongodb://graphap-329:kphMP1IVi6ILsqRI@graphql-shard-00-00-n2cts.mongodb.net:27017,graphql-shard-00-01-n2cts.mongodb.net:27017,graphql-shard-00-02-n2cts.mongodb.net:27017/test?ssl=true&replicaSet=graphql-shard-0&authSource=admin&retryWrites=true'
const app = express();
app.use(cors());

MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
  if (err) {
    console.log('Database error');
    return
  }

  const db = client.db('blog');
  const Posts = db.collection('posts');
  const Comments = db.collection('comments');

  const typeDefs = [`
      type Post {
        _id: String
        title: String
        content: String
        comments: [Comment]
      }
      type Comment {
        _id: String
        postId: String
        content: String
        post: Post
      }
      type Query {
        post(_id: String): Post
        posts: [Post]
        comment(_id: String): Comment
      }
      type Mutation {
        createPost(title: String, content: String): Post
        createComment(postId: String, content: String): Comment
      }
      schema {
        query: Query
        mutation: Mutation
      }
  `];

  const resolvers = {
    Query: {
      post: async (root, { _id }) => {
        return prepare(await Posts.findOne(ObjectId(_id)))
      },
      posts: async () => {
        return (await Posts.find({}).toArray()).map(prepare)
      },
      comment: async (root, { _id }) => {
        return prepare(await Comments.findOne(ObjectId(_id)))
      },
    },
    Post: {
      comments: async ({ _id }) => {
        return (await Comments.find({ postId: _id }).toArray()).map(prepare)
      }
    },
    Comment: {
      post: async ({ postId }) => {
        return prepare(await Posts.findOne(ObjectId(postId)))
      }
    },
    Mutation: {
      createPost: async (root, args, context, info) => {
        const res = await Posts.insertOne(args);
        return prepare(await Posts.findOne({ _id: res.insertedId }))
      },
      createComment: async (root, args) => {
        const res = await Comments.insertOne(args)
        return prepare(await Comments.findOne({ _id: res.insertedId }))
      },
    },
  }

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  })

  app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));

  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql'
  }));

});
const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Running a GraphQL API server at localhost:${port}/graphql`);
});