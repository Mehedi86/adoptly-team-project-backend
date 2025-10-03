const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.json());

const uri = process.env.MONGO_URI;
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
    // await client.connect();




    // collections 
    const offerCollection = client.db('adoptlyDB').collection('offers');
    const petCollection = client.db('adoptlyDB').collection('pets');
    const feedbackCollection = client.db('adoptlyDB').collection('feedback')
    const userCollection = client.db('adoptlyDB').collection('users')



    // apis 

    //get all offers, for homepage, section 5
    app.get('/offers', async (req, res) => {
      const cursor = offerCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })



    // pet post create, read,update, delete
    //create pet 
    app.post('/pets', async (req, res) => {
      try {

        if (!req.body || !req.body.name) {
          return res.status(400).json({ message: "Missing required field: name" });
        }

        const petData = {
          name: req.body.name,
          image: req.body.image || "",
          description: req.body.description || "",
          age: req.body.age || "",
          gender: req.body.gender || "",
          breed: req.body.breed || "",
          species: req.body.species ? req.body.species.toLowerCase() : "",
          weight: req.body.weight || "",
          vaccinated: req.body.vaccinated || false,
          address: req.body.address || "",
          adoptedCount: req.body.adoptedCount || 0,
          createdAt: new Date()
        };
        const result = await petCollection.insertOne(petData);
        res.status(201).json({ _id: result.insertedId, ...petData });
      } catch (err) {
        console.log('Insert Error:', err);
        res.status(500).json({ message: "Error creating pet", error: err });
      }
    });



    // get all pet with filter & pagination
    app.get('/pets', async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const species = req.query.species ? req.query.species.toLowerCase() : null;
        const skip = (page - 1) * limit;

        const filter = {};
        if (species) {
          filter.species = species;

        }

        const cursor = petCollection.find(filter)
          .sort({ adoptedCount: -1 })
          .skip(skip)
          .limit(limit);
        const result = await cursor.toArray();
        const total = await petCollection.countDocuments(filter);
        res.json({ total, page, limit, data: result });
      } catch (err) {
        console.log('Read Error:', err);
        res.status(500).json({ message: "Error fetching pets", error: err.message });
      }

    });





    // GET single pet

    app.get('/pets/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const pet = await petCollection.findOne({ _id: new ObjectId(id) });
        if (!pet)
          return res.status(404).json({ message: 'Pet not found' });
        res.json(pet);
      } catch (err) {
        console.log("Read single error:", err);
        res.status(500).json({ message: "Error fetching pet", error: err.message });
      }

    });



    //update pet 

    app.put('/pets/:id', async (req, res) => {
      try {
        const id = req.params.id;


        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid ID format" });
        }


        const updateData = req.body;
        const result = await petCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updateData },
          { returnDocument: "after" }
        );
        // console.log(result);
        if (!result) {
          return res.status(404).json({ message: "Pet not found" });
        }
        res.json(result);
      } catch (err) {
        console.log('Update error:', err);
        res.status(500).json({ message: "Error updating pet", error: err.message });
      }
    });




    //Delete pet 

    app.delete("/pets/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await petCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0)
          return res.status(404).json({ message: "Pet not found" });

        res.json({ message: "Pet deleted successfully" });
      } catch (err) {
        console.log("Delete Error:", err);
        res.status(500).json({ message: "Error deleting pet", error: err.message });
      }
    });


    // user related apis

    // create user 
    app.post('/user', async (req, res) => {
      try {
        const data = req.body;
        const userData = {
          name: data.name,
          email: data.email,
          // photo: data.photo,
          role: data.role,  // user | admin

        }

        const result = await userCollection.insertOne(userData);
        res.status(201).json({ _id: result.insertedId, ...userData })
      }
      catch (error) {
        console.log("Something went Wrong while inserting", error)
        res.status(500).json({ message: "Error while creating user" })
      }
    })


    // get all user
    app.get('/users', async (req, res) => {
      try {
        const cursor = userCollection.find();
        const result = await cursor.toArray();
        res.json(result);
      }
      catch (error) {
        console.log("Error", error);
        res.status(500).json({ message: "Error to get users", error: error.message })
      }
    })


    // get a specific user information
    app.get('/user', async (req, res) => {
      //  http://localhost:5000/user?email=example@gmail.com
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).json({ message: "Email is required" })
        }

        const user = await userCollection.findOne({ email: email })

        if (!user) {
          return res.status(404).json({ message: "User not found!" })
        }
        res.json(user);

      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong", error: error.message })
      }
    })


    // experience and feedback related api

    // post feedback
    app.post('/feedback', async (req, res) => {
      try {
        const { userId, petId, feedbackText } = req.body


        if (!userId || !petId || !feedbackText) {
          return res.status(400).json({ message: "userId, petId, and feedbackText are required" });
        }

        const userInfo = await userCollection.findOne({ _id: new ObjectId(userId) })
        if (!userInfo) {
          return res.status(404).json({ message: "User not found!" });
        }

        const petInfo = await petCollection.findOne({ _id: new ObjectId(petId) })
        if (!petInfo) {
          return res.status(404).json({ message: "Pet not found!" });
        }

        const feedback = {
          userName: userInfo.name,
          userEmail: userInfo.email,
          petInfo: petInfo,
          feedbackText: feedbackText,
          createdAt: new Date()
        }

        const result = await feedbackCollection.insertOne(feedback);
        res.status(201).json({ _id: result.insertedId, ...feedback })

      } catch (error) {
        console.log("Something went wrong while inserting", error);
        res.status(500).json({ message: "Error while creating feedback" })
      }
    })


    // get all feedback
    app.get('/feedbacks', async (req, res) => {
      try {
        const cursor = feedbackCollection.find();
        const result = await cursor.toArray();
        res.json(result);
      }
      catch (error) {
        console.log("Error", error);
        res.status(500).json({ message: "Error to get feedbacks", error: error.message })
      }
    })

    // get feedback for specific pet 
    app.get('/feedback/:id', async (req, res) => {
      try {
        const petId = req.params.id;
        const feedback = await feedbackCollection.findOne({ "petInfo._id": new ObjectId(petId) });
        if (!feedback) {
          return res.status(404).json({ message: "Feedback not found" })
        }
        res.json(feedback)
      } catch (error) {
        console.log("Cant find your desired data, something went wrong");
        res.status(500).json({ message: "dont find your data", error: error.message })
      }
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})
