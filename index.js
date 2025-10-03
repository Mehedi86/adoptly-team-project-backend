const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000  ;

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
        const requestCollection = client.db('adoptlyDB').collection('adoptRequest');



        // apis 


        // get apis

        // all offers, for homepage, section 5
        app.get('/offers', async (req, res) => {
            const cursor = offerCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })




//create pet
app.post('/pets',async(req,res) => {
    try{

      if(!req.body || !req.body.name || !req.body.address || req.body.address.length !== 2 ){
        return res.status(400).json({message:"Missing required field or address invalid (must include [district, division])"});
      }

      const petData = {
        name:req.body.name,
        image:req.body.image || "",
        description:req.body.description || "",
        age:req.body.age || "",
        gender:req.body.gender || "",
        breed:req.body.breed || "",
        species:req.body.species ? req.body.species.toLowerCase() : "",
        weight:req.body.weight || "",
        vaccinated:req.body.vaccinated || false,
        address:req.body.address || { district: "", division: "" }, //district, division
        adoptedCount:req.body.adoptedCount || 0,
        quantity:req.body.quantity || 1,
        phoneNumber: req.body.phoneNumber || "",
        userEmail: req.body.userEmail || "",
        status: req.status.status || "pending",
        isAdopted: req.body.isAdopted || false,
        createdAt:new Date()
      };



      const result = await petCollection.insertOne(petData);
      res.status(201).json({_id:result.insertedId, ...petData});
    } catch(err){
      console.log('Insert Error:', err);
      res.status(500).json({message:"Error creating pet", error:err.message});
    }
});



// get all pets with filter & pagination
app.get('/pets', async(req, res)=> {
    try{
      const { page = 1, limit = 8, species, district, division } = req.query;
      const skip = (page - 1) * limit;

      const filter = {};
      if(species){
        filter.species = species.toLowerCase();
       };

       if(district)
        filter['address.0'] = district;
      if(division)
        filter['address.1'] = division;

      const cursor = petCollection.find(filter)
      .sort({adoptedCount:-1})
      .skip(parseInt(skip))
      .limit(parseInt(limit));

      const result = await cursor.toArray();
      const total = await petCollection.countDocuments(filter);

      res.json({total, page:parseInt(page), limit:parseInt(limit), data:result});
    } catch(err){
      console.log('Read Error:', err);
      res.status(500).json({message:"Error fetching pets", error:err.message});
    }

});





// GET single pet

app.get('/pets/:id',async(req,res)=> {
    try{
      const id = req.params.id;

      if(!ObjectId.isValid(id))
        return res.status(400).json({message:"Invalid ID"});

      const pet = await petCollection.findOne({_id:new ObjectId(id)});

      if(!pet)
        return res.status(404).json({message:'Pet not found'});

      res.json(pet);

    } catch (err){
      console.log("Read single error:",err);
      res.status(500).json({message: "Error fetching pet", error:err.message});
    }

});



//update pet 

app.put('/pets/:id', async(req,res)=>{
  try{
    const id = req.params.id;
    

     if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }


    const updateData = req.body;

    if(updateData.address && updateData.address.length !== 2){
      return res.status(400).json({message:"Address must be [district, division"});
    }

    const result = await petCollection.findOneAndUpdate(
      {_id: new ObjectId(id)},
      {$set: updateData},
      {returnDocument:"after"}
    );
  // console.log(result);
    if(!result ){
      return res.status(404).json({message:"Pet not found"});
    }
    res.json(result);
  }catch(err){
    console.log('Update error:', err);
    res.status(500).json({message:"Error updating pet", error:err.message});
  }
});




//Delete pet

app.delete("/pets/:id", async(req,res)=> {
  try{
    const id = req.params.id;

    if(!ObjectId.isValid(id))
      return res.status(400).json({message:"Invalid ID"});

    const result = await petCollection.deleteOne({_id: new ObjectId(id)});

    if(result.deletedCount === 0)
      return res.status(404).json({message: "Pet not found"});

    res.json({message: "Pet deleted successfully"});
  } catch(err){
    console.log("Delete Error:", err);
    res.status(500).json({message: "Error deleting pet", error:err.message});
  }
});



//Adopt Request

//create request

app.post('/request', async(req,res) => {
  try{
    const {userId, userEmail, petId, phoneNumber, address, quantity} = req.body;

    if(!petId || !userId || !quantity)
      return res.status(400).json({message:"Missing required field"});

    const requestData = {
      userId:new ObjectId(userId),
      userEmail,
      petId:new ObjectId(petId),
      phoneNumber:phoneNumber || "",
      address:address || { district: "", division: "" },
      quantity:quantity || 1,
      status:"pending",
      requestDate:new Date()
    };

    const result = await requestCollection.insertOne(requestData);
    res.status(201).json({_id:result.insertedId, ...requestData});

  }catch(err){
    console.log("Adoption Request Error:", err);
    res.status(500).json({message:"Error creating adoption request", error:err.message});
  }
});



//GET all request
app.get("/request", async(req,res)=> {
  try{
    const request = await requestCollection.find().toArray();
    res.json(request);

  }catch(err){
     console.log("Request Error:" , err);
     res.status(500).json({message: "Error fetching requests", error:err.message});
  }

});



//update request

app.put('/request/:id', async(req, res) => {
  try{
    const {status} = req.body;

    if(!status)
      return res.status(400).json({message: "Missing status field"});

    const request = await requestCollection.findOneAndUpdate(
      {_id:new ObjectId(req.params.id)},
      {$set:{status}},
      {returnDocument: "after"}

    );

    if(!request)
      return res.status(404).json({message:"Request not found"});

    if(status === "accepted"){
    const petId = request.petId;
    const pet = await petCollection.findOne({_id:petId});
    if(pet){
      await petCollection.updateOne(
        {_id:petId},
        {
          $inc:{quantity: -request.quantity},
          $set:{isAdopted:true}
        }
      );
    }

  }

  res.json(request);
  } catch(err){
    console.log("Update Request Error:", err);
    res.status(500).json({message:"Error updating request", error:err.message});
  }

  
  
});


//delete request

app.delete('/request/:id', async (req,res) => {
  try{
    const result = await requestCollection.deleteOne({_id:new ObjectId(req.params.id)});
    if(result.deletedCount === 0)
      return res.status(404).json({message:"Request not found"});

    res.json({message:"Request deleted successfully!"});
  } catch(err){
    console.log("Delete Request Error:", err);
    res.status(500).json({message:"Error deleting request", error:err.message});
  }
});



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
