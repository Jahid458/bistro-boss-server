const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORt || 5000;
//bistroDb



//middleware

app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.7i4ix.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

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

    const menuCollections = client.db('bistroDb').collection("menu");
    const reviewCollections = client.db('bistroDb').collection("reviews");

    app.get('/menu', async(req,res)=>{
        const result = await menuCollections.find().toArray();
        res.send(result)

    })
    app.get('/reviews', async(req,res)=>{
        const result = await reviewCollections.find().toArray();
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




app.get('/', (req,res)=>{
    res.send('Bistreo is hearing')
})


app.listen(port, ()=>{
    console.log(`Bistro Boss is sitting on ${port}`);
})