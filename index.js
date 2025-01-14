const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORt || 5000;
//bistroDb



//middleware
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

    const usersCollections = client.db('bistroDb').collection("users");
    const menuCollections = client.db('bistroDb').collection("menu");
    const reviewCollections = client.db('bistroDb').collection("reviews");
    const cartCollections = client.db('bistroDb').collection("carts");
    const paymentCollections = client.db('bistroDb').collection("payments");


    //jwt related APis 
    app.post('/jwt', async(req,res)=>{
      const user = req.body;
       const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: '1h'})
        res.send({token});
    })

    //middleware
    const verifyToken = (req,res,next)=>{
      console.log('Inside verify token',req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message : 'unauthorize Access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
        if(err){
          return res.status(401).send({message: 'unauthorize Access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    //use verify admin after verify token 
    const verifyAdmin = async(req,res,next) =>{
        const email = req.decoded.email; 
        const query = {email: email}
        const user = await usersCollections.findOne(query);
        const isAdmin = user?.role === 'admin';
        if(!isAdmin){
          return res.status(403).send({message: 'forbidden access'})
        }
        next()
    }

    app.get('/user/admin/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden aceess'})
      }

      const query = {email: email}
      const user = await usersCollections.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin';
      }
      res.send({admin})
})

     //users related api 
    app.get('/users',verifyToken,verifyAdmin, async(req,res)=> {
      const users = await usersCollections.find().toArray();
      res.send(users)
    })


   
    app.post('/users', async(req,res)=>{
      const user = req.body;
      //insert email if user doesnot exits 
      //you can do this many ways 
      // ( 1.email unique 2. upser 3. simple checking)
      const qyery = {email: user.email};
      const existingUser = await usersCollections.findOne(qyery);
      if(existingUser){
        return res.send({message: 'user already exits', insertedId: null});
      }
      const result = await usersCollections.insertOne(user);
      res.send(result);
    })

    app.patch('/users/admin/:id',verifyToken,verifyAdmin, async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const updatedDoc = {
            $set:{
              role: 'admin'
            }
        }
        const result = await usersCollections.updateOne(filter,updatedDoc);
        res.send(result)
    })

    app.delete('/users/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await usersCollections.deleteOne(query);
      res.send(result);
    })
     


    //menu related api 

    //all menu
    app.get('/menu', async(req,res)=>{
        const result = await menuCollections.find().toArray();
        res.send(result);
    })

    //specific menu for update 
    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollections.findOne(query);
      res.send(result);
    })

    app.post('/menu',verifyToken,verifyAdmin, async(req,res) =>{
        const item = req.body;
        const result = await menuCollections.insertOne(item);
        res.send(result)
    })

    app.patch('/menu/:id', async(req,res)=>{
      const item = req.body;
      const id =req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedDoc ={
        $set:{
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          Image: item.image

        }
      }
      const result = await menuCollections.updateOne(filter,updatedDoc);
      res.send(result)
    })

    app.delete('/menu/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const id =req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollections.deleteOne(query);
      res.send(result)
    })

    app.get('/reviews', async(req,res)=>{
        const result = await reviewCollections.find().toArray();

        res.send(result);
    })

    //cart collections 
 
    app.get('/carts', async(req,res)=>{
      const email = req.query.email;
      const query = {email: email};
      const result = await cartCollections.find(query).toArray();
      res.send(result);
    })


    app.post('/carts', async(req,res)=>{
        const cartItem = req.body;
        const result = await cartCollections.insertOne(cartItem);
        res.json(result);
    })

    app.delete('/carts/:id', async(req,res)=>{
        const id = req.params.id;
        const query = { _id: new ObjectId(id)};
        const result = await cartCollections.deleteOne(query);
        res.json(result);
    })

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    //payment related APIS
    app.post('/payments', async(req,res) =>{
      const payment = req.body;
      const paymentResult = await paymentCollections.insertOne(payment);

      //carefully delete  each item on the cart 
      console.log('payment Info', payment);
      const query = {_id: {
        $in: payment.cartIds.map(id => new  ObjectId(id))
      }};
      const deleteResult = await cartCollections.deleteMany(query)
      res.send({paymentResult, deleteResult})

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


//**
// Naming Convension 
// app.get('/users')
// app.get('/users/:id)
// app.post('/users') -- create a new user
// app.put('/users/:id') -- apecific users user
// app.patch('/users/:id') -- update a specific user
// app.delete('/users/:id') -- delete a specific user
//  */