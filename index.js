

const express = require('express');

const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())


const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  console.log('Token inside the verifyToken', token)

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' })
    }
    req.user = decoded;
    next()
  })


}





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jum05.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // books relateds apis

    const bookCollection = client.db('LibroHub').collection('books')
    const borrowCollection = client.db('LibroHub').collection('borrowedBooks')

    // Auth relateds Apis

    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '20h'
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true })
    })

    app.post('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: false
      })
        .send({ success: true })
    })

    app.get('/books', async (req, res) => {
      const category = req.query.category
      let query = {}
      if (category) {
        query = { category: category }
      }
      const cursor = bookCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)

    })

    app.get('/books/latest', async (req, res) => {
      const cursor = bookCollection.find().sort({ quantity: -1 }).limit(7)
      const result = await cursor.toArray()
      res.send(result)

    })

    app.post('/books', async (req, res) => {
      const newBooks = req.body
      const result = await bookCollection.insertOne(newBooks)
      res.send(result)
    })

    app.get('/books/:id', async (req, res) => {
      const id = req.params
      const result = await bookCollection.findOne({ _id: new ObjectId(id) })
      res.send(result)

    })

    app.patch('/books/:id', async (req, res) => {
      const id = req.params.id;

      const result = await bookCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { quantity: 1 } }
      )
      res.send(result);
    })

    // API Endpoint for updating books details
    app.put('/books/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedBook = req.body;

      const book = {
        $set: {
          name: updatedBook.name,
          image: updatedBook.image,
          category: updatedBook.category,
          quantity: updatedBook.quantity,
          rating: updatedBook.rating,
          author: updatedBook.author,
          description: updatedBook.description,
          bookContent: updatedBook.bookContent,
          bookAdderName: updatedBook.bookAdderName,
          bookAdderEmail: updatedBook.bookAdderEmail
        }
      }
      const result = await bookCollection.updateOne(filter, book)
      res.send(result)
    })


    app.post('/borrow/:id', async (req, res) => {
      const id = req.params.id
      const borrowBookDetails = req.body

      await bookCollection.updateMany(
        { quantity: { $type: "string" } },
        [
          { $set: { quantity: { $toInt: "$quantity" } } }
        ]
      );

      await bookCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { quantity: -1 } }
      );
      const result = await borrowCollection.insertOne(borrowBookDetails);
      res.send(result)
    })

    app.get('/bookBorrowed', verifyToken, async (req, res) => {

      const email = req.query.email;
      let query = {};
      if (email) {
        query = { userEmail: email }
      }
      console.log(req.cookies.token)



      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden Access" })
      }

      const cursor = borrowCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })


    app.delete('/bookBorrowed/:id', async (req, res) => {
      const id = req.params.id;

      await bookCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { quantity: +1 } }
      );

      const query = { _id: new ObjectId(id) }
      const result = await borrowCollection.deleteOne(query)
      res.send(result);
    })

    



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Assignment 11 running')
})

app.listen(port, () => {
  console.log(`Assignment 11 running on: ${port}`)
})