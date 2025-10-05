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
    const feedbackCollection = client.db('adoptlyDB').collection('feedback');
    const userCollection = client.db('adoptlyDB').collection('users');
    const requestCollection = client.db('adoptlyDB').collection('adoptRequest');
    const storyCollection = client.db('adoptlyDB').collection('success-story')
    const storyRequestCollection = client.db('adoptlyDB').collection('story-request');



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

        if (!req.body || !req.body.name || !req.body.address || req.body.address.district || req.body.address.division) {
          return res.status(400).json({ message: "Missing required field or address invalid (must include [district, division])" });
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
          address: {
            district: req.body.address.district,
            division: req.body.address.division,
          }, //district, division
          adoptedCount: req.body.adoptedCount || 0,
          quantity: req.body.quantity || 1,
          phoneNumber: req.body.phoneNumber || "",
          userEmail: req.body.userEmail || "",
          status: req.status.status || "pending",
          isAdopted: req.body.isAdopted || false,
          createdAt: new Date()
        };



        const result = await petCollection.insertOne(petData);
        res.status(201).json({ message: "Pet data create successfully", _id: result.insertedId, ...petData });
      } catch (err) {
        console.log('Insert Error:', err);
        res.status(500).json({ message: "Error creating pet", error: err.message });
      }
    });



    // get all pets with filter & pagination
    app.get('/pets', async (req, res) => {
      try {
        const { page = 1, limit = 8, species, district, division } = req.query;
        const skip = (page - 1) * limit;

        const filter = {};
        if (species) {
          filter.species = species.toLowerCase();
        };

        if (district)
          filter['address.district'] = district;
        if (division)
          filter['address.division'] = division;

        const cursor = petCollection.find(filter)
          .sort({ adoptedCount: -1 })
          .skip(parseInt(skip))
          .limit(parseInt(limit));

        const result = await cursor.toArray();
        const total = await petCollection.countDocuments(filter);

        res.status(200).json({ message: "Data retrieved successfully", total, page: parseInt(page), limit: parseInt(limit), data: result });
      } catch (err) {
        console.log('Read Error:', err);
        res.status(500).json({ message: "Error fetching pets", error: err.message });
      }

    });





    // GET single pet

    app.get('/pets/:id', async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id))
          return res.status(400).json({ message: "Invalid ID" });

        const pet = await petCollection.findOne({ _id: new ObjectId(id) });

        if (!pet)
          return res.status(404).json({ message: 'Pet not found' });

        res.status(200).json({
          message: "Data retrieved successfully",
          data: pet
        });

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

        if (!updateData.address.district || !updateData.address.division) {
          return res.status(400).json({ message: "Address must be {district, division}" });
        }

        const result = await petCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updateData },
          { returnDocument: "after" }
        );
        // console.log(result);
        if (!result) {
          return res.status(404).json({ message: "Pet not found" });
        }

        res.status(200).json({
          message: "Update successfully",
          updated: result
        });
      } catch (err) {
        console.log('Update error:', err);
        res.status(500).json({ message: "Error updating pet", error: err.message });
      }
    });




    //Delete pet

    app.delete("/pets/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id))
          return res.status(400).json({ message: "Invalid ID" });

        const result = await petCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0)
          return res.status(404).json({ message: "Pet not found" });

        res.status(200).json({ message: "Pet deleted successfully" });
      } catch (err) {
        console.log("Delete Error:", err);
        res.status(500).json({ message: "Error deleting pet", error: err.message });
      }
    });



    //Adopt Request

    //create request

    app.post('/request', async (req, res) => {
      try {
        const { userId, userEmail, petId, phoneNumber, address, quantity } = req.body;

        if (!petId || !userId || !quantity)
          return res.status(400).json({ message: "Missing required field" });

        if (!address || !address.district || !address.division) {
          return res.status(400).json({ message: "Address must include {district, division}" });
        }


        const requestData = {
          userId: new ObjectId(userId),
          userEmail,
          petId: new ObjectId(petId),
          phoneNumber: phoneNumber || "",
          address: {
            district: address.district,
            division: address.division,
          },
          quantity: quantity || 1,
          status: "pending",
          requestDate: new Date()
        };

        const result = await requestCollection.insertOne(requestData);
        res.status(201).json({ message: "Create request successfully", _id: result.insertedId, ...requestData });

      } catch (err) {
        console.log("Adoption Request Error:", err);
        res.status(500).json({ message: "Error creating adoption request", error: err.message });
      }
    });



    //GET all request
    app.get("/request", async (req, res) => {
      try {
        const request = await requestCollection.find().toArray();
        res.status(200).json({ message: "Data retrieved successfully", data: request });

      } catch (err) {
        console.log("Request Error:", err);
        res.status(500).json({ message: "Error fetching requests", error: err.message });
      }

    });



    //update request

    app.put('/request/:id', async (req, res) => {
      try {
        const updateData = req.body;

        if (!updateData || Object.keys(updateData).length === 0)
          return res.status(400).json({ message: "No fields to update" });

        const request = await requestCollection.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $set: updateData },
          { returnDocument: "after" }

        );

        if (!request)
          return res.status(404).json({ message: "Request not found" });

        if (updateData.status === "accepted") {
          const petId = request.petId;
          const pet = await petCollection.findOne({ _id: petId });

          if (pet) {
            if (pet.quantity > 0) {
              const newQuantity = Math.max(pet.quantity - request.quantity, 0);
              await petCollection.updateOne(
                { _id: petId },
                {
                  $inc: { adoptedCount: request.quantity },
                  $set: {
                    quantity: newQuantity,
                    isAdopted: newQuantity === 0
                  }
                }
              );
            } else {
              console.log("already adopted. No update needed");
            }
          }

        }

        res.status(200).json({
          message: "Update successfully",
          updatedRequest: request
        });
      } catch (err) {
        console.log("Update Request Error:", err);
        res.status(500).json({ message: "Error updating request", error: err.message });
      }



    });


    //delete request

    app.delete('/request/:id', async (req, res) => {
      try {
        const result = await requestCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 0)
          return res.status(404).json({ message: "Request not found" });

        res.status(200).json({ message: "Request deleted successfully!" });
      } catch (err) {
        console.log("Delete Request Error:", err);
        res.status(500).json({ message: "Error deleting request", error: err.message });
      }
    });






    // user related apis

    // create user 
    app.post('/user', async (req, res) => {
      try {
        const data = req.body;
        const users = await userCollection.find().toArray();
        const isExist = users.find(user => user.email === data.email);
        if (isExist) {
          return res.status(400).json({ message: "User already Exists" })
        }
        const userData = {
          name: data.name,
          email: data.email,
          photo: data.photo,
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



    // success apis

    // get all success story
    app.get('/success-story', async (req, res) => {
      try {
        const cursor = storyCollection.find();
        const result = await cursor.toArray();
        res.status(200).json({ message: "Data retrive successfully", data: result })
      } catch (error) {
        console.log("Error", error);
        res.status(500).json({ message: "Error to get data", error: error.message })
      }
    })
    

    // post success story
    app.post('/success-story', async (req, res) => {
      try {
        const data = req.body;
        const storyData = {
          ownerId: data.ownerId,
          ownerName: data.ownerName,
          ownerEmail: data.ownerEmail,
          petName: data.petName,
          petBreed: data.petBreed,
          petAge: data.petAge,
          image: data.image,
          story: data.story
        }
        const result = await storyCollection.insertOne(storyData);
        res.status(201).json({ _id: result.insertedId, ...storyData })
      } catch (error) {
        console.log("Error", error);
        res.status(500).json({ message: "Error to get data", error: error.message })
      }
    })


    // request for post success story to admin

    app.post('/request-story/:userEmail', async (req, res) => {
      try {
        const userEmail = req.params.userEmail;
        const data = req.body;
        if (!userEmail) {
          return res.status(400).json({ message: "User email required" });
        }
        const user = await userCollection.findOne({ email: userEmail })
        const storyInfo = {
          userName: user.name,
          userId: user._id,
          userEmail: user.email,
          petName: data.petName,
          petBreed: data.petBreed,
          petAge: data.petAge,
          image: data.image,
          story: data.story
        }

        const result = await storyRequestCollection.insertOne(storyInfo);
        res.status(201).json({
          insertedId: result.insertedId,
          message: "Successfully inserted",
          data: storyInfo
        })
      } catch (error) {
        console.error("Error inserting story request:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
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