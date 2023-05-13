const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p9pdn5v.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) =>{
  const authorization = req.headers.authorization
  if(!authorization){
    return res.status(401).send({error: true, message: "Unauthorized Access"})
  }
  const token = authorization.split(" ")[1]
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) =>{
    if(err){
      return res.status(401).send({error: true, message: "Unauthorized Access"})
    }
    req.decoded = decoded;
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollecton = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("bookings")

    //jwt
    app.post('/jwt', (req, res) =>{
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {expiresIn: '1h'})
      console.log(token)
      res.send({token})
    })

    // services routes
    app.get('/services', async(req, res) =>{
        const cursor = serviceCollecton.find()
        const result = await cursor.toArray()
        res.send(result)
    })

    app.get('/services/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const options = {
          
            // Include only the `title` and `imdb` fields in each returned document
            projection: {  title: 1, price: 1, service_id: 1, img: 1 },
          };
        const result = await serviceCollecton.findOne(query, options)
        res.send(result)
    })
    //booking
    app.post('/bookings', async(req, res) =>{
      const newBooking = req.body;
      const result = await bookingCollection.insertOne(newBooking)
      res.send(result)
    })

    app.get('/bookings', verifyJWT, async(req, res) =>{
      const decoded = req.decoded;
      console.log("Come back after verify", decoded)
      let query = {}

      if(req.decoded.email !== req.query.email){
        return res.status(403).send({error: 1, message: "Forbidden Access"})
      }
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })

    app.patch('/bookings/:id', async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedBooking = req.body
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        }
      }
      const result = await bookingCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/bookings/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) =>{
    res.send("Car doctor server is running")
})

app.listen(port, () =>{
    console.log(`Server is running on port: ${port}`)
})