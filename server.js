const PORT = process.env.PORT || 8000;

const express = require("express");
const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
require("dotenv").config()
const uri = process.env.URI;

const app = express();
app.use(cors());
app.use(express.json());
  
app.get("/user", async (req, res) => {
  const client = new MongoClient(uri);
  const userId = req.query.userId;

  try {
  await client.connect();
  const database = client.db("app-data");
  const users = database.collection("users");

  const query = { user_id: userId };
  const user = await users.findOne(query);
  res.send(user);
  } finally {
    await client.close();
  }
})

app.get("/gendered-users", async (req, res) => {
  const client = new MongoClient(uri);
  const gender = req.query.gender;
  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");
    const query = { gender_identity: gender};
    const filteredUsers = await users.find(query).toArray();

    res.send(filteredUsers);
  } finally {
    await client.close();
  }
})

app.get("/matches", async (req, res) => {
  const client = new MongoClient(uri);
  const userIds = JSON.parse(req.query.userIds);

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const pipeline = [
      {
        "$match" : {
          "user_id" : {
            "$in" : userIds
          }
        }
      }
    ]

    const foundUsers = await users.aggregate(pipeline).toArray();
    // console.log(foundUsers);
    res.send(foundUsers);
  } finally {
    await client.close();
  }
})

app.post("/signup", async (req, res) => {
  const client = new MongoClient(uri);
  
  const { email, password } = req.body;
  const generatedUserId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");
    
    const sanitizedEmail = email.toLowerCase();
    
    const existingUser = await users.findOne({ email: sanitizedEmail });
    
    if(existingUser) {
      return res.status(409).send("User already exists. Please login")
    } else {
      const data = {
        user_id: generatedUserId,
        email: sanitizedEmail,
        hashedPassword: hashedPassword
      }
      
      const insertedUser = await users.insertOne(data);
      const token = jwt.sign(insertedUser, sanitizedEmail, { expiresIn: 60 * 24, });
      
      res.status(201).json({ token, userId: generatedUserId });
    }
  } catch (err) {
    console.log(err);
  }
})

app.post("/login", async (req, res) => {
  const client = new MongoClient(uri);
  const { email, password } = req.body;
  
  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");
    const sanitizedEmail = email.toLowerCase();
    
    const user = await users.findOne({ email: sanitizedEmail})

    if (user && ( await bcrypt.compare(password, user.hashedPassword))) {
      const token = jwt.sign(user, email, {
        expiresIn: 60 * 24
      })
      
      res.status(201).json({ token })
      
    } else {
      res.status(400).send("Invalid Credentials");
    }
  } catch (error) {
    console.log(error);
  }
  
})

app.put("/user", async (req, res) => {
  const client = new MongoClient(uri);
  const formData = req.body.formData;
  
  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");
    
    const query = { user_id: formData.user_id };
    const updateDocument = {
      $set: {
        first_name: formData.first_name,
        DoB_day: formData.DoB_day,
        DoB_month: formData.DoB_month,
        DoB_year: formData.DoB_year,
        show_gender: formData.show_gender,
        gender_identity: formData.gender_identity,
        gender_interest: formData.gender_interest,
        url: formData.url,
        about: formData.about,
        matches: formData.matches
      },
    }

    const insertedUser = await users.updateOne(query, updateDocument);
    res.send(insertedUser);
  } finally {
    await client.close();
  }
})

app.put("/addmatch", async (req, res) => {
  const client = new MongoClient(uri);
  const { userId, matchedUserId } = req.body;

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const query = { user_id: userId };
    const updateDocument = {
      $push: { matches: { user_id: matchedUserId }}
    }

    const user = await users.updateOne(query, updateDocument);
    res.send(user);
  } finally {
    await client.close();
  }
})


app.get("/messages", async (req, res) => {
  const client = new MongoClient(uri);
  const { userId, correspondingUserId } = req.query;

  try {
    await client.connect()
    const database = client.db("app-data");
    const messages = database.collection("messages");
    
    const query = {
      from_userId: userId, to_userId: correspondingUserId
    }

    const foundMessages = await messages.find(query).toArray();
    res.send(foundMessages);

  } finally {
    await client.close();
  }
})

app.post("/message" , async (req, res) => {
  const client = new MongoClient(uri);
  const message = req.body.message;

  try {
    await client.connect()
    const database = client.db("app-data");
    const messages = database.collection("messages");
    const insertedMessage = await messages.insertOne(message);
    res.send(insertedMessage);
  } finally {
    await client.close();
  }
})

app.listen(PORT, () => {console.log("Server running on PORT: " + PORT)});